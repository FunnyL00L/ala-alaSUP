export interface FingerSensor {
  id: number;
  nama: string;
  nilai: number; // 0 - 100
  updated_at: string;
}

export interface ServoControl {
  id: number;
  nama: string;
  limit_genggam: number; // 0 - 100 (Max Limit)
  updated_at: string;
}

export interface StorageInfo {
  file: string;
  fullPath?: string;
  sizeKb?: number;
  lastSaved?: string;
  counts?: {
    finger_sensor: number;
    servo_control: number;
  };
}

export interface TrafficPoint {
  time: string;
  timestamp: number;
  throughput: number; // packets/sec
  bandwidthKb: number; // KB/sec
  latencyMs: number;
  isSpike?: boolean;
}

export interface DailyUsageSummary {
  date: string;
  totalPackets: number;
  avgLatencyMs: number;
  peakThroughput: number;
  surgeCount: number;
  dataTransferredMb: number;
}

export interface SpikeAlert {
  id: string;
  timestamp: string;
  type: 'SENSOR_SPIKE' | 'SERVO_LIMIT_SURGE' | 'TRAFFIC_BURST';
  finger?: string;
  detail: string;
  value: number;
  delta: number;
}

export interface ProtocolStats {
  websocket: {
    clients: number;
    rxPackets: number;
    txPackets: number;
    latencyMs: number;
    port: number;
    endpoint: string;
    status: 'online' | 'offline';
  };
  udp: {
    registeredClients: number;
    rxPackets: number;
    txPackets: number;
    latencyMs: number;
    port: number;
    status: 'online' | 'offline';
  };
  rest: {
    totalRequests: number;
    latencyMs: number;
    port: number;
    status: 'online' | 'offline';
  };
}

export interface SystemStats {
  wsClients: number;
  uptimeSeconds: number;
  totalPacketsProcessed: number;
  redisEngine: string;
  syncIntervalMs: number;
  currentLatencyMs: number;
  currentThroughput: number;
  dailyAvgThroughput: number;
  surgeCountToday: number;
  protocols?: ProtocolStats;
}

export type ActiveNavTab = 
  | 'table_editor' 
  | 'sql_editor' 
  | 'realtime_traffic' 
  | 'tri_protocol_hub'
  | 'unity_glove' 
  | 'connect_api' 
  | 'storage_system';

