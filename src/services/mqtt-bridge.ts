import Aedes from 'aedes';
import { createServer } from 'net';
import { logger } from '../utils/logger';
import { AgatarkDevice, getHomeAssistantComponent, getHomeAssistantDeviceClass, getHomeAssistantMappingForAttribute, getHomeAssistantUnit } from '../types/agatark-devices';

export interface MqttBrokerConfig {
  port: number;
  username?: string;
  password?: string;
}

export interface HomeAssistantDiscoveryConfig {
  name: string;
  unique_id: string;
  state_topic: string;
  command_topic?: string;
  device_class?: string;
  unit_of_measurement?: string;
  payload_on?: string;
  payload_off?: string;
  payload_lock?: string;
  payload_unlock?: string;
  device: {
    identifiers: string[];
    name: string;
    manufacturer: string;
    model: string;
    via_device?: string;
  };
  availability: {
    topic: string;
    payload_available: string;
    payload_not_available: string;
  };
}

export class MqttBridge {
  private broker: Aedes;
  private server: any;
  private config: MqttBrokerConfig;
  private discoveryPrefix: string;
  private deviceName: string;
  private commandCallback?: (deviceId: string, attribute: string, value: any) => void;

  constructor(config: MqttBrokerConfig, discoveryPrefix = 'homeassistant', deviceName = 'Agatark Smart Home') {
    this.config = config;
    this.discoveryPrefix = discoveryPrefix;
    this.deviceName = deviceName;

    this.broker = new Aedes({
      authenticate: this.authenticate.bind(this),
      authorizePublish: this.authorizePublish.bind(this),
      authorizeSubscribe: this.authorizeSubscribe.bind(this)
    });

    this.server = createServer(this.broker.handle);
    this.setupEventHandlers();
  }

  private authenticate(client: any, username: string | undefined, password: Buffer | undefined, callback: Function): void {
    // Simple authentication - in production you'd want more secure credentials
    if (this.config.username && this.config.password) {
      const isValid = username === this.config.username && password?.toString() === this.config.password;
      callback(null, isValid);
    } else {
      // Allow any connection if no credentials configured
      callback(null, true);
    }
  }

  private authorizePublish(client: any, packet: any, callback: Function): void {
    // Allow all publishes for now - in production you might want to restrict topics
    callback(null);
  }

  private authorizeSubscribe(client: any, subscription: any, callback: Function): void {
    // Allow all subscriptions for now
    callback(null, subscription);
  }

  private setupEventHandlers(): void {
    this.broker.on('client', (client) => {
      logger.info(`MQTT client connected: ${client.id}`);
    });

    this.broker.on('clientDisconnect', (client) => {
      logger.info(`MQTT client disconnected: ${client.id}`);
    });

    this.broker.on('publish', (packet, client) => {
      // Handle incoming command messages
      if (packet.topic.startsWith('agatark/devices/') && packet.topic.endsWith('/set')) {
        this.handleCommand(packet.topic, packet.payload.toString());
      }
    });

    this.broker.on('subscribe', (subscriptions, client) => {
      logger.debug(`Client ${client.id} subscribed to: ${subscriptions.map(s => s.topic).join(', ')}`);
    });
  }

  private handleCommand(topic: string, payload: string): void {
    try {
      const topicParts = topic.split('/');
      if (topicParts.length === 5 && topicParts[0] === 'agatark' && topicParts[1] === 'devices' && topicParts[4] === 'set') {
        const deviceId = topicParts[2];
        const attribute = topicParts[3];
        const value = this.parseCommandValue(payload);
        
        logger.info(`Received command for device ${deviceId}.${attribute}: ${value}`);
        
        if (this.commandCallback) {
          this.commandCallback(deviceId, attribute, value);
        }
      }
    } catch (error) {
      logger.error('Error processing MQTT command:', error);
    }
  }

  onCommand(callback: (deviceId: string, attribute: string, value: any) => void): void {
    this.commandCallback = callback;
  }

  private parseCommandValue(value: string): any {
    // Handle common Home Assistant command values
    if (value === 'ON' || value === 'true') return true;
    if (value === 'OFF' || value === 'false') return false;
    if (value === 'LOCK') return true;
    if (value === 'UNLOCK') return false;
    
    // Try to parse as number
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    
    // Return as string
    return value;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, (err: any) => {
        if (err) {
          logger.error('Failed to start MQTT broker:', err);
          reject(err);
        } else {
          logger.info(`MQTT broker started on port ${this.config.port}`);
          this.publishAvailability('online');
          resolve();
        }
      });
    });
  }

  async publishDeviceState(deviceId: number, attribute: string, value: any): Promise<void> {
    const topic = `agatark/devices/${deviceId}/${attribute}/state`;
    const payload = this.formatStateValue(value);
    
    try {
      this.broker.publish({
        cmd: 'publish',
        topic,
        payload: Buffer.from(payload),
        retain: true,
        qos: 0,
        dup: false
      }, () => {
        logger.debug(`Published state ${deviceId}.${attribute}: ${payload}`);
      });
    } catch (error) {
      logger.error(`Failed to publish device state ${deviceId}.${attribute}:`, error);
    }
  }

  private formatStateValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'ON' : 'OFF';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return String(value);
  }

  async publishDeviceDiscovery(device: AgatarkDevice): Promise<void> {
    // Publish discovery for all available device attributes based on status
    if (device.status) {
      for (const [attribute, value] of Object.entries(device.status)) {
        if (value !== undefined) {
          const mapping = getHomeAssistantMappingForAttribute(device, attribute);
          if (mapping) {
            await this.publishAttributeDiscovery(
              device,
              attribute,
              mapping.component,
              mapping.device_class || undefined,
              mapping.unit || undefined
            );
          } else {
            // Fallback for unmapped attributes
            const component = getHomeAssistantComponent(device, attribute);
            const deviceClass = getHomeAssistantDeviceClass(device, attribute);
            const unit = getHomeAssistantUnit(device, attribute);
            
            await this.publishAttributeDiscovery(
              device,
              attribute,
              component,
              deviceClass || undefined,
              unit || undefined
            );
          }
        }
      }
    }
  }

  private async publishAttributeDiscovery(
    device: AgatarkDevice, 
    attribute: string, 
    component: string, 
    deviceClass?: string,
    unitOfMeasurement?: string
  ): Promise<void> {
    const uniqueId = `agatark_${device.id}_${attribute}`;
    const discoveryTopic = `${this.discoveryPrefix}/${component}/${uniqueId}/config`;
    
    const config: HomeAssistantDiscoveryConfig = {
      name: `${device.name} ${attribute}`,
      unique_id: uniqueId,
      state_topic: `agatark/devices/${device.id}/${attribute}/state`,
      device: {
        identifiers: [`agatark_${device.id}`],
        name: device.name,
        manufacturer: 'Agatark',
        model: device.type,
        via_device: 'agatark_bridge'
      },
      availability: {
        topic: `agatark/devices/${device.id}/availability`,
        payload_available: 'online',
        payload_not_available: 'offline'
      }
    };

    // Add component-specific configuration
    if (component === 'switch' || component === 'light') {
      config.command_topic = `agatark/devices/${device.id}/${attribute}/set`;
      config.payload_on = 'ON';
      config.payload_off = 'OFF';
    } else if (component === 'lock') {
      config.command_topic = `agatark/devices/${device.id}/${attribute}/set`;
      config.payload_lock = 'LOCK';
      config.payload_unlock = 'UNLOCK';
    } else if (component === 'binary_sensor') {
      config.payload_on = 'ON';
      config.payload_off = 'OFF';
    }

    if (deviceClass) {
      config.device_class = deviceClass;
    }

    if (unitOfMeasurement) {
      config.unit_of_measurement = unitOfMeasurement;
    }

    try {
      this.broker.publish({
        cmd: 'publish',
        topic: discoveryTopic,
        payload: Buffer.from(JSON.stringify(config)),
        retain: true,
        qos: 0,
        dup: false
      }, () => {
        logger.info(`Published discovery for ${device.name}.${attribute} (${component})`);
      });
    } catch (error) {
      logger.error(`Failed to publish discovery for ${device.name}.${attribute}:`, error);
    }
  }

  async publishDeviceAvailability(deviceId: number, available: boolean): Promise<void> {
    const topic = `agatark/devices/${deviceId}/availability`;
    const payload = available ? 'online' : 'offline';
    
    try {
      this.broker.publish({
        cmd: 'publish',
        topic,
        payload: Buffer.from(payload),
        retain: true,
        qos: 0,
        dup: false
      }, () => {
        logger.debug(`Published availability for device ${deviceId}: ${payload}`);
      });
    } catch (error) {
      logger.error(`Failed to publish availability for device ${deviceId}:`, error);
    }
  }

  private async publishAvailability(status: 'online' | 'offline'): Promise<void> {
    try {
      this.broker.publish({
        cmd: 'publish',
        topic: 'agatark/bridge/availability',
        payload: Buffer.from(status),
        retain: true,
        qos: 0,
        dup: false
      }, () => {
        logger.info(`Bridge availability: ${status}`);
      });
    } catch (error) {
      logger.error('Failed to publish bridge availability:', error);
    }
  }

  async stop(): Promise<void> {
    await this.publishAvailability('offline');
    
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('MQTT broker stopped');
        resolve();
      });
    });
  }

  get isRunning(): boolean {
    return this.server.listening;
  }
}