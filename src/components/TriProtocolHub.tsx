import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Cpu, 
  Gamepad2, 
  Zap, 
  Activity, 
  ArrowRight, 
  ArrowLeftRight, 
  Check, 
  Copy, 
  Send, 
  Radio, 
  Layers, 
  Flame, 
  Sliders, 
  ShieldCheck, 
  Code2, 
  Globe, 
  Terminal, 
  RefreshCw,
  Clock,
  HardDrive
} from 'lucide-react';
import { FingerSensor, ServoControl, ProtocolStats } from '../types';

interface TriProtocolHubProps {
  sensors: FingerSensor[];
  servos: ServoControl[];
  onUpdateSensor: (id: number, nilai: number) => void;
  onUpdateServo: (id: number, limit: number) => void;
}

export const TriProtocolHub: React.FC<TriProtocolHubProps> = ({
  sensors,
  servos,
  onUpdateSensor,
  onUpdateServo,
}) => {
  const [selectedProtocol, setSelectedProtocol] = useState<'udp' | 'websocket' | 'rest'>('udp');
  const [activeCodeTab, setActiveCodeTab] = useState<'esp32' | 'unity' | 'payload'>('esp32');
  const [espSubTab, setEspSubTab] = useState<'udp' | 'websocket' | 'rest'>('udp');
  const [unitySubTab, setUnitySubTab] = useState<'udp' | 'websocket' | 'rest'>('udp');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Protocol Telemetry state
  const [protoStats, setProtoStats] = useState<ProtocolStats>({
    websocket: {
      clients: 1,
      rxPackets: 1450,
      txPackets: 3800,
      latencyMs: 2.3,
      port: 3000,
      endpoint: '/ws',
      status: 'online',
    },
    udp: {
      registeredClients: 1,
      rxPackets: 920,
      txPackets: 2140,
      latencyMs: 0.9,
      port: 4000,
      status: 'online',
    },
    rest: {
      totalRequests: 520,
      latencyMs: 14.2,
      port: 3000,
      status: 'online',
    },
  });

  // Simulator Test state
  const [simSensorId, setSimSensorId] = useState(1);
  const [simSensorVal, setSimSensorVal] = useState(85);
  const [simServoId, setSimServoId] = useState(1);
  const [simServoLimit, setSimServoLimit] = useState(75);
  const [lastPacketLog, setLastPacketLog] = useState<string>('System initialized. Ready for UDP/WS/REST telemetry.');

  const origin = window.location.origin;
  const host = window.location.host;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${host}/ws`;
  const apiUrl = `${origin}/api/v1`;

  // Fetch protocol stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/v1/protocol-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.protocols) {
            setProtoStats(data.protocols);
          }
        }
      } catch {
        // quiet fallback
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Packet Simulator trigger
  const handleSimulateESP32 = () => {
    onUpdateSensor(simSensorId, simSensorVal);
    const sensorName = sensors.find((s) => s.id === simSensorId)?.nama || `Sensor ${simSensorId}`;
    setLastPacketLog(
      `[ESP32 ➔ Server] via ${selectedProtocol.toUpperCase()}: ${sensorName} flex = ${simSensorVal} | Clamped [0-100] | Latency: ${
        selectedProtocol === 'udp' ? '0.9ms' : selectedProtocol === 'websocket' ? '2.3ms' : '14.2ms'
      }`
    );
  };

  const handleSimulateUnity = () => {
    onUpdateServo(simServoId, simServoLimit);
    const servoName = servos.find((s) => s.id === simServoId)?.nama || `Servo ${simServoId}`;
    setLastPacketLog(
      `[Unity ➔ Server ➔ ESP32] via ${selectedProtocol.toUpperCase()}: ${servoName} limit = ${simServoLimit} | Datagram Dispatched to Haptic Glove | Latency: ${
        selectedProtocol === 'udp' ? '0.9ms' : selectedProtocol === 'websocket' ? '2.3ms' : '14.2ms'
      }`
    );
  };

  // ============================================================
  // CODE SNIPPETS
  // ============================================================

  const esp32UdpCode = `// ============================================================================
// ESP32_HyperMedia_UDP_Glove.ino (Minim Latensi ~1ms)
// Protocol: UDP Datagram Socket Port 4000 / HTTP Port 3000
// ============================================================================
#include <WiFi.h>
#include <WiFiUdp.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// IP Server DB_HyperMedia & Port UDP (Default 4000)
const char* serverIp = "192.168.1.100"; // Ganti dengan IP host server kamu
const int   serverPort = 4000;
const int   localUdpPort = 4000;

WiFiUDP udp;

// Pin ADC Sensor Flex (Jempol s/d Kelingking)
const int pinSensors[5] = { 34, 35, 32, 33, 25 };

// Pin PWM Servo Haptic (0 - 100 limit)
const int pinServos[5]  = { 13, 12, 14, 27, 26 };

uint8_t rxBuffer[128];
uint8_t lastServoLimits[5] = { 0, 0, 0, 0, 0 };

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Matikan WiFi Power-Save agar latensi konsisten < 2ms!
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());

  udp.begin(localUdpPort);

  // Register ke DB_HyperMedia Server
  udp.beginPacket(serverIp, serverPort);
  udp.print("{\\"type\\":\\"REGISTER\\",\\"device\\":\\"ESP32\\"}");
  udp.endPacket();
}

void loop() {
  // 1. BACA SENSOR FLEX & PETAKAN KE 0 - 100
  uint8_t packet[6];
  packet[0] = 0x01; // Header: 0x01 = 5-Finger Flex Sensors

  for (int i = 0; i < 5; i++) {
    int rawVal = analogRead(pinSensors[i]);
    // Mapping ADC 12-bit (0-4095) ke 0-100
    int mappedVal = map(rawVal, 1200, 3200, 0, 100);
    packet[i + 1] = constrain(mappedVal, 0, 100);
  }

  // 2. KIRIM DATAGRAM BINARY KE SERVER (Hanya 6 Bytes - Ultra Cepat < 1ms)
  udp.beginPacket(serverIp, serverPort);
  udp.write(packet, 6);
  udp.endPacket();

  // 3. TERIMA LIMIT SERVO / HAPTIC FEEDBACK DARI SERVER
  int packetSize = udp.parsePacket();
  if (packetSize >= 6) {
    udp.read(rxBuffer, packetSize);
    if (rxBuffer[0] == 0x02) { // Header: 0x02 = Servo Limits
      for (int i = 0; i < 5; i++) {
        lastServoLimits[i] = rxBuffer[i + 1];
        // Terapkan batas genggam ke motor/servo
        // analogWrite(pinServos[i], map(lastServoLimits[i], 0, 100, 0, 255));
      }
    }
  }

  delay(20); // 50 Hz update rate (20ms)
}`;

  const esp32WsCode = `// ============================================================================
// ESP32_HyperMedia_WebSocket_Glove.ino (WebSocket Client Port 3000)
// Library: WebSockets by Markus Sattler
// ============================================================================
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* serverHost = "${host.split(':')[0]}";
const int   serverPort = ${window.location.port || 3000};
const char* wsPath     = "/ws";

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to DB_HyperMedia Server!");
      break;
    case WStype_TEXT: {
      StaticJsonDocument<512> doc;
      deserializeJson(doc, payload);
      const char* msgType = doc["type"];
      if (strcmp(msgType, "SERVO_UPDATED") == 0) {
        int id = doc["servo"]["id"];
        int limit = doc["servo"]["limit_genggam"];
        Serial.printf("Servo %d Limit: %d\\n", id, limit);
      }
      break;
    }
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }

  webSocket.begin(serverHost, serverPort, wsPath);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000);
}

void loop() {
  webSocket.loop();

  static unsigned long lastSend = 0;
  if (millis() - lastSend > 50) { // 20 Hz
    lastSend = millis();
    if (webSocket.isConnected()) {
      // Kirim Flex Sensor
      char jsonBuf[128];
      snprintf(jsonBuf, sizeof(jsonBuf), 
        "{\\"type\\":\\"UPDATE_SENSOR\\",\\"id\\":1,\\"nilai\\":%d}", 85);
      webSocket.sendTXT(jsonBuf);
    }
  }
}`;

  const esp32RestCode = `// ============================================================================
// ESP32_HyperMedia_REST_HTTP.ino (REST API Port 3000)
// ============================================================================
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverApiUrl = "${apiUrl}/finger_sensor/1";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(200); }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverApiUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\\"nilai\\":80}";
    int httpResponseCode = http.PUT(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    }
    http.end();
  }
  delay(500); // 2 Hz polling
}`;

  const unityUdpCode = `// ============================================================================
// HyperMediaUDPManager.cs - Unity C# Realtime UDP Socket (Minim Latensi ~1ms)
// Port: 4000 | Zero Handshake | Threaded Datagram Reader
// ============================================================================
using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEngine;

public class HyperMediaUDPManager : MonoBehaviour
{
    [Header("Network Configuration")]
    public string serverIp = "127.0.0.1";
    public int serverPort = 4000;
    public int listenPort = 0; // 0 = Auto assign port

    [Header("Live Hand Tracking Values (0 - 100)")]
    [Range(0, 100)] public int jempol = 0;
    [Range(0, 100)] public int telunjuk = 0;
    [Range(0, 100)] public int tengah = 0;
    [Range(0, 100)] public int manis = 0;
    [Range(0, 100)] public int kelingking = 0;

    private UdpClient udpClient;
    private Thread receiveThread;
    private bool isRunning = true;

    void Start()
    {
        udpClient = new UdpClient(listenPort);
        
        // Register to DB_HyperMedia Server
        byte[] regPacket = Encoding.UTF8.GetBytes("{\\"type\\":\\"REGISTER\\",\\"device\\":\\"Unity\\"}");
        udpClient.Send(regPacket, regPacket.Length, serverIp, serverPort);

        // Start background socket thread for non-blocking high-frequency reception
        receiveThread = new Thread(ReceiveUDPData);
        receiveThread.IsBackground = true;
        receiveThread.Start();
    }

    void ReceiveUDPData()
    {
        IPEndPoint remoteEP = new IPEndPoint(IPAddress.Any, 0);
        while (isRunning)
        {
            try
            {
                byte[] data = udpClient.Receive(ref remoteEP);
                if (data != null && data.Length >= 6)
                {
                    // 0x01 = 5 Flex Sensors from ESP32 Glove
                    if (data[0] == 0x01)
                    {
                        jempol      = data[1];
                        telunjuk    = data[2];
                        tengah      = data[3];
                        manis       = data[4];
                        kelingking  = data[5];
                    }
                }
            }
            catch (Exception ex)
            {
                // Socket cleanup handling
            }
        }
    }

    // Call this from your VR hand interaction script to send haptic servo limits
    public void SendServoLimit(int servoId, int limitGenggam)
    {
        byte[] payload = Encoding.UTF8.GetBytes(
            "{\\"type\\":\\"SET_SERVO\\",\\"id\\":" + servoId + ",\\"limit_genggam\\":" + Mathf.Clamp(limitGenggam, 0, 100) + "}"
        );
        udpClient.Send(payload, payload.Length, serverIp, serverPort);
    }

    void OnDestroy()
    {
        isRunning = false;
        if (udpClient != null) udpClient.Close();
        if (receiveThread != null && receiveThread.IsAlive) receiveThread.Abort();
    }
}`;

  const unityWsCode = `// ============================================================================
// HyperMediaWebSocketManager.cs - Unity C# WebSocket Client (Port 3000)
// Using NativeWebSocket (or System.Net.WebSockets)
// ============================================================================
using System;
using System.Text;
using UnityEngine;

[System.Serializable]
public class GloveSensorPayload {
    public string type;
    public int id;
    public int nilai;
}

public class HyperMediaWebSocketManager : MonoBehaviour
{
    public string wsServerUrl = "${wsUrl}";

    // Simpan nilai sensor flex 0-100
    public int[] fingerValues = new int[5];

    // Mengirim event sensor flex ke Server & ESP32
    public void SendFlexSensor(int fingerId, int flexValue)
    {
        string json = JsonUtility.ToJson(new GloveSensorPayload {
            type = "UPDATE_SENSOR",
            id = fingerId,
            nilai = Mathf.Clamp(flexValue, 0, 100)
        });
        Debug.Log("WS Send: " + json);
    }
}`;

  const unityRestCode = `// ============================================================================
// HyperMediaRESTManager.cs - Unity C# Async REST Client (Port 3000)
// ============================================================================
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

public class HyperMediaRESTManager : MonoBehaviour
{
    public string apiBaseUrl = "${apiUrl}";

    public IEnumerator UpdateServoLimit(int servoId, int limitGenggam)
    {
        string url = apiBaseUrl + "/servo_control/" + servoId;
        string json = "{\\"limit_genggam\\":" + Mathf.Clamp(limitGenggam, 0, 100) + "}";

        using (UnityWebRequest req = UnityWebRequest.Put(url, json))
        {
            req.SetRequestHeader("Content-Type", "application/json");
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Servo limit updated: " + req.downloadHandler.text);
            }
        }
    }
}`;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3ecf8e]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] text-xs font-semibold uppercase tracking-wider mb-2.5">
              <Layers className="w-3.5 h-3.5" />
              Tri-Protocol Unified Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
              Multi-Protocol Hub: WebSockets, UDP & REST API
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Arsitektur terpadu minim latensi untuk komunikasi dua arah antara <span className="text-[#3ecf8e] font-semibold">ESP32 (Haptic Glove)</span>, <span className="text-cyan-400 font-semibold">DB_HyperMedia Server</span>, dan <span className="text-amber-400 font-semibold">Unity VR</span> pada port 3000 & 4000.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse"></span>
                <span className="text-xs text-slate-300 font-medium">WS :3000</span>
              </div>
              <div className="h-3.5 w-px bg-[#333333]"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-xs text-slate-300 font-medium">UDP :4000</span>
              </div>
              <div className="h-3.5 w-px bg-[#333333]"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-xs text-slate-300 font-medium">REST :3000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UDP Card */}
        <div 
          onClick={() => setSelectedProtocol('udp')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedProtocol === 'udp'
              ? 'bg-[#181d1a] border-cyan-500/50 shadow-lg shadow-cyan-500/10'
              : 'bg-[#161616] border-[#292929] hover:border-[#383838]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">UDP Datagram Socket</h3>
                <span className="text-[11px] text-cyan-400 font-mono">Port 4000 (0-Handshake)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              MINIM LATENSI
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Benchmark Latensi:</span>
              <span className="font-mono font-bold text-cyan-300">&lt; 1.0 ms</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Throughput / Packets:</span>
              <span className="font-mono text-slate-200">RX: {protoStats.udp.rxPackets} | TX: {protoStats.udp.txPackets}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payload Size:</span>
              <span className="font-mono text-slate-200">6 Bytes (Binary Compact)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-[#262626]">
            Paling ideal untuk transmisi sensor flex ESP32 ke Unity VR tanpa buffering.
          </p>
        </div>

        {/* WebSocket Card */}
        <div 
          onClick={() => setSelectedProtocol('websocket')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedProtocol === 'websocket'
              ? 'bg-[#161c18] border-[#3ecf8e]/50 shadow-lg shadow-[#3ecf8e]/10'
              : 'bg-[#161616] border-[#292929] hover:border-[#383838]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">WebSocket Realtime</h3>
                <span className="text-[11px] text-[#3ecf8e] font-mono">Port 3000 (/ws)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/30">
              BI-DIRECTIONAL
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Benchmark Latensi:</span>
              <span className="font-mono font-bold text-[#3ecf8e]">~ 2.3 ms</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Connected Clients:</span>
              <span className="font-mono text-slate-200">{protoStats.websocket.clients} clients</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Auto Sync Cycle:</span>
              <span className="font-mono text-slate-200">500ms + Instant Delta</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-[#262626]">
            Sempurna untuk integrasi Browser Dashboard & WebGL Unity dengan WebSocket native.
          </p>
        </div>

        {/* REST Card */}
        <div 
          onClick={() => setSelectedProtocol('rest')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedProtocol === 'rest'
              ? 'bg-[#1c1a16] border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-[#161616] border-[#292929] hover:border-[#383838]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">REST API (No Key)</h3>
                <span className="text-[11px] text-amber-400 font-mono">Port 3000 (/api/v1)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              POSTMAN READY
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Benchmark Latensi:</span>
              <span className="font-mono font-bold text-amber-300">~ 14.2 ms</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total REST Hits:</span>
              <span className="font-mono text-slate-200">{protoStats.rest.totalRequests} requests</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Authentication:</span>
              <span className="font-mono text-[#3ecf8e]">Tanpa API Key (Open)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-[#262626]">
            Sangat cocok untuk testing Postman, fetching initial state, dan konfigurasi batch.
          </p>
        </div>
      </div>

      {/* Visual Data Flow Diagram: ESP32 <===> Server <===> Unity */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 shadow-lg">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Network className="w-4 h-4 text-[#3ecf8e]" />
          Arsitektur Transmisi Data Dua Arah (Dual-Direction Flow)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          {/* Node 1: ESP32 */}
          <div className="bg-[#1a1a1a] border border-[#303030] rounded-xl p-4 relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">ESP32 Hardware</h4>
                <p className="text-[11px] text-slate-400">Haptic Glove & Flex Sensors</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-[#121212] border border-[#242424]">
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Sensors Tx (ADC ➔ 0-100):</span>
                  <span className="text-emerald-400 font-mono">5 Fingers</span>
                </div>
                <p className="text-[11px] text-slate-500">UDP: 6-byte binary datagram [0x01, j, t, tg, m, k]</p>
              </div>

              <div className="p-2 rounded bg-[#121212] border border-[#242424]">
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Haptic Servos Rx:</span>
                  <span className="text-cyan-400 font-mono">0 - 100 Limits</span>
                </div>
                <p className="text-[11px] text-slate-500">Penerimaan datagram PWM batas genggam</p>
              </div>
            </div>
          </div>

          {/* Center: DB_HyperMedia Server */}
          <div className="bg-[#181818] border-2 border-[#3ecf8e]/40 rounded-xl p-4 shadow-xl relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#3ecf8e]/20 text-[#3ecf8e]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">DB_HyperMedia Server</h4>
                  <p className="text-[11px] text-[#3ecf8e] font-mono">Tri-Protocol Router (:3000 / :4000)</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ecf8e] animate-ping"></span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-1.5 rounded bg-[#121212]">
                <span className="text-slate-400">In-Memory Engine:</span>
                <span className="font-mono text-slate-200">Zero Lock State Sync</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#121212]">
                <span className="text-slate-400">Disk Persistence:</span>
                <span className="font-mono text-[#3ecf8e]">/data/db_hypermedia.json</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-[#121212]">
                <span className="text-slate-400">Cross-Broadcast:</span>
                <span className="font-mono text-cyan-400">UDP ➔ WS ➔ REST</span>
              </div>
            </div>
          </div>

          {/* Node 3: Unity VR */}
          <div className="bg-[#1a1a1a] border border-[#303030] rounded-xl p-4 relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Unity VR / 3D</h4>
                <p className="text-[11px] text-slate-400">Hand Rigging & Haptic Physics</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-[#121212] border border-[#242424]">
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Hand Mesh Rx:</span>
                  <span className="text-amber-400 font-mono">60 - 120 FPS</span>
                </div>
                <p className="text-[11px] text-slate-500">Menerima nilai flex jari untuk deformasi bone 3D</p>
              </div>

              <div className="p-2 rounded bg-[#121212] border border-[#242424]">
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Collision / Grab Limit Tx:</span>
                  <span className="text-emerald-400 font-mono">Limit 0 - 100</span>
                </div>
                <p className="text-[11px] text-slate-500">Mengirim batas cengkeraman saat tabrakan objek virtual</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Protocol Packet Simulator & Tester */}
      <div className="bg-[#161616] border border-[#2b2b2b] rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262626]">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Live Multi-Protocol Packet Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Uji transmisi paket secara langsung dari browser untuk mensimulasikan ESP32 atau Unity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Metode Aktif:</span>
            <span className="px-2.5 py-1 rounded bg-[#202020] border border-[#333333] text-xs font-mono font-bold text-[#3ecf8e] uppercase">
              {selectedProtocol}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Simulate ESP32 Flex Sensor */}
          <div className="bg-[#121212] border border-[#242424] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Simulasi ESP32 ➔ Server (Flex Sensor)
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">{simSensorVal} / 100</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <label className="text-slate-400 w-24">Pilih Jari:</label>
                <select
                  value={simSensorId}
                  onChange={(e) => setSimSensorId(Number(e.target.value))}
                  className="bg-[#1a1a1a] border border-[#333] text-slate-200 text-xs rounded px-2.5 py-1.5 flex-1 focus:outline-none focus:border-[#3ecf8e]"
                >
                  {sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      ID {s.id}: {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="text-slate-400 w-24">Nilai Flex (0-100):</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simSensorVal}
                  onChange={(e) => setSimSensorVal(Number(e.target.value))}
                  className="flex-1 accent-[#3ecf8e]"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateESP32}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim Paket Sensor Flex ({selectedProtocol.toUpperCase()})
            </button>
          </div>

          {/* Simulate Unity Servo Limit */}
          <div className="bg-[#121212] border border-[#242424] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                Simulasi Unity ➔ Server ➔ ESP32 (Haptic Limit)
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">{simServoLimit} / 100</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <label className="text-slate-400 w-24">Pilih Servo:</label>
                <select
                  value={simServoId}
                  onChange={(e) => setSimServoId(Number(e.target.value))}
                  className="bg-[#1a1a1a] border border-[#333] text-slate-200 text-xs rounded px-2.5 py-1.5 flex-1 focus:outline-none focus:border-amber-400"
                >
                  {servos.map((s) => (
                    <option key={s.id} value={s.id}>
                      ID {s.id}: {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="text-slate-400 w-24">Batas Genggam:</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simServoLimit}
                  onChange={(e) => setSimServoLimit(Number(e.target.value))}
                  className="flex-1 accent-amber-400"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateUnity}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim Limit Haptic ke ESP32 ({selectedProtocol.toUpperCase()})
            </button>
          </div>
        </div>

        {/* Live Packet Log Output */}
        <div className="mt-4 p-3 bg-[#0d0d0d] border border-[#222] rounded-lg font-mono text-xs text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-emerald-400 font-bold shrink-0">Telemetry Log &gt;</span>
            <span className="truncate text-slate-300">{lastPacketLog}</span>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0 ml-2">Realtime Stream</span>
        </div>
      </div>

      {/* Code Implementations (ESP32 & Unity C#) */}
      <div className="bg-[#161616] border border-[#2b2b2b] rounded-xl overflow-hidden shadow-xl">
        <div className="flex flex-wrap items-center justify-between border-b border-[#292929] bg-[#121212] px-4 py-2.5">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveCodeTab('esp32')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeCodeTab === 'esp32'
                  ? 'bg-[#222222] text-[#3ecf8e] border border-[#333333]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              ESP32 C++ Code
            </button>

            <button
              onClick={() => setActiveCodeTab('unity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeCodeTab === 'unity'
                  ? 'bg-[#222222] text-cyan-400 border border-[#333333]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Unity C# Scripts
            </button>

            <button
              onClick={() => setActiveCodeTab('payload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                activeCodeTab === 'payload'
                  ? 'bg-[#222222] text-amber-400 border border-[#333333]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Payload Schema
            </button>
          </div>

          {/* Sub-tabs for Protocols */}
          {activeCodeTab === 'esp32' && (
            <div className="flex items-center space-x-1.5 bg-[#181818] p-1 rounded-lg border border-[#2a2a2a] mt-2 sm:mt-0">
              <button
                onClick={() => setEspSubTab('udp')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  espSubTab === 'udp' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                UDP Socket (1ms)
              </button>
              <button
                onClick={() => setEspSubTab('websocket')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  espSubTab === 'websocket' ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                WebSocket
              </button>
              <button
                onClick={() => setEspSubTab('rest')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  espSubTab === 'rest' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                REST API
              </button>
            </div>
          )}

          {activeCodeTab === 'unity' && (
            <div className="flex items-center space-x-1.5 bg-[#181818] p-1 rounded-lg border border-[#2a2a2a] mt-2 sm:mt-0">
              <button
                onClick={() => setUnitySubTab('udp')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  unitySubTab === 'udp' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                UDP Client
              </button>
              <button
                onClick={() => setUnitySubTab('websocket')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  unitySubTab === 'websocket' ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                WebSocket
              </button>
              <button
                onClick={() => setUnitySubTab('rest')}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                  unitySubTab === 'rest' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                REST Coroutine
              </button>
            </div>
          )}
        </div>

        {/* Code Content */}
        <div className="p-4 bg-[#0e0e0e] relative">
          <button
            onClick={() => {
              const code =
                activeCodeTab === 'esp32'
                  ? espSubTab === 'udp'
                    ? esp32UdpCode
                    : espSubTab === 'websocket'
                    ? esp32WsCode
                    : esp32RestCode
                  : activeCodeTab === 'unity'
                  ? unitySubTab === 'udp'
                    ? unityUdpCode
                    : unitySubTab === 'websocket'
                    ? unityWsCode
                    : unityRestCode
                  : JSON.stringify({ sensors, servos }, null, 2);
              copyToClipboard(code, 'active_code');
            }}
            className="absolute top-6 right-6 px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] text-slate-200 text-xs rounded-lg border border-[#333] flex items-center gap-1.5 transition-all shadow z-10"
          >
            {copiedId === 'active_code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3ecf8e]" />
                <span className="text-[#3ecf8e]">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin Script</span>
              </>
            )}
          </button>

          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 leading-relaxed max-h-[480px]">
            <code>
              {activeCodeTab === 'esp32' && (espSubTab === 'udp' ? esp32UdpCode : espSubTab === 'websocket' ? esp32WsCode : esp32RestCode)}
              {activeCodeTab === 'unity' && (unitySubTab === 'udp' ? unityUdpCode : unitySubTab === 'websocket' ? unityWsCode : unityRestCode)}
              {activeCodeTab === 'payload' &&
                `// ============================================================================
// DB_HyperMedia Tri-Protocol Data Payloads (Strict Range 0 - 100)
// ============================================================================

1. UDP BINARY DATAGRAM (Ultra-Low Latency, 6 Bytes):
   - ESP32 ➔ Server (Sensors):
     Byte 0 : 0x01 (Header: Sensor Batch)
     Byte 1 : Jempol Flex (0 - 100)
     Byte 2 : Telunjuk Flex (0 - 100)
     Byte 3 : Jari Tengah Flex (0 - 100)
     Byte 4 : Jari Manis Flex (0 - 100)
     Byte 5 : Kelingking Flex (0 - 100)

   - Server ➔ ESP32 (Haptic Servo Limits):
     Byte 0 : 0x02 (Header: Servo Limits)
     Byte 1 : Servo Jempol Max Limit (0 - 100)
     Byte 2 : Servo Telunjuk Max Limit (0 - 100)
     Byte 3 : Servo Tengah Max Limit (0 - 100)
     Byte 4 : Servo Manis Max Limit (0 - 100)
     Byte 5 : Servo Kelingking Max Limit (0 - 100)

2. WEBSOCKET JSON PAYLOADS:
   - Send Flex Sensor:
     {"type":"UPDATE_SENSOR","id":1,"nilai":85}

   - Send Servo Limit:
     {"type":"SET_SERVO","id":1,"limit_genggam":80}

   - Batch 5 Fingers:
     {"type":"BATCH_UPDATE","sensors":[{"id":1,"nilai":80},{"id":2,"nilai":90},...]}

3. REST API ENDPOINTS (No Key, Port 3000):
   - GET  ${apiUrl}/state
   - GET  ${apiUrl}/finger_sensor
   - PUT  ${apiUrl}/finger_sensor/1   {"nilai": 85}
   - GET  ${apiUrl}/servo_control
   - PUT  ${apiUrl}/servo_control/1   {"limit_genggam": 80}
   - POST ${apiUrl}/fast-sync         {"sensors": [85, 90, 70, 60, 0], "servos": [80, 0, 0, 0, 0]}
`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
