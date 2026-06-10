export interface SensorData {
  temp: number;
  humidity: number;
}

export interface HardwareCommand {
  action: 'TOGGLE_RELAY' | 'SHUTDOWN' | 'STATUS_CHECK';
  pin: string;
  timestamp: number;
}