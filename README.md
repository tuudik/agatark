# Agatark MQTT Bridge

A TypeScript application that bridges Agatark smart home systems with Home Assistant via MQTT. The bridge acts as an MQTT broker that Home Assistant connects to directly.

## Features

- **Built-in MQTT Broker**: Acts as MQTT broker for Home Assistant to connect to
- **Bidirectional Communication**: Control devices from Home Assistant and receive status updates from Agatark
- **Home Assistant Discovery**: Automatic device discovery for seamless integration
- **Real-time Updates**: Event polling for immediate status synchronization
- **Device Filtering**: Optional filtering to expose only specific devices
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd agatark
npm install
```

### 2. Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Agatark System (supports auto-protocol detection)
AGATARK_HOST=your-agatark-host.com
AGATARK_EMAIL=your-email@example.com
AGATARK_PASSWORD=your_password

# MQTT Broker (Bridge acts as broker)
MQTT_PORT=1883
MQTT_USERNAME=homeassistant
MQTT_PASSWORD=ha_password

# Optional: Filter devices (comma-separated IDs)
DEVICE_FILTER=431,454,476
```

**Protocol Auto-Detection:**
- Domain names → HTTPS (e.g., `my-system.example.com`)
- IP addresses → HTTP (e.g., `192.168.1.100`)
- localhost → HTTP (e.g., `localhost:8080`)
- Explicit protocol → Use as provided (e.g., `http://192.168.1.100`)

### 3. Run with Docker

```bash
# Build and run
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 4. Run with Node.js

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Configure Home Assistant

Add the following to your Home Assistant `configuration.yaml`:

```yaml
mqtt:
  broker: <bridge-host-ip>  # IP address where the bridge is running
  port: 1883
  username: homeassistant
  password: ha_password
  discovery: true
```

## Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGATARK_HOST` | ✅ | - | Agatark system hostname |
| `AGATARK_EMAIL` | ✅ | - | Login email |
| `AGATARK_PASSWORD` | ✅ | - | Login password |
| `AGATARK_REMEMBER` | ❌ | `on` | Remember login session |
| `MQTT_PORT` | ❌ | `1883` | MQTT broker port |
| `MQTT_USERNAME` | ❌ | - | MQTT username for clients |
| `MQTT_PASSWORD` | ❌ | - | MQTT password for clients |
| `POLL_INTERVAL` | ❌ | `5000` | Event polling interval (ms) |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `DISCOVERY_PREFIX` | ❌ | `homeassistant` | HA discovery prefix |
| `DEVICE_FILTER` | ❌ | - | Comma-separated device IDs |
| `HA_DISCOVERY_ENABLED` | ❌ | `true` | Enable HA discovery |
| `HA_DEVICE_NAME` | ❌ | `Agatark Smart Home` | Device name in HA |

## Architecture

```
Home Assistant ←→ [MQTT] ←→ Agatark Bridge ←→ [HTTP API] ←→ Agatark System
```

- **Home Assistant** connects to the bridge as an MQTT client
- **Bridge** acts as MQTT broker and Agatark API client
- **Real-time sync** via polling the Agatark events API

## Supported Device Types

The bridge automatically detects and configures the following device types:

### 🌡️ Climate Sensors
- **Temperature sensors** → Home Assistant `sensor` with `temperature` device class
- **Humidity sensors** → Home Assistant `sensor` with `humidity` device class  
- **CO2 sensors** → Home Assistant `sensor` with `carbon_dioxide` device class

### 💡 Lighting & Outputs  
- **Lights** → Home Assistant `light` 
- **Switches/Outputs** → Home Assistant `switch`
- **Dimmers** → Home Assistant `light` with brightness support

### 🔒 Security Devices
- **Door/Window sensors** → Home Assistant `binary_sensor` with `door`/`window` device class
- **Motion detectors** → Home Assistant `binary_sensor` with `motion` device class
- **Smoke detectors** → Home Assistant `binary_sensor` with `smoke` device class
- **CO detectors** → Home Assistant `binary_sensor` with `carbon_monoxide` device class

### 🚪 Access Control
- **Electronic locks** → Home Assistant `lock`

## MQTT Topics

### State Topics (Published by bridge)
```
agatark/devices/{device_id}/{attribute}/state
agatark/devices/{device_id}/availability
agatark/bridge/availability
```

### Command Topics (Subscribed by bridge)
```
agatark/devices/{device_id}/{attribute}/set
```

### Discovery Topics
```
homeassistant/{component}/agatark_{device_id}_{attribute}/config
```

## Example Commands

### Control a light via MQTT:
```bash
# Turn on light (device ID 431)
mosquitto_pub -h <bridge-ip> -t "agatark/devices/431/output/set" -m "ON"

# Turn off light
mosquitto_pub -h <bridge-ip> -t "agatark/devices/431/output/set" -m "OFF"
```

### Lock/Unlock door:
```bash
# Lock door (device ID 604)  
mosquitto_pub -h <bridge-ip> -t "agatark/devices/604/locked/set" -m "LOCK"

# Unlock door
mosquitto_pub -h <bridge-ip> -t "agatark/devices/604/locked/set" -m "UNLOCK"
```

## Troubleshooting

### Check logs:
```bash
# Docker logs
docker-compose logs -f agatark-bridge

# Direct Node.js
npm run dev
```

### Common issues:

1. **Authentication Failed**
   - Verify `AGATARK_EMAIL` and `AGATARK_PASSWORD`
   - Check if account has proper permissions

2. **Home Assistant can't connect to MQTT**  
   - Verify bridge IP address in HA configuration
   - Check `MQTT_PORT` (default 1883)
   - Verify `MQTT_USERNAME` and `MQTT_PASSWORD` match
   - Ensure port 1883 is accessible from Home Assistant

3. **No devices appear**
   - Check `DEVICE_FILTER` settings
   - Verify devices are enabled in Agatark system
   - Check logs for errors during device loading

4. **Commands not working**
   - Verify device supports the attribute being controlled
   - Check MQTT topic format
   - Ensure device is online

### Network Configuration

If running in Docker, ensure the MQTT port is properly exposed:
- Bridge runs on port 1883 (configurable via `MQTT_PORT`)
- Docker exposes this port to the host
- Home Assistant must be able to reach the bridge host IP on this port

## Development

### Build:
```bash
npm run build
```

### Run tests:
```bash
# Install dependencies first
npm install

# Run development server
npm run dev
```

### Docker development:
```bash
# Build image
docker build -t agatark-mqtt-bridge .

# Run with environment file
docker run --env-file .env -p 1883:1883 agatark-mqtt-bridge
```

## API Reference

The bridge uses the following Agatark API endpoints:

- `PUT /hello` - Authentication
- `GET /devices` - Fetch device list  
- `POST /events` - Poll for status updates
- `PATCH /devices?id={id}` - Control devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details