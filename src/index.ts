import { AgatarkClient } from './services/agatark-client';
import { MqttBridge } from './services/mqtt-bridge';
import { logger } from './utils/logger';
import { AgatarkDevice } from './types/agatark-devices';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class AgatarkMqttBridge {
  private agatarkClient: AgatarkClient;
  private mqttBridge: MqttBridge;
  private devices: Map<number, AgatarkDevice> = new Map();
  private pollInterval: number;
  private pollingTimer: NodeJS.Timeout | null = null;
  private running = false;
  private deviceFilter: Set<number> | null = null;

  constructor() {
    // Validate required environment variables
    this.validateEnvironment();

    // Initialize Agatark client
    this.agatarkClient = new AgatarkClient(
      process.env.AGATARK_HOST!,
      process.env.AGATARK_EMAIL!,
      process.env.AGATARK_PASSWORD!,
      process.env.AGATARK_REMEMBER || 'on'
    );

    // Initialize MQTT bridge
    this.mqttBridge = new MqttBridge(
      {
        port: parseInt(process.env.MQTT_PORT || '1883'),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
      },
      process.env.DISCOVERY_PREFIX || 'homeassistant',
      process.env.HA_DEVICE_NAME || 'Agatark Smart Home'
    );

    this.pollInterval = parseInt(process.env.POLL_INTERVAL || '0');

    // Parse device filter if provided
    if (process.env.DEVICE_FILTER) {
      const filterIds = process.env.DEVICE_FILTER.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      if (filterIds.length > 0) {
        this.deviceFilter = new Set(filterIds);
        logger.info(`Device filter enabled for IDs: ${Array.from(this.deviceFilter).join(', ')}`);
      }
    }

    // Set up command handling
    this.mqttBridge.onCommand(this.handleMqttCommand.bind(this));
  }

  private validateEnvironment(): void {
    const required = ['AGATARK_HOST', 'AGATARK_EMAIL', 'AGATARK_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async start(): Promise<void> {
    logger.info('Starting Agatark MQTT Bridge...');
    
    try {
      // Start MQTT broker
      await this.mqttBridge.start();
      
      // Connect to Agatark
      await this.agatarkClient.login();
      
      // Load devices
      await this.loadDevices();
      
      // Set up device discovery for Home Assistant
      if (process.env.HA_DISCOVERY_ENABLED !== 'false') {
        await this.publishDeviceDiscovery();
      }
      
      this.running = true;
      
      // Start polling for events
      this.startPolling();
      
      logger.info('Agatark MQTT Bridge started successfully');
      
    } catch (error) {
      logger.error('Failed to start bridge:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping Agatark MQTT Bridge...');
    
    this.running = false;
    
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    await this.mqttBridge.stop();
    this.agatarkClient.disconnect();
    
    logger.info('Agatark MQTT Bridge stopped');
  }

  private async loadDevices(): Promise<void> {
    try {
      logger.info('Loading devices from Agatark...');
      
      const allDevices = await this.agatarkClient.getDevices();
      
      // Filter devices if filter is enabled
      const filteredDevices = this.deviceFilter 
        ? allDevices.filter(device => this.deviceFilter!.has(device.id))
        : allDevices;
      
      // Store devices and publish initial states
      for (const device of filteredDevices) {
        this.devices.set(device.id, device);
        await this.publishDeviceState(device);
        await this.mqttBridge.publishDeviceAvailability(device.id, device.status?.online ?? true);
      }
      
      logger.info(`Loaded ${filteredDevices.length} devices (${allDevices.length} total available)`);
      
    } catch (error) {
      logger.error('Failed to load devices:', error);
      throw error;
    }
  }

  private async publishDeviceDiscovery(): Promise<void> {
    logger.info('Publishing Home Assistant device discovery...');
    
    for (const device of this.devices.values()) {
      try {
        await this.mqttBridge.publishDeviceDiscovery(device);
      } catch (error) {
        logger.error(`Failed to publish discovery for device ${device.id}:`, error);
      }
    }
    
    logger.info('Device discovery published');
  }

  private async publishDeviceState(device: AgatarkDevice): Promise<void> {
    if (!device.status) return;

    // Publish all status attributes
    for (const [attribute, value] of Object.entries(device.status)) {
      if (value !== undefined && value !== null) {
        await this.mqttBridge.publishDeviceState(device.id, attribute, value);
      }
    }
  }

  private startPolling(): void {
    logger.info('Starting continuous event polling');
    // Start the polling loop without awaiting it (it should run in background)
    this.pollLoop().catch(error => {
      logger.error('Polling loop crashed:', error);
    });
  }

  private async pollLoop(): Promise<void> {
    logger.debug('Polling loop started');
    while (this.running) {
      logger.debug('Starting poll iteration');
      try {
        await this.pollEvents();
        logger.debug('Poll iteration completed successfully');
      } catch (error) {
        logger.error('Error during event polling:', error);
        
        // If authentication failed, try to reconnect
        if (!this.agatarkClient.isAuthenticated) {
          try {
            await this.agatarkClient.login();
          } catch (loginError) {
            logger.error('Failed to re-authentication:', loginError);
          }
        }
      }
      
      // Small delay to prevent overwhelming the server (configurable)
      if (this.pollInterval > 0) {
        logger.debug(`Waiting ${this.pollInterval}ms before next poll`);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      } else {
        logger.debug('No delay configured, starting next poll immediately');
      }
    }
    logger.debug('Polling loop stopped');
  }

  private async pollEvents(): Promise<void> {
    try {
      logger.debug('Polling for events...');
      const response = await this.agatarkClient.pollEvents();
      
      if (response.events && response.events.length > 0) {
        logger.info(`Received ${response.events.length} events`);
        
        for (const event of response.events) {
          // Process each event individually to prevent one bad event from stopping all processing
          await this.processEvent(event);
        }
      } else {
        logger.debug('No events received');
      }
      
    } catch (error) {
      logger.error('Failed to poll events:', error);
      throw error; // Re-throw to trigger reconnection logic if needed
    }
  }

  private async processEvent(event: { id: number; status: Record<string, any> }): Promise<void> {
    try {
      const device = this.devices.get(event.id);
      if (!device) {
        logger.debug(`Received event for unknown device ${event.id}`);
        return;
      }

      // Handle cases where event.status is null or undefined
      if (!event.status || typeof event.status !== 'object') {
        logger.info(`Processing event for device ${event.id} (${device.name}): (no status data)`);
        return;
      }

      logger.info(`Processing event for device ${event.id} (${device.name}):`, event.status);

      // Update device status
      device.status = { ...device.status, ...event.status };
      this.devices.set(event.id, device);

      // Publish updated status to MQTT
      for (const [attribute, value] of Object.entries(event.status)) {
        if (value !== undefined && value !== null) {
          try {
            await this.mqttBridge.publishDeviceState(event.id, attribute, value);
          } catch (publishError) {
            logger.error(`Failed to publish state for device ${event.id}.${attribute}:`, publishError);
          }
        }
      }

      // Update availability
      try {
        await this.mqttBridge.publishDeviceAvailability(event.id, device.status?.online ?? true);
      } catch (availabilityError) {
        logger.error(`Failed to publish availability for device ${event.id}:`, availabilityError);
      }
      
    } catch (error) {
      logger.error(`Error processing event for device ${event.id}:`, error);
    }
  }

  private async handleMqttCommand(deviceId: string, attribute: string, value: any): Promise<void> {
    try {
      const id = parseInt(deviceId);
      const device = this.devices.get(id);
      
      if (!device) {
        logger.warn(`Received command for unknown device ${deviceId}`);
        return;
      }

      logger.info(`Executing command for device ${id} (${device.name}): ${attribute} = ${value}`);

      // Map attribute to device status
      const status: Record<string, any> = {};
      status[attribute] = value;

      // Execute command on Agatark system
      await this.agatarkClient.controlDevice(id, status);

      // Update local device state
      device.status = { ...device.status, ...status };
      this.devices.set(id, device);

      // Publish confirmation back to MQTT
      await this.mqttBridge.publishDeviceState(id, attribute, value);
      
    } catch (error) {
      logger.error(`Failed to execute command for device ${deviceId}.${attribute}:`, error);
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  get deviceCount(): number {
    return this.devices.size;
  }
}

// Main application entry point
async function main() {
  const bridge = new AgatarkMqttBridge();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await bridge.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await bridge.start();
    
    // Keep the process running
    logger.info('Bridge is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    logger.error('Failed to start bridge:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}