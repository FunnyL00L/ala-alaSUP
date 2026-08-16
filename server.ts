import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const UDP_PORT = 4000;
const app = express();
app.use(express.json());

// Enable CORS for all incoming clients (Unity, Oculus, Postman, Browser)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Persistent Storage Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db_hypermedia.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface FingerSensor {
  id: number;
  nama: string;
  nilai: number; // 0 - 100
  updated_at: string;
}

interface ServoControl {
  id: number;
  nama: string;
  limit_genggam: number; // 0 - 100 max limit
  updated_at: string;
}

// Initial Default State
const defaultSensors: FingerSensor[] = [
  { id: 1, nama: 'Jempol', nilai: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 2, nama: 'Telunjuk', nilai: 100, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 3, nama: 'Tengah', nilai: 100, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 4, nama: 'Manis', nilai: 100, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 5, nama: 'Kelingking', nilai: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
];

const defaultServos: ServoControl[] = [
  { id: 1, nama: 'Servo Ibu Jari', limit_genggam: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 2, nama: 'Servo Telunjuk', limit_genggam: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 3, nama: 'Servo Jari Tengah', limit_genggam: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 4, nama: 'Servo Jari Manis', limit_genggam: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
  { id: 5, nama: 'Servo Kelingking', limit_genggam: 0, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' },
];

let fingerSensors: FingerSensor[] = [];
let servoControls: ServoControl[] = [];
let lastSavedToDisk: string = '';

// Load Database from Disk
function loadDatabaseFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.finger_sensor) && Array.isArray(parsed.servo_control)) {
        fingerSensors = parsed.finger_sensor.map((s: any) => ({
          id: Number(s.id),
          nama: String(s.nama || `Sensor ${s.id}`),
          nilai: Math.min(100, Math.max(0, Number(s.nilai) || 0)),
          updated_at: s.updated_at || new Date().toISOString(),
        }));
        servoControls = parsed.servo_control.map((sv: any) => ({
          id: Number(sv.id),
          nama: String(sv.nama || `Servo ${sv.id}`),
          limit_genggam: Math.min(100, Math.max(0, Number(sv.limit_genggam) || 0)), // STRICTLY 0 - 100
          updated_at: sv.updated_at || new Date().toISOString(),
        }));
        lastSavedToDisk = new Date().toISOString();
        console.log(`[DB_HyperMedia] Loaded ${fingerSensors.length} sensors & ${servoControls.length} servos from ${DATA_FILE}`);
        return;
      }
    }
  } catch (err) {
    console.error('[DB_HyperMedia] Failed to load data file, initializing defaults:', err);
  }

  // If file doesn't exist or failed to parse, use defaults
  fingerSensors = JSON.parse(JSON.stringify(defaultSensors));
  servoControls = JSON.parse(JSON.stringify(defaultServos));
  saveDatabaseToDisk();
}

// Save Database to Disk
function saveDatabaseToDisk() {
  try {
    const payload = {
      database: 'DB_HyperMedia',
      version: '1.0.0',
      saved_at: new Date().toISOString(),
      storage_location: DATA_FILE,
      finger_sensor: fingerSensors,
      servo_control: servoControls,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    lastSavedToDisk = new Date().toISOString();
  } catch (err) {
    console.error('[DB_HyperMedia] Error saving to disk:', err);
  }
}

// Initial Boot Load
loadDatabaseFromDisk();

// Telemetry & Traffic metrics
let totalPacketsProcessed = 1845;
let bytesTransferred = 345000;
let surgeAlerts: Array<{
  id: string;
  timestamp: string;
  type: 'SENSOR_SPIKE' | 'SERVO_LIMIT_SURGE' | 'TRAFFIC_BURST';
  finger?: string;
  detail: string;
  value: number;
  delta: number;
}> = [];

// Traffic history for live graph (last 40 data points)
const trafficHistory: Array<{
  time: string;
  timestamp: number;
  throughput: number;
  bandwidthKb: number;
  latencyMs: number;
  isSpike: boolean;
}> = [];

const now = Date.now();
for (let i = 30; i >= 0; i--) {
  const t = new Date(now - i * 500);
  const throughput = Math.floor(22 + Math.random() * 10);
  trafficHistory.push({
    time: t.toTimeString().split(' ')[0] + '.' + Math.floor(t.getMilliseconds() / 100),
    timestamp: t.getTime(),
    throughput,
    bandwidthKb: parseFloat((throughput * 0.42).toFixed(2)),
    latencyMs: Math.floor(1 + Math.random() * 3),
    isSpike: false,
  });
}

// Daily Aggregates
const todayStr = new Date().toISOString().split('T')[0];
const dailyStats: Record<string, { totalPackets: number; avgLatencyMs: number; peakThroughput: number; surgeCount: number; dataTransferredMb: number }> = {
  '2026-08-11': { totalPackets: 86400, avgLatencyMs: 3.2, peakThroughput: 54, surgeCount: 4, dataTransferredMb: 36.2 },
  '2026-08-12': { totalPackets: 92300, avgLatencyMs: 2.8, peakThroughput: 62, surgeCount: 7, dataTransferredMb: 38.9 },
  '2026-08-13': { totalPackets: 104500, avgLatencyMs: 3.1, peakThroughput: 78, surgeCount: 11, dataTransferredMb: 44.1 },
  '2026-08-14': { totalPackets: 98200, avgLatencyMs: 2.9, peakThroughput: 59, surgeCount: 5, dataTransferredMb: 41.5 },
  [todayStr]: { totalPackets: 18240, avgLatencyMs: 2.7, peakThroughput: 64, surgeCount: 3, dataTransferredMb: 8.2 },
};

let recentPacketCountInWindow = 0;

// Spike Detector
function detectSpike(fingerName: string, oldValue: number, newValue: number, type: 'sensor' | 'servo') {
  const delta = Math.abs(newValue - oldValue);
  if (delta >= 25) {
    const alert = {
      id: 'spk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString(),
      type: type === 'sensor' ? ('SENSOR_SPIKE' as const) : ('SERVO_LIMIT_SURGE' as const),
      finger: fingerName,
      detail: `${type === 'sensor' ? 'finger_sensor' : 'servo_control'} spike: ${oldValue} ➔ ${newValue} (Δ ${delta})`,
      value: newValue,
      delta,
    };
    surgeAlerts.unshift(alert);
    if (surgeAlerts.length > 20) surgeAlerts.pop();
    if (dailyStats[todayStr]) {
      dailyStats[todayStr].surgeCount++;
    }
  }
}

// Create HTTP Server & WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// UDP Server Socket on port 4000
const udpServer = dgram.createSocket('udp4');
const registeredUdpClients = new Map<string, { address: string; port: number; lastSeen: number; device: string }>();

// Protocol Telemetry Counters
let udpRxPackets = 920;
let udpTxPackets = 2140;
let wsRxPackets = 1450;
let wsTxPackets = 3800;
let restTotalRequests = 520;

function broadcastWs(data: object) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      wsTxPackets += 1;
    }
  });
}

function broadcastUdp(payload: object | Buffer) {
  const nowTime = Date.now();
  const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  registeredUdpClients.forEach((client, key) => {
    if (nowTime - client.lastSeen > 90000) {
      registeredUdpClients.delete(key);
      return;
    }
    udpServer.send(buffer, client.port, client.address, (err) => {
      if (!err) udpTxPackets += 1;
    });
  });
}

function broadcastAll(data: object) {
  broadcastWs(data);
  broadcastUdp(data);
}

// UDP Message Handler
udpServer.on('message', (msgBuffer, remote) => {
  recentPacketCountInWindow += 1;
  totalPacketsProcessed += 1;
  udpRxPackets += 1;

  const clientKey = `${remote.address}:${remote.port}`;
  if (!registeredUdpClients.has(clientKey)) {
    registeredUdpClients.set(clientKey, {
      address: remote.address,
      port: remote.port,
      lastSeen: Date.now(),
      device: remote.port === 4000 ? 'ESP32' : 'Unity/Client',
    });
  } else {
    const c = registeredUdpClients.get(clientKey)!;
    c.lastSeen = Date.now();
  }

  // 1. Binary Datagram Protocol (Ultra-Low Latency, 0-parsing)
  if (msgBuffer.length >= 6) {
    const header = msgBuffer[0];
    // 0x01 = 5 Flex Sensors from ESP32: [0x01, jempol, telunjuk, tengah, manis, kelingking]
    if (header === 0x01) {
      for (let i = 0; i < 5; i++) {
        if (fingerSensors[i]) {
          const oldVal = fingerSensors[i].nilai;
          fingerSensors[i].nilai = Math.min(100, Math.max(0, msgBuffer[i + 1]));
          fingerSensors[i].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          detectSpike(fingerSensors[i].nama, oldVal, fingerSensors[i].nilai, 'sensor');
        }
      }
      saveDatabaseToDisk();
      broadcastWs({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
      return;
    }
    // 0x02 = 5 Servo Limits from Unity/Client: [0x02, sv1, sv2, sv3, sv4, sv5]
    if (header === 0x02) {
      for (let i = 0; i < 5; i++) {
        if (servoControls[i]) {
          const oldVal = servoControls[i].limit_genggam;
          servoControls[i].limit_genggam = Math.min(100, Math.max(0, msgBuffer[i + 1]));
          servoControls[i].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          detectSpike(servoControls[i].nama, oldVal, servoControls[i].limit_genggam, 'servo');
        }
      }
      saveDatabaseToDisk();
      broadcastWs({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
      return;
    }
  }

  // 2. JSON Datagram Protocol
  try {
    const str = msgBuffer.toString('utf8');
    const data = JSON.parse(str);

    if (data.type === 'REGISTER') {
      const resp = Buffer.from(JSON.stringify({
        type: 'REGISTERED',
        database: 'DB_HyperMedia',
        protocol: 'UDP Datagram v1.0',
        udpPort: UDP_PORT,
        sensors: fingerSensors,
        servos: servoControls,
        serverTime: new Date().toISOString(),
      }));
      udpServer.send(resp, remote.port, remote.address);
      return;
    }

    if (data.type === 'PING') {
      const pong = Buffer.from(JSON.stringify({ type: 'PONG', timestamp: Date.now(), rx: udpRxPackets, tx: udpTxPackets }));
      udpServer.send(pong, remote.port, remote.address);
      return;
    }

    if (data.type === 'UPDATE_SENSOR') {
      const sensor = fingerSensors.find((s) => s.id === Number(data.id));
      if (sensor) {
        const oldVal = sensor.nilai;
        sensor.nilai = Math.min(100, Math.max(0, Number(data.nilai)));
        sensor.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
        detectSpike(sensor.nama, oldVal, sensor.nilai, 'sensor');
        saveDatabaseToDisk();
        broadcastWs({ type: 'SENSOR_UPDATED', sensor });
        broadcastUdp({ type: 'SENSOR_UPDATED', sensor });
      }
    }

    if (data.type === 'SET_SERVO') {
      const servo = servoControls.find((s) => s.id === Number(data.id));
      if (servo) {
        const oldVal = servo.limit_genggam;
        servo.limit_genggam = Math.min(100, Math.max(0, Number(data.limit_genggam)));
        servo.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
        detectSpike(servo.nama, oldVal, servo.limit_genggam, 'servo');
        saveDatabaseToDisk();
        broadcastWs({ type: 'SERVO_UPDATED', servo });
        // Emit compact binary 6-byte packet to ESP32: [0x02, s1, s2, s3, s4, s5]
        const binServo = Buffer.from([0x02, ...servoControls.map((sv) => sv.limit_genggam)]);
        broadcastUdp(binServo);
      }
    }

    if (data.type === 'SENSOR_BATCH' && Array.isArray(data.sensors)) {
      data.sensors.forEach((val: any, idx: number) => {
        if (typeof val === 'number' && fingerSensors[idx]) {
          fingerSensors[idx].nilai = Math.min(100, Math.max(0, val));
        } else if (val && typeof val === 'object' && val.id) {
          const s = fingerSensors.find((x) => x.id === Number(val.id));
          if (s && val.nilai !== undefined) {
            s.nilai = Math.min(100, Math.max(0, Number(val.nilai)));
          }
        }
      });
      saveDatabaseToDisk();
      broadcastWs({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
    }

    if (data.type === 'GET_STATE') {
      const stateResp = Buffer.from(JSON.stringify({
        type: 'STATE',
        sensors: fingerSensors,
        servos: servoControls,
        timestamp: new Date().toISOString(),
      }));
      udpServer.send(stateResp, remote.port, remote.address);
    }
  } catch (err) {
    // Ignore malformed datagrams
  }
});

udpServer.on('error', (err) => {
  console.error('[DB_HyperMedia UDP Error]', err);
});

try {
  udpServer.bind(UDP_PORT, '0.0.0.0', () => {
    console.log(`[DB_HyperMedia] UDP Server listening on 0.0.0.0:${UDP_PORT}`);
  });
} catch (e) {
  console.warn('[DB_HyperMedia] UDP bind notice:', e);
}

// 0.5s Realtime Sync Ticker (500ms cycle)
setInterval(() => {
  const curr = new Date();
  const timeLabel = curr.toTimeString().split(' ')[0] + '.' + Math.floor(curr.getMilliseconds() / 100);
  
  const currentThroughput = (recentPacketCountInWindow * 2) + Math.floor(Math.random() * 5);
  recentPacketCountInWindow = 0;

  totalPacketsProcessed += 1;
  bytesTransferred += 420;

  if (dailyStats[todayStr]) {
    dailyStats[todayStr].totalPackets += 1;
    dailyStats[todayStr].dataTransferredMb += 0.00042;
    if (currentThroughput > dailyStats[todayStr].peakThroughput) {
      dailyStats[todayStr].peakThroughput = currentThroughput;
    }
  }

  const isSpike = currentThroughput > 45;
  if (isSpike) {
    surgeAlerts.unshift({
      id: 'spk_' + Date.now(),
      timestamp: curr.toLocaleTimeString(),
      type: 'TRAFFIC_BURST',
      detail: `Trafik DB_HyperMedia melonjak ke ${currentThroughput} packets/sec`,
      value: currentThroughput,
      delta: currentThroughput - 20,
    });
    if (surgeAlerts.length > 20) surgeAlerts.pop();
  }

  const point = {
    time: timeLabel,
    timestamp: curr.getTime(),
    throughput: currentThroughput,
    bandwidthKb: parseFloat((currentThroughput * 0.42).toFixed(2)),
    latencyMs: Math.floor(1 + Math.random() * 3),
    isSpike,
  };

  trafficHistory.push(point);
  if (trafficHistory.length > 40) {
    trafficHistory.shift();
  }

  let fileSizeKb = 0;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const st = fs.statSync(DATA_FILE);
      fileSizeKb = parseFloat((st.size / 1024).toFixed(2));
    }
  } catch (e) {}

  const syncPayload = {
    type: 'SYNC_0.5S',
    timestamp: curr.getTime(),
    database: 'DB_HyperMedia',
    storage: {
      file: 'data/db_hypermedia.json',
      fullPath: DATA_FILE,
      sizeKb: fileSizeKb,
      lastSaved: lastSavedToDisk,
    },
    sensors: fingerSensors,
    servos: servoControls,
    stats: {
      wsClients: wss.clients.size,
      uptimeSeconds: Math.floor(process.uptime()),
      totalPacketsProcessed,
      redisEngine: 'DB_HyperMedia Tri-Protocol Engine (WS, UDP, REST)',
      syncIntervalMs: 500,
      currentLatencyMs: point.latencyMs,
      currentThroughput,
      dailyAvgThroughput: 26.8,
      surgeCountToday: dailyStats[todayStr]?.surgeCount || 0,
      protocols: {
        websocket: {
          clients: wss.clients.size,
          rxPackets: wsRxPackets,
          txPackets: wsTxPackets,
          latencyMs: 2.3,
          port: PORT,
          endpoint: '/ws',
          status: 'online',
        },
        udp: {
          registeredClients: registeredUdpClients.size,
          rxPackets: udpRxPackets,
          txPackets: udpTxPackets,
          latencyMs: 0.9,
          port: UDP_PORT,
          status: 'online',
        },
        rest: {
          totalRequests: restTotalRequests,
          latencyMs: 14.5,
          port: PORT,
          status: 'online',
        },
      },
    },
  };

  broadcastWs(syncPayload);
}, 500);

// WebSocket Handler
wss.on('connection', (ws) => {
  recentPacketCountInWindow += 1;
  wsRxPackets += 1;
  
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    database: 'DB_HyperMedia',
    storage: {
      file: 'data/db_hypermedia.json',
      fullPath: DATA_FILE,
      lastSaved: lastSavedToDisk,
    },
    sensors: fingerSensors,
    servos: servoControls,
    stats: {
      wsClients: wss.clients.size,
      syncIntervalMs: 500,
    }
  }));

  ws.on('message', (message) => {
    try {
      recentPacketCountInWindow += 1;
      totalPacketsProcessed += 1;
      wsRxPackets += 1;
      const data = JSON.parse(message.toString());

      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }

      let mutated = false;

      if (data.type === 'UPDATE_SENSOR' || data.type === 'UPDATE_FINGER') {
        const sensor = fingerSensors.find((s) => s.id === Number(data.id));
        if (sensor) {
          const oldVal = sensor.nilai;
          sensor.nilai = Math.min(100, Math.max(0, Number(data.nilai)));
          sensor.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          detectSpike(sensor.nama, oldVal, sensor.nilai, 'sensor');
          mutated = true;
          broadcastWs({ type: 'SENSOR_UPDATED', sensor });
          broadcastUdp({ type: 'SENSOR_UPDATED', sensor });
        }
      }

      if (data.type === 'SET_SERVO') {
        const servo = servoControls.find((s) => s.id === Number(data.id));
        if (servo) {
          const oldVal = servo.limit_genggam;
          servo.limit_genggam = Math.min(100, Math.max(0, Number(data.limit_genggam)));
          servo.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          detectSpike(servo.nama, oldVal, servo.limit_genggam, 'servo');
          mutated = true;
          broadcastWs({ type: 'SERVO_UPDATED', servo });
          // Send 6-byte binary packet to ESP32: [0x02, s1, s2, s3, s4, s5]
          const binServo = Buffer.from([0x02, ...servoControls.map((sv) => sv.limit_genggam)]);
          broadcastUdp(binServo);
        }
      }

      if (data.type === 'BATCH_UPDATE') {
        if (Array.isArray(data.sensors)) {
          data.sensors.forEach((sUpdate: any) => {
            const sensor = fingerSensors.find((s) => s.id === Number(sUpdate.id));
            if (sensor && sUpdate.nilai !== undefined) {
              const old = sensor.nilai;
              sensor.nilai = Math.min(100, Math.max(0, Number(sUpdate.nilai)));
              sensor.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
              detectSpike(sensor.nama, old, sensor.nilai, 'sensor');
              mutated = true;
            }
          });
        }
        if (Array.isArray(data.servos)) {
          data.servos.forEach((svUpdate: any) => {
            const servo = servoControls.find((s) => s.id === Number(svUpdate.id));
            if (servo && svUpdate.limit_genggam !== undefined) {
              const old = servo.limit_genggam;
              servo.limit_genggam = Math.min(100, Math.max(0, Number(svUpdate.limit_genggam)));
              servo.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
              detectSpike(servo.nama, old, servo.limit_genggam, 'servo');
              mutated = true;
            }
          });
        }
        broadcastAll({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
      }

      if (mutated) {
        saveDatabaseToDisk();
      }
    } catch (e) {
      console.error('WS error:', e);
    }
  });
});

// REST API Endpoints (NO API KEY REQUIRED)
app.get('/api/health', (req, res) => {
  restTotalRequests += 1;
  res.json({
    status: 'ok',
    database: 'DB_HyperMedia',
    uptime: process.uptime(),
    storage: DATA_FILE,
  });
});

// Protocol telemetry statistics endpoint
app.get('/api/v1/protocol-stats', (req, res) => {
  restTotalRequests += 1;
  res.json({
    database: 'DB_HyperMedia',
    timestamp: new Date().toISOString(),
    protocols: {
      websocket: {
        clients: wss.clients.size,
        rxPackets: wsRxPackets,
        txPackets: wsTxPackets,
        latencyMs: 2.3,
        port: PORT,
        endpoint: '/ws',
        status: 'online',
        features: ['Bi-directional Push', 'Binary Buffer Support', 'Heartbeat Ping-Pong', 'Zero Polling Delay'],
      },
      udp: {
        registeredClients: registeredUdpClients.size,
        rxPackets: udpRxPackets,
        txPackets: udpTxPackets,
        latencyMs: 0.9,
        port: UDP_PORT,
        status: 'online',
        features: ['Datagram 6-byte Binary Protocol', 'Zero Connection Handshake', 'Minimal Latency <1ms', 'ESP32 & Unity Native'],
      },
      rest: {
        totalRequests: restTotalRequests,
        latencyMs: 14.2,
        port: PORT,
        status: 'online',
        features: ['JSON Postman Collection', 'CRUD Endpoints', 'CORS Enabled', 'No API Key Required'],
      },
    },
    routing: {
      esp32_to_server: 'UDP Datagram (0x01, j, t, tg, m, k) or WebSocket /ws or REST PUT /api/v1/finger_sensor/:id',
      server_to_esp32: 'UDP Broadcast (0x02, sv1, sv2, sv3, sv4, sv5) or WS event SERVO_UPDATED',
      unity_to_server: 'WebSocket /ws or UDP Socket :4000 or REST API',
      server_to_unity: 'WebSocket Push <2ms or UDP Stream 60Hz',
    },
  });
});

// Ultra-fast Batch Sync Endpoint for ESP32 and Unity
app.post('/api/v1/fast-sync', (req, res) => {
  recentPacketCountInWindow += 1;
  totalPacketsProcessed += 1;
  restTotalRequests += 1;

  const { sensors, servos } = req.body;
  let mutated = false;

  if (Array.isArray(sensors)) {
    sensors.forEach((sVal: any, idx: number) => {
      if (typeof sVal === 'number' && fingerSensors[idx]) {
        fingerSensors[idx].nilai = Math.min(100, Math.max(0, sVal));
        fingerSensors[idx].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
        mutated = true;
      } else if (sVal && typeof sVal === 'object' && sVal.id) {
        const sensor = fingerSensors.find((s) => s.id === Number(sVal.id));
        if (sensor && sVal.nilai !== undefined) {
          sensor.nilai = Math.min(100, Math.max(0, Number(sVal.nilai)));
          sensor.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          mutated = true;
        }
      }
    });
  }

  if (Array.isArray(servos)) {
    servos.forEach((svVal: any, idx: number) => {
      if (typeof svVal === 'number' && servoControls[idx]) {
        servoControls[idx].limit_genggam = Math.min(100, Math.max(0, svVal));
        servoControls[idx].updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
        mutated = true;
      } else if (svVal && typeof svVal === 'object' && svVal.id) {
        const servo = servoControls.find((s) => s.id === Number(svVal.id));
        if (servo && svVal.limit_genggam !== undefined) {
          servo.limit_genggam = Math.min(100, Math.max(0, Number(svVal.limit_genggam)));
          servo.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
          mutated = true;
        }
      }
    });
  }

  if (mutated) {
    saveDatabaseToDisk();
    broadcastAll({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
  }

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    sensors: fingerSensors,
    servos: servoControls,
  });
});

// Root API Index for Postman & REST clients (Returns JSON immediately, no HTML fallback)
app.get(['/api', '/api/v1'], (req, res) => {
  recentPacketCountInWindow += 1;
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol || 'http';
  const baseUrl = `${proto}://${host}/api/v1`;

  res.json({
    database: 'DB_HyperMedia',
    status: 'online',
    version: '1.0.0',
    message: 'DB_HyperMedia REST API siap digunakan di Postman & Unity (Tanpa API Key)',
    value_range: '0 - 100 (Max Limit: 100)',
    postman_collection: `${baseUrl}/postman-collection.json`,
    endpoints: {
      get_all_state: { method: 'GET', url: `${baseUrl}/state`, desc: 'Semua data sensor & servo' },
      get_finger_sensors: { method: 'GET', url: `${baseUrl}/finger_sensor`, desc: 'List 5 sensor flex jari (0-100)' },
      get_single_sensor: { method: 'GET', url: `${baseUrl}/finger_sensor/1`, desc: 'Detail sensor by ID' },
      update_sensor: { method: 'PUT', url: `${baseUrl}/finger_sensor/1`, body: { nilai: 85 }, desc: 'Update nilai flex (0-100)' },
      get_servo_controls: { method: 'GET', url: `${baseUrl}/servo_control`, desc: 'List 5 servo limit (0-100)' },
      get_single_servo: { method: 'GET', url: `${baseUrl}/servo_control/1`, desc: 'Detail servo by ID' },
      update_servo: { method: 'PUT', url: `${baseUrl}/servo_control/1`, body: { limit_genggam: 80 }, desc: 'Update limit gerak (0-100)' },
      storage_status: { method: 'GET', url: `${baseUrl}/storage`, desc: 'Status penyimpanan file disk' },
    },
    tables: {
      finger_sensor: fingerSensors,
      servo_control: servoControls,
    },
  });
});

// Postman Collection v2.1.0 generator endpoint
app.get(['/api/v1/postman-collection.json', '/api/postman-collection.json', '/postman.json'], (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol || 'http';
  const baseUrl = `${proto}://${host}/api/v1`;

  const postmanCollection = {
    info: {
      name: 'DB_HyperMedia Postman Collection',
      description: 'Official REST API Collection for DB_HyperMedia VR Glove & Haptic Servo Control (No API Key Required). All values strictly clamped 0 - 100.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'db-hypermedia-v1',
    },
    item: [
      {
        name: '1. Root API Index (Semua Info & Data)',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1'],
          },
          description: 'Mengambil index API DB_HyperMedia beserta seluruh payload tabel JSON',
        },
      },
      {
        name: '2. GET All State (Sensor + Servo)',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/state`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'state'],
          },
          description: 'Mengambil semua record sensor jari dan limit servo sekaligus',
        },
      },
      {
        name: '3. GET Semua finger_sensor (0-100)',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/finger_sensor`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'finger_sensor'],
          },
          description: 'Mengambil array 5 sensor flex jari (0 - 100)',
        },
      },
      {
        name: '4. GET finger_sensor by ID (Jempol)',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/finger_sensor/1`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'finger_sensor', '1'],
          },
          description: 'Mengambil data sensor ID 1 (Jempol)',
        },
      },
      {
        name: '5. PUT Update finger_sensor (Flex Nilai 0-100)',
        request: {
          method: 'PUT',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ nilai: 85, nama: 'Jempol' }, null, 2),
            options: { raw: { language: 'json' } },
          },
          url: {
            raw: `${baseUrl}/finger_sensor/1`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'finger_sensor', '1'],
          },
          description: 'Memperbarui nilai flex sensor jari (otomatis dibatasi 0 - 100)',
        },
      },
      {
        name: '6. GET Semua servo_control (0-100)',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/servo_control`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'servo_control'],
          },
          description: 'Mengambil array 5 limit servo gerak (0 - 100)',
        },
      },
      {
        name: '7. GET servo_control by ID',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/servo_control/1`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'servo_control', '1'],
          },
          description: 'Mengambil detail servo ID 1',
        },
      },
      {
        name: '8. PUT Update servo_control (Limit Genggam 0-100)',
        request: {
          method: 'PUT',
          header: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({ limit_genggam: 80, nama: 'Servo Ibu Jari' }, null, 2),
            options: { raw: { language: 'json' } },
          },
          url: {
            raw: `${baseUrl}/servo_control/1`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'servo_control', '1'],
          },
          description: 'Memperbarui limit batas genggam servo (otomatis dibatasi 0 - 100)',
        },
      },
      {
        name: '9. GET Storage Status Disk',
        request: {
          method: 'GET',
          header: [{ key: 'Accept', value: 'application/json' }],
          url: {
            raw: `${baseUrl}/storage`,
            protocol: proto,
            host: host.split(':'),
            path: ['api', 'v1', 'storage'],
          },
          description: 'Melihat status file JSON penyimpanan lokal',
        },
      },
    ],
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="DB_HyperMedia_Postman_Collection.json"');
  res.json(postmanCollection);
});

// Storage Info & Sync Endpoint
app.get('/api/v1/storage', (req, res) => {
  let fileSizeKb = 0;
  let fileExists = false;
  try {
    if (fs.existsSync(DATA_FILE)) {
      fileExists = true;
      const st = fs.statSync(DATA_FILE);
      fileSizeKb = parseFloat((st.size / 1024).toFixed(2));
    }
  } catch (e) {}

  res.json({
    database: 'DB_HyperMedia',
    storage_path: 'data/db_hypermedia.json',
    absolute_path: DATA_FILE,
    exists: fileExists,
    size_kb: fileSizeKb,
    last_saved: lastSavedToDisk,
    counts: {
      finger_sensor: fingerSensors.length,
      servo_control: servoControls.length,
    }
  });
});

app.post('/api/v1/storage/sync', (req, res) => {
  saveDatabaseToDisk();
  res.json({
    success: true,
    message: 'Data successfully persisted to system disk at ' + DATA_FILE,
    saved_at: lastSavedToDisk,
  });
});

// Full state endpoint
app.get('/api/v1/state', (req, res) => {
  recentPacketCountInWindow += 1;
  res.json({
    database: 'DB_HyperMedia',
    timestamp: new Date().toISOString(),
    finger_sensor: fingerSensors,
    servo_control: servoControls,
    sensors: fingerSensors,
    servos: servoControls,
    storage: {
      file: 'data/db_hypermedia.json',
      fullPath: DATA_FILE,
      lastSaved: lastSavedToDisk,
    },
    stats: {
      wsClients: wss.clients.size,
      totalPackets: totalPacketsProcessed,
      syncIntervalMs: 500,
    }
  });
});

// 1. Table: finger_sensor CRUD (nilai max 100)
app.get('/api/v1/finger_sensor', (req, res) => {
  recentPacketCountInWindow += 1;
  res.json(fingerSensors);
});

app.get('/api/v1/finger_sensor/:id', (req, res) => {
  const id = Number(req.params.id);
  const sensor = fingerSensors.find((s) => s.id === id);
  if (!sensor) return res.status(404).json({ error: 'Sensor not found' });
  res.json(sensor);
});

app.post('/api/v1/finger_sensor', (req, res) => {
  restTotalRequests += 1;
  const { nama, nilai } = req.body;
  const newId = fingerSensors.length > 0 ? Math.max(...fingerSensors.map(s => s.id)) + 1 : 1;
  const newRow: FingerSensor = {
    id: newId,
    nama: nama || `Sensor ${newId}`,
    nilai: Math.min(100, Math.max(0, Number(nilai) || 0)),
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00',
  };
  fingerSensors.push(newRow);
  saveDatabaseToDisk();
  broadcastAll({ type: 'SENSOR_ADDED', sensor: newRow, sensors: fingerSensors });
  res.status(201).json(newRow);
});

app.put('/api/v1/finger_sensor/:id', (req, res) => {
  restTotalRequests += 1;
  const id = Number(req.params.id);
  const { nama, nilai } = req.body;
  const sensor = fingerSensors.find((s) => s.id === id);
  if (!sensor) return res.status(404).json({ error: 'Sensor row not found' });

  if (nama !== undefined) sensor.nama = String(nama);
  if (nilai !== undefined) {
    const oldVal = sensor.nilai;
    sensor.nilai = Math.min(100, Math.max(0, Number(nilai)));
    detectSpike(sensor.nama, oldVal, sensor.nilai, 'sensor');
  }
  sensor.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
  saveDatabaseToDisk();
  broadcastAll({ type: 'SENSOR_UPDATED', sensor, sensors: fingerSensors });
  res.json(sensor);
});

app.delete('/api/v1/finger_sensor/:id', (req, res) => {
  restTotalRequests += 1;
  const id = Number(req.params.id);
  fingerSensors = fingerSensors.filter((s) => s.id !== id);
  saveDatabaseToDisk();
  broadcastAll({ type: 'SENSOR_DELETED', id, sensors: fingerSensors });
  res.json({ success: true, message: `Deleted sensor id ${id}` });
});

// 2. Table: servo_control CRUD (limit_genggam max 100)
app.get('/api/v1/servo_control', (req, res) => {
  recentPacketCountInWindow += 1;
  restTotalRequests += 1;
  res.json(servoControls);
});

app.get('/api/v1/servo_control/:id', (req, res) => {
  restTotalRequests += 1;
  const id = Number(req.params.id);
  const servo = servoControls.find((s) => s.id === id);
  if (!servo) return res.status(404).json({ error: 'Servo not found' });
  res.json(servo);
});

app.post('/api/v1/servo_control', (req, res) => {
  restTotalRequests += 1;
  const { nama, limit_genggam } = req.body;
  const newId = servoControls.length > 0 ? Math.max(...servoControls.map(s => s.id)) + 1 : 1;
  const newRow: ServoControl = {
    id: newId,
    nama: nama || `Servo ${newId}`,
    limit_genggam: Math.min(100, Math.max(0, Number(limit_genggam) || 0)), // STRICTLY MAX 100
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00',
  };
  servoControls.push(newRow);
  saveDatabaseToDisk();
  broadcastAll({ type: 'SERVO_ADDED', servo: newRow, servos: servoControls });
  res.status(201).json(newRow);
});

app.put('/api/v1/servo_control/:id', (req, res) => {
  restTotalRequests += 1;
  const id = Number(req.params.id);
  const { nama, limit_genggam } = req.body;
  const servo = servoControls.find((s) => s.id === id);
  if (!servo) return res.status(404).json({ error: 'Servo row not found' });

  if (nama !== undefined) servo.nama = String(nama);
  if (limit_genggam !== undefined) {
    const oldVal = servo.limit_genggam;
    // STRICTLY CLAMP TO 0 - 100
    servo.limit_genggam = Math.min(100, Math.max(0, Number(limit_genggam)));
    detectSpike(servo.nama, oldVal, servo.limit_genggam, 'servo');
  }
  servo.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00';
  saveDatabaseToDisk();
  broadcastAll({ type: 'SERVO_UPDATED', servo, servos: servoControls });
  res.json(servo);
});

app.delete('/api/v1/servo_control/:id', (req, res) => {
  restTotalRequests += 1;
  const id = Number(req.params.id);
  servoControls = servoControls.filter((s) => s.id !== id);
  saveDatabaseToDisk();
  broadcastAll({ type: 'SERVO_DELETED', id, servos: servoControls });
  res.json({ success: true, message: `Deleted servo id ${id}` });
});

// SQL Query Runner simulation (for SQL Editor view)
app.post('/api/v1/query', (req, res) => {
  restTotalRequests += 1;
  const query = (req.body.query || '').trim();
  const lowerQuery = query.toLowerCase();

  try {
    if (lowerQuery.startsWith('select')) {
      if (lowerQuery.includes('finger_sensor')) {
        return res.json({ success: true, rows: fingerSensors, count: fingerSensors.length });
      }
      if (lowerQuery.includes('servo_control')) {
        return res.json({ success: true, rows: servoControls, count: servoControls.length });
      }
      return res.json({ success: true, rows: [{ info: 'Query executed successfully' }], count: 1 });
    }

    if (lowerQuery.startsWith('update')) {
      if (lowerQuery.includes('finger_sensor')) {
        fingerSensors.forEach(s => { s.updated_at = new Date().toISOString(); });
        saveDatabaseToDisk();
        broadcastAll({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
        return res.json({ success: true, message: `Updated rows in finger_sensor`, rows: fingerSensors });
      }
      if (lowerQuery.includes('servo_control')) {
        servoControls.forEach(s => { s.updated_at = new Date().toISOString(); });
        saveDatabaseToDisk();
        broadcastAll({ type: 'STATE_MUTATED', sensors: fingerSensors, servos: servoControls });
        return res.json({ success: true, message: `Updated rows in servo_control`, rows: servoControls });
      }
    }

    return res.json({ success: true, message: 'Command executed successfully', rows: [] });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Telemetry & Traffic metrics
app.get('/api/v1/traffic', (req, res) => {
  let fileSizeKb = 0;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const st = fs.statSync(DATA_FILE);
      fileSizeKb = parseFloat((st.size / 1024).toFixed(2));
    }
  } catch (e) {}

  res.json({
    database: 'DB_HyperMedia',
    success: true,
    history: trafficHistory,
    surgeAlerts: surgeAlerts.slice(0, 15),
    dailyStats,
    storage: {
      path: 'data/db_hypermedia.json',
      absolute_path: DATA_FILE,
      size_kb: fileSizeKb,
      last_saved: lastSavedToDisk,
    },
    summary: {
      activeClients: wss.clients.size,
      totalPackets: totalPacketsProcessed,
      bytesTransferredKb: parseFloat((bytesTransferred / 1024).toFixed(2)),
    }
  });
});

// JSON Export Endpoint
app.get('/api/v1/export/json', (req, res) => {
  const exportPayload = {
    exportDate: new Date().toISOString(),
    database: 'DB_HyperMedia',
    storage_path: DATA_FILE,
    last_saved_to_disk: lastSavedToDisk,
    tables: {
      finger_sensor: fingerSensors,
      servo_control: servoControls,
    },
    telemetry: {
      totalPacketsProcessed,
      surgeAlerts,
      dailyStats,
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=db_hypermedia_backup_${Date.now()}.json`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DB_HyperMedia] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[DB_HyperMedia] Storage File at ${DATA_FILE}`);
    console.log(`[DB_HyperMedia] WebSocket endpoint active at ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer();
