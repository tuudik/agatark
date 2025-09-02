# Agatark Smart Home System - Device Analysis

This document provides a comprehensive analysis of device types found in the Agatark smart home system at Teigaritee 16, Viimsi, Estonia.

## System Overview

- **Total Devices**: 147 devices
- **System**: EnLife smart home platform
- **Version**: 25.8.2-538
- **Node**: Teigaritee16 (c584)

## Device Categories

### 🌡️ Climate Sensors
- **Temperature sensors** (air, floor)
- **Humidity sensors** 
- **CO2 sensors**
- **Combined sensors** (temperature + humidity + CO2 + lux)

**Device Types**: `climateSensor`, `generic`
**Home Assistant Component**: `sensor`
**Measurements**: Temperature (°C), Humidity (%), CO2 (ppm)

### 🔒 Security & Safety Devices

#### Door & Window Sensors
- **Door sensors** (indoor/outdoor)
- **Window sensors**
- **Motion detectors**

**Device Type**: `securityDetector`
**Home Assistant Component**: `binary_sensor`
**States**: Open/Closed, Motion/No Motion

#### Fire & Safety Detectors (24/7 Monitoring)
- **Smoke detectors**
- **CO detectors** 
- **Fault detectors**

**Device Type**: `securityDetector24`
**Home Assistant Component**: `binary_sensor`
**Alarms**: Fire, CO, Fault, Tamper

### 🚪 Access Control
- **Electronic door locks**
- **Gate controls**
- **Garage door controls**

**Device Type**: `access`
**Home Assistant Component**: `lock`
**Features**: Lock/Unlock, Open/Close, Manual/Scheduled unlocking

### 💡 Lighting & Outputs
- **Indoor lights** (individual room control)
- **Outdoor lights** (facade, yard, etc.)
- **General outputs** (pumps, heaters, etc.)
- **PWM dimmers** (0-10V control)

**Device Types**: `light`, `output`, `outputPwm`
**Home Assistant Component**: `light`, `switch`
**Features**: On/Off, Dimming, Scheduling

### 🪟 Window Coverings
- **Motorized blinds/curtains**
- **Direction control**

**Device Type**: `blind`
**Home Assistant Component**: `cover`
**Features**: Open/Close, Position control

### 🔘 Switches & Inputs
- **Wall switches**
- **Input monitoring** (circuit breakers, etc.)

**Device Types**: `switch`, `input`
**Home Assistant Component**: `switch`, `binary_sensor`

### ⚡ Power Management
- **Power supplies**
- **Battery monitoring**
- **AC failure detection**

**Device Type**: `powerSupply`
**Home Assistant Component**: `binary_sensor`
**Monitoring**: AC Fail, Battery Fail, Power Alarms

### 🎛️ Controllers & Gateways
- **Modbus controllers**
- **I/O modules**
- **Ventilation controllers**

**Device Types**: Multiple Modbus device types
**Purpose**: System infrastructure, not directly exposed to Home Assistant

### 🔥 Special Devices
- **Sauna heater control**

**Device Type**: `huumSauna`
**Features**: Timer control, safety shutoff

## Device Type Mapping for Home Assistant

| Agatark Type | Home Assistant Component | Device Class | Description |
|--------------|-------------------------|--------------|-------------|
| `climateSensor` | `sensor` | `temperature`, `humidity`, `carbon_dioxide` | Climate monitoring |
| `securityDetector` | `binary_sensor` | `door`, `window`, `motion`, `safety` | Security sensors |
| `securityDetector24` | `binary_sensor` | `smoke`, `carbon_monoxide`, `problem` | Fire & safety |
| `access` | `lock` | N/A | Electronic locks |
| `light` | `light` | N/A | Lighting control |
| `output` | `switch` | N/A | General outputs |
| `blind` | `cover` | `shade` | Window coverings |
| `switch` | `switch` | N/A | Manual switches |
| `powerSupply` | `binary_sensor` | `power`, `battery`, `problem` | Power monitoring |

## MQTT Integration Structure

### Topic Structure
```
agatark/devices/{device_id}/{attribute}/state
agatark/devices/{device_id}/{attribute}/set
```

### Home Assistant Discovery
```
homeassistant/{component}/agatark_{device_id}_{attribute}/config
```

### Example Device Configurations

#### Temperature Sensor
```json
{
  "name": "Living Room Temperature",
  "state_topic": "agatark/devices/566/temperature/state",
  "unit_of_measurement": "°C",
  "device_class": "temperature",
  "unique_id": "agatark_566_temperature"
}
```

#### Door Sensor
```json
{
  "name": "Main Door",
  "state_topic": "agatark/devices/476/open/state",
  "device_class": "door",
  "payload_on": "true",
  "payload_off": "false",
  "unique_id": "agatark_476_open"
}
```

#### Smart Lock
```json
{
  "name": "Front Door Lock",
  "state_topic": "agatark/devices/604/locked/state",
  "command_topic": "agatark/devices/604/locked/set",
  "payload_lock": "true",
  "payload_unlock": "false",
  "unique_id": "agatark_604_locked"
}
```

## Implementation Recommendations

1. **Device Discovery**: Use the `/devices` API endpoint to enumerate all devices
2. **Status Monitoring**: Poll device status regularly or implement WebSocket connection
3. **Command Execution**: Use PUT requests to device control endpoints
4. **Authentication**: Include authorization token in all requests
5. **Error Handling**: Monitor device online status and handle network failures
6. **Rate Limiting**: Respect API rate limits to avoid system overload

## Security Considerations

- All communications should use HTTPS
- Store authentication tokens securely
- Implement proper access control in Home Assistant
- Monitor for unauthorized access attempts
- Regular security updates for the integration

## Next Steps

1. Implement TypeScript MQTT client for Agatark API
2. Create Home Assistant custom integration
3. Set up automatic device discovery
4. Implement real-time status updates
5. Add support for device control from Home Assistant
6. Create dashboards for different device categories