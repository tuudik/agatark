/**
 * Agatark Smart Home Device Types for Home Assistant MQTT Integration
 * Generated from HAR file analysis of teigaritee16viimsi.by.enlife.io
 */

export interface AgatarkDevice {
  id: number;
  created: number;
  updated: number;
  enabled: boolean;
  name: string;
  type: DeviceType;
  roomId?: number;
  siteId: number;
  uuid: string;
  remarks?: string;
  tag?: string;
  status: DeviceStatus;
  conf?: DeviceConfiguration[];
  usage?: DeviceUsage;
  ui?: DeviceUI;
  acl?: AccessControl;
  _acl?: InternalAccessControl;
}

export type DeviceType = 
  | 'climateSensor'
  | 'generic'
  | 'securityDetector'
  | 'securityDetector24'
  | 'access'
  | 'blind'
  | 'vallox_MV_Modbus'
  | 'output'
  | 'enlife_2ADi1Dio_Modbus'
  | 'enlife_SMART_Compact_16'
  | 'modbusDriver'
  | 'enlife_Co2TempRhLux2Dio2Ai2Ao_Modbus'
  | 'switch'
  | 'input'
  | 'huumSauna'
  | 'outputPwm'
  | 'powerSupply'
  | 'light'
  | 'enlife_4DSi4DSio_Modbus'
  | 'yoga_8DiDo_v1_Modbus'
  | 'yoga8ADi8o_Modbus'
  | '';

export interface DeviceStatus {
  online?: boolean;
  // Temperature sensors
  temperature?: number;
  
  // Humidity sensors
  rh?: number;
  ventilationNeedRh?: number;
  
  // CO2 sensors
  co2?: number;
  ventilationNeedCo2?: number;
  
  // Security devices (doors, windows, motion)
  open?: boolean;
  active?: boolean;
  
  // Access control (locks)
  locked?: boolean;
  output2?: boolean;
  open1?: boolean;
  open2?: boolean;
  
  // Blinds/curtains
  dim?: number;
  direction?: boolean;
  motor?: boolean;
  
  // Lights and outputs
  output?: boolean;
  level?: number;
  fadeTime?: number;
  target?: number;
  
  // Switches and inputs
  input?: boolean;
  
  // Power supply
  battFail?: boolean;
  acFail?: boolean;
  powerAlarm?: boolean;
  
  // Controller status
  voltage?: number;
  voltageCpu?: number;
  current?: number;
  buzzer?: boolean;
  serial?: string;
  uptime?: number;
  bootFlagRegister?: number;
  swVersion?: string;
  hwVersion?: string;
  loadMax?: number;
  loadMin?: number;
  reboot?: boolean;
  address?: number;
  baudRate?: number;
  format?: string;
  
  // Alarm states
  fireAlarm?: boolean;
  coAlarm?: boolean;
  faultAlarm?: boolean;
  safetyAlarm?: boolean;
  burglarAlarm?: boolean;
  tamperAlarm?: boolean;
  powerFailAlarm?: boolean;
}

export interface DeviceConfiguration {
  id: number;
  dType?: string;
  path: string;
  target: string;
  pollTime?: number;
  threshold?: number | null;
  offset?: number | null;
  multiplier?: number | null;
  mode?: string;
  relay?: string;
  inverted?: boolean | null;
}

export interface DeviceUsage {
  climateSensor?: string[];
  securityDetector?: string[];
  securityDetector24?: string[];
  alarm?: string[];
  alarm24?: string[];
  access?: string[];
  light?: string[];
  output?: string[];
  switch?: string[];
  input?: string[];
  controller?: string[];
  gateway?: string[];
  generic?: string[];
  indication?: string[];
  blind?: string[];
}

export interface DeviceUI {
  i1?: string[];
  i2?: string[];
  i3?: string[];
  icon?: string;
  template?: string;
  baudRates?: Array<{ name: number; val: number }>;
  formats?: Array<{ name: string; val: number }>;
}

export interface AccessControl {
  inherit?: number[];
  policy?: Array<{ who: number[]; acl: number }>;
  who?: number[];
  acl?: number;
}

export interface InternalAccessControl {
  read: boolean;
  write: boolean;
  admin: boolean;
  logs: boolean;
}

// Home Assistant MQTT Device Classes and Component Types
export const HOME_ASSISTANT_DEVICE_MAPPING = {
  // Climate sensors - map to sensor component with device classes
  climateSensor: {
    temperature: { component: 'sensor', device_class: 'temperature', unit: '°C' },
    rh: { component: 'sensor', device_class: 'humidity', unit: '%' },
    co2: { component: 'sensor', device_class: 'carbon_dioxide', unit: 'ppm' },
    ventilationNeedRh: { component: 'sensor', device_class: 'humidity', unit: '%' },
    ventilationNeedCo2: { component: 'sensor', device_class: 'carbon_dioxide', unit: 'ppm' }
  },
  
  // Security devices - map to binary_sensor component with device classes
  securityDetector: {
    open: { component: 'binary_sensor', device_class: 'door' }, // or 'window' depending on usage
    active: { component: 'binary_sensor', device_class: 'motion' }
  },
  
  // Fire safety - map to binary_sensor component with safety device classes
  securityDetector24: {
    fireAlarm: { component: 'binary_sensor', device_class: 'smoke' },
    coAlarm: { component: 'binary_sensor', device_class: 'carbon_monoxide' },
    faultAlarm: { component: 'binary_sensor', device_class: 'problem' },
    safetyAlarm: { component: 'binary_sensor', device_class: 'safety' },
    burglarAlarm: { component: 'binary_sensor', device_class: 'safety' },
    tamperAlarm: { component: 'binary_sensor', device_class: 'tamper' },
    powerFailAlarm: { component: 'binary_sensor', device_class: 'power' }
  },
  
  // Access control - map to lock component
  access: {
    locked: { component: 'lock' },
    open1: { component: 'binary_sensor', device_class: 'door' },
    open2: { component: 'binary_sensor', device_class: 'door' },
    output2: { component: 'switch' }
  },
  
  // Lighting and outputs - map to light component
  light: {
    output: { component: 'light' },
    level: { component: 'light', attribute: 'brightness' },
    target: { component: 'sensor', unit: '%' },
    fadeTime: { component: 'sensor', device_class: 'duration', unit: 's' }
  },
  
  // Generic outputs - map to switch component
  output: {
    output: { component: 'switch' },
    level: { component: 'sensor', unit: '%' }
  },
  
  // PWM outputs
  outputPwm: {
    output: { component: 'light' },
    level: { component: 'light', attribute: 'brightness' }
  },
  
  // Covers (blinds) - map to cover component
  blind: {
    dim: { component: 'cover', attribute: 'position' },
    direction: { component: 'binary_sensor', device_class: 'moving' },
    motor: { component: 'binary_sensor', device_class: 'running' }
  },
  
  // Switches and inputs - map to switch/binary_sensor components
  switch: {
    output: { component: 'switch' },
    input: { component: 'binary_sensor', device_class: null }
  },
  
  input: {
    input: { component: 'binary_sensor', device_class: null }
  },
  
  // Power supply monitoring - map to binary_sensor with power device classes
  powerSupply: {
    battFail: { component: 'binary_sensor', device_class: 'battery' },
    acFail: { component: 'binary_sensor', device_class: 'power' },
    powerAlarm: { component: 'binary_sensor', device_class: 'power' },
    voltage: { component: 'sensor', device_class: 'voltage', unit: 'V' },
    voltageCpu: { component: 'sensor', device_class: 'voltage', unit: 'V' },
    current: { component: 'sensor', device_class: 'current', unit: 'A' }
  },
  
  // Generic devices
  generic: {
    online: { component: 'binary_sensor', device_class: 'connectivity' },
    temperature: { component: 'sensor', device_class: 'temperature', unit: '°C' },
    rh: { component: 'sensor', device_class: 'humidity', unit: '%' },
    co2: { component: 'sensor', device_class: 'carbon_dioxide', unit: 'ppm' }
  },
  
  // Sauna controllers
  huumSauna: {
    temperature: { component: 'sensor', device_class: 'temperature', unit: '°C' },
    target: { component: 'sensor', device_class: 'temperature', unit: '°C' },
    output: { component: 'switch' }
  }
} as const;

// Common device status attributes that apply to all device types
export const COMMON_STATUS_MAPPING = {
  online: { component: 'binary_sensor', device_class: 'connectivity' },
  
  // Controller/system status
  voltage: { component: 'sensor', device_class: 'voltage', unit: 'V' },
  voltageCpu: { component: 'sensor', device_class: 'voltage', unit: 'V' },
  current: { component: 'sensor', device_class: 'current', unit: 'A' },
  buzzer: { component: 'binary_sensor', device_class: 'sound' },
  uptime: { component: 'sensor', device_class: 'duration', unit: 's' },
  loadMax: { component: 'sensor', unit: '%' },
  loadMin: { component: 'sensor', unit: '%' },
  reboot: { component: 'binary_sensor', device_class: 'running' },
  
  // Alarm states
  fireAlarm: { component: 'binary_sensor', device_class: 'smoke' },
  coAlarm: { component: 'binary_sensor', device_class: 'carbon_monoxide' },
  faultAlarm: { component: 'binary_sensor', device_class: 'problem' },
  safetyAlarm: { component: 'binary_sensor', device_class: 'safety' },
  burglarAlarm: { component: 'binary_sensor', device_class: 'safety' },
  tamperAlarm: { component: 'binary_sensor', device_class: 'tamper' },
  powerFailAlarm: { component: 'binary_sensor', device_class: 'power' }
} as const;

// Name-based device class mapping for Estonian device names
export const DEVICE_NAME_PATTERNS = {
  // Window sensors (aken = window in Estonian)
  window: {
    patterns: ['aken', 'window'],
    device_class: 'window'
  },
  
  // Motion sensors (liikumisandur = motion sensor in Estonian)
  motion: {
    patterns: ['liikumisandur', 'motion', 'pir', 'liikumine'],
    device_class: 'motion'
  },
  
  // Door sensors (uks = door in Estonian)
  door: {
    patterns: ['uks', 'door', 'värav', 'gate'],
    device_class: 'door'
  },
  
  // Temperature sensors
  temperature: {
    patterns: ['temp', 'temperatuur', 'soojus'],
    device_class: 'temperature'
  },
  
  // Smoke detectors
  smoke: {
    patterns: ['suits', 'smoke', 'tulekaitse', 'fire'],
    device_class: 'smoke'
  },
  
  // CO detectors
  carbon_monoxide: {
    patterns: ['co', 'süsinikmonoksiid', 'gaas'],
    device_class: 'carbon_monoxide'
  }
} as const;

export function getDeviceClassFromName(deviceName: string, attribute: string): string | null {
  const lowerName = deviceName.toLowerCase();
  
  // Check each pattern category
  for (const [category, config] of Object.entries(DEVICE_NAME_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        // For motion and window/door sensors, only apply to 'open' and 'active' attributes
        if ((category === 'motion' && attribute === 'active') ||
            ((category === 'window' || category === 'door') && attribute === 'open')) {
          return config.device_class;
        }
        // For other sensors, apply to their primary attributes
        if (category === 'temperature' && attribute === 'temperature') {
          return config.device_class;
        }
        if (category === 'smoke' && (attribute === 'fireAlarm' || attribute === 'active')) {
          return config.device_class;
        }
        if (category === 'carbon_monoxide' && (attribute === 'coAlarm' || attribute === 'active')) {
          return config.device_class;
        }
      }
    }
  }
  
  return null;
}

// Device type helpers for Home Assistant
export function getHomeAssistantMappingForAttribute(device: AgatarkDevice, attribute: string): {
  component: string;
  device_class?: string;
  unit?: string;
  attribute?: string;
} | null {
  // First check device-specific mapping
  const mapping = HOME_ASSISTANT_DEVICE_MAPPING[device.type as keyof typeof HOME_ASSISTANT_DEVICE_MAPPING];
  if (mapping && attribute in mapping) {
    return mapping[attribute as keyof typeof mapping];
  }
  
  // Then check common status mapping
  if (attribute in COMMON_STATUS_MAPPING) {
    return COMMON_STATUS_MAPPING[attribute as keyof typeof COMMON_STATUS_MAPPING];
  }
  
  return null;
}

export function getHomeAssistantDeviceClass(device: AgatarkDevice, attribute: string): string | null {
  // First, check if device name suggests a specific device class
  const nameBasedClass = getDeviceClassFromName(device.name, attribute);
  if (nameBasedClass) {
    return nameBasedClass;
  }
  
  // Then check attribute-specific mapping
  const mapping = getHomeAssistantMappingForAttribute(device, attribute);
  return mapping?.device_class || null;
}

export function getHomeAssistantComponent(device: AgatarkDevice, attribute?: string): string {
  // If we have a specific attribute, try to get its component type
  if (attribute) {
    const mapping = getHomeAssistantMappingForAttribute(device, attribute);
    if (mapping) {
      return mapping.component;
    }
  }
  
  // Fall back to device type based component mapping
  switch (device.type) {
    case 'climateSensor':
      return 'sensor';
      
    case 'securityDetector':
    case 'securityDetector24':
      return 'binary_sensor';
      
    case 'access':
      // Access devices can be locks or binary sensors depending on attribute
      if (attribute === 'locked') return 'lock';
      if (attribute === 'open1' || attribute === 'open2') return 'binary_sensor';
      if (attribute === 'output2') return 'switch';
      return 'lock'; // default for access devices
      
    case 'light':
      return 'light';
      
    case 'output':
      if (attribute === 'level') return 'sensor';
      return 'switch';
      
    case 'blind':
      if (attribute === 'dim') return 'cover';
      return 'binary_sensor';
      
    case 'switch':
      if (attribute === 'input') return 'binary_sensor';
      return 'switch';
      
    case 'input':
      return 'binary_sensor';
      
    case 'powerSupply':
      if (attribute === 'voltage' || attribute === 'voltageCpu' || attribute === 'current') return 'sensor';
      return 'binary_sensor';
      
    default:
      if (attribute && device.status) {
        // Try to infer from the attribute type
        const value = device.status[attribute as keyof typeof device.status];
        if (typeof value === 'boolean') return 'binary_sensor';
        if (typeof value === 'number') return 'sensor';
      }
      return 'sensor';
  }
}

export function getHomeAssistantUnit(device: AgatarkDevice, attribute: string): string | null {
  const mapping = getHomeAssistantMappingForAttribute(device, attribute);
  return mapping?.unit || null;
}

// MQTT Topic helpers
export function getMqttStateTopic(device: AgatarkDevice, attribute: string): string {
  return `agatark/devices/${device.id}/${attribute}/state`;
}

export function getMqttCommandTopic(device: AgatarkDevice, attribute: string): string {
  return `agatark/devices/${device.id}/${attribute}/set`;
}

export function getMqttDiscoveryTopic(device: AgatarkDevice, attribute: string): string {
  const component = getHomeAssistantComponent(device);
  return `homeassistant/${component}/agatark_${device.id}_${attribute}/config`;
}

// Device type categories for easier filtering
export const DEVICE_CATEGORIES = {
  CLIMATE: ['climateSensor', 'generic'] as const,
  SECURITY: ['securityDetector', 'securityDetector24'] as const,
  ACCESS: ['access'] as const,
  LIGHTING: ['light', 'output'] as const,
  WINDOW_COVERING: ['blind'] as const,
  SWITCH: ['switch', 'input'] as const,
  POWER: ['powerSupply'] as const,
  CONTROLLER: [
    'enlife_2ADi1Dio_Modbus',
    'enlife_SMART_Compact_16', 
    'modbusDriver',
    'enlife_Co2TempRhLux2Dio2Ai2Ao_Modbus',
    'enlife_4DSi4DSio_Modbus',
    'yoga_8DiDo_v1_Modbus',
    'yoga8ADi8o_Modbus',
    'vallox_MV_Modbus'
  ] as const,
  SPECIAL: ['huumSauna', 'outputPwm'] as const
} as const;

export function getDeviceCategory(deviceType: DeviceType): keyof typeof DEVICE_CATEGORIES | null {
  for (const [category, types] of Object.entries(DEVICE_CATEGORIES)) {
    if ((types as readonly string[]).includes(deviceType)) {
      return category as keyof typeof DEVICE_CATEGORIES;
    }
  }
  return null;
}