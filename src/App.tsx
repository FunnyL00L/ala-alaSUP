import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseHeader } from './components/SupabaseHeader';
import { SupabaseSidebar } from './components/SupabaseSidebar';
import { SupabaseTableEditor } from './components/SupabaseTableEditor';
import { SupabaseSqlEditor } from './components/SupabaseSqlEditor';
import { SupabaseTrafficView } from './components/SupabaseTrafficView';
import { SupabaseUnityView } from './components/SupabaseUnityView';
import { StorageSystemView } from './components/StorageSystemView';
import { SupabaseConnectModal } from './components/SupabaseConnectModal';
import { JsonExportModal } from './components/JsonExportModal';
import { 
  FingerSensor, 
  ServoControl, 
  TrafficPoint, 
  SpikeAlert, 
  SystemStats,
  ActiveNavTab,
  StorageInfo 
} from './types';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('table_editor');

  // Database Tables State (Default 5 sensors and 5 servos with max limit 100)
  const [sensors, setSensors] = useState<FingerSensor[]>([
    { id: 1, nama: 'Jempol', nilai: 0, updated_at: '2026-08-15 08:23:45.173+00' },
    { id: 2, nama: 'Telunjuk', nilai: 100, updated_at: '2026-08-15 08:23:45.173+00' },
    { id: 3, nama: 'Tengah', nilai: 100, updated_at: '2026-08-15 08:23:45.173+00' },
    { id: 4, nama: 'Manis', nilai: 100, updated_at: '2026-08-15 08:23:45.173+00' },
    { id: 5, nama: 'Kelingking', nilai: 0, updated_at: '2026-08-15 08:23:45.174+00' },
  ]);

  const [servos, setServos] = useState<ServoControl[]>([
    { id: 1, nama: 'Servo Ibu Jari', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.15+00' },
    { id: 2, nama: 'Servo Telunjuk', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.152+00' },
    { id: 3, nama: 'Servo Jari Tengah', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.153+00' },
    { id: 4, nama: 'Servo Jari Manis', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.154+00' },
    { id: 5, nama: 'Servo Kelingking', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.155+00' },
  ]);

  // Telemetry & WebSocket State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>([]);
  const [surgeAlerts, setSurgeAlerts] = useState<SpikeAlert[]>([]);
  const [dailyStats, setDailyStats] = useState<any>({
    '2026-08-11': { totalPackets: 86400, avgLatencyMs: 3.2, peakThroughput: 54, surgeCount: 4, dataTransferredMb: 36.2 },
    '2026-08-12': { totalPackets: 92300, avgLatencyMs: 2.8, peakThroughput: 62, surgeCount: 7, dataTransferredMb: 38.9 },
    '2026-08-13': { totalPackets: 104500, avgLatencyMs: 3.1, peakThroughput: 78, surgeCount: 11, dataTransferredMb: 44.1 },
    '2026-08-14': { totalPackets: 98200, avgLatencyMs: 2.9, peakThroughput: 59, surgeCount: 5, dataTransferredMb: 41.5 },
    [new Date().toISOString().split('T')[0]]: { totalPackets: 18240, avgLatencyMs: 2.7, peakThroughput: 64, surgeCount: 3, dataTransferredMb: 8.2 },
  });

  // Modals
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Dynamic URLs
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  // WebSocket Connection
  useEffect(() => {
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'SYNC_0.5S' || data.type === 'INIT_STATE') {
              if (data.sensors) setSensors(data.sensors);
              if (data.servos) setServos(data.servos);
              if (data.stats) setStats(data.stats);
              if (data.storage) setStorageInfo(data.storage);
            }

            if (data.type === 'SENSOR_UPDATED' && data.sensor) {
              setSensors((prev) =>
                prev.map((s) => (s.id === data.sensor.id ? data.sensor : s))
              );
            }

            if (data.type === 'SERVO_UPDATED' && data.servo) {
              setServos((prev) =>
                prev.map((sv) => (sv.id === data.servo.id ? data.servo : sv))
              );
            }

            if (data.type === 'STATE_MUTATED') {
              if (data.sensors) setSensors(data.sensors);
              if (data.servos) setServos(data.servos);
              if (data.storage) setStorageInfo(data.storage);
            }

            if (data.type === 'SENSOR_ADDED' && data.sensors) {
              setSensors(data.sensors);
            }

            if (data.type === 'SERVO_ADDED' && data.servos) {
              setServos(data.servos);
            }

            if (data.type === 'SENSOR_DELETED' && data.sensors) {
              setSensors(data.sensors);
            }

            if (data.type === 'SERVO_DELETED' && data.servos) {
              setServos(data.servos);
            }
          } catch (e) {
            console.error('Error handling WS message:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch (e) {
        console.error('WS Connection error:', e);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsUrl]);

  // Periodic Telemetry Poll & Initial State Fetch
  const fetchAllState = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/state');
      if (res.ok) {
        const data = await res.json();
        if (data.sensors) setSensors(data.sensors);
        if (data.servos) setServos(data.servos);
        if (data.stats) setStats(data.stats);
        if (data.storage) setStorageInfo(data.storage);
      }
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAllState();
  }, [fetchAllState]);

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const res = await fetch('/api/v1/traffic');
        if (res.ok) {
          const data = await res.json();
          if (data.history) setTrafficHistory(data.history);
          if (data.surgeAlerts) setSurgeAlerts(data.surgeAlerts);
          if (data.dailyStats) setDailyStats(data.dailyStats);
          if (data.storage) setStorageInfo(data.storage);
        }
      } catch (e) {
        // silent fail
      }
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 1000);
    return () => clearInterval(interval);
  }, []);

  // CRUD Handler: Update Sensor (Clamped strictly to 0-100)
  const handleUpdateSensor = useCallback((id: number, nilai: number, nama?: string) => {
    const clampedVal = Math.min(100, Math.max(0, nilai));
    
    // 1. Optimistic update
    setSensors((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, nilai: clampedVal, nama: nama || s.nama, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' }
          : s
      )
    );

    // 2. Send via WS if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_SENSOR', id, nilai: clampedVal }));
    }

    // 3. Send REST PUT (no headers required)
    fetch(`/api/v1/finger_sensor/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nilai: clampedVal, nama }),
    }).catch((err) => console.error('REST update failed:', err));
  }, []);

  // CRUD Handler: Update Servo (Clamped strictly to 0-100)
  const handleUpdateServo = useCallback((id: number, limit_genggam: number, nama?: string) => {
    const clampedVal = Math.min(100, Math.max(0, limit_genggam));

    // 1. Optimistic update
    setServos((prev) =>
      prev.map((sv) =>
        sv.id === id
          ? { ...sv, limit_genggam: clampedVal, nama: nama || sv.nama, updated_at: new Date().toISOString().replace('T', ' ').substring(0, 23) + '+00' }
          : sv
      )
    );

    // 2. Send via WS if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SET_SERVO', id, limit_genggam: clampedVal }));
    }

    // 3. Send REST PUT
    fetch(`/api/v1/servo_control/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit_genggam: clampedVal, nama }),
    }).catch((err) => console.error('REST update failed:', err));
  }, []);

  // CRUD Handler: Add Sensor (Clamped strictly to 0-100)
  const handleAddSensor = async (nama: string, nilai: number) => {
    const clampedVal = Math.min(100, Math.max(0, nilai));
    try {
      const res = await fetch('/api/v1/finger_sensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, nilai: clampedVal }),
      });
      if (res.ok) {
        const newRow = await res.json();
        setSensors((prev) => [...prev, newRow]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Handler: Add Servo (Clamped strictly to 0-100)
  const handleAddServo = async (nama: string, limit_genggam: number) => {
    const clampedVal = Math.min(100, Math.max(0, limit_genggam));
    try {
      const res = await fetch('/api/v1/servo_control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, limit_genggam: clampedVal }),
      });
      if (res.ok) {
        const newRow = await res.json();
        setServos((prev) => [...prev, newRow]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Handler: Delete Sensor
  const handleDeleteSensor = async (id: number) => {
    setSensors((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/v1/finger_sensor/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  // CRUD Handler: Delete Servo
  const handleDeleteServo = async (id: number) => {
    setServos((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/v1/servo_control/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121212] text-[#ededed] overflow-hidden select-none font-sans">
      {/* 1. Supabase Studio Top Header */}
      <SupabaseHeader
        isConnected={isConnected}
        stats={stats}
        storageInfo={storageInfo}
        onOpenConnect={() => setIsConnectModalOpen(true)}
        onExportJson={() => setIsExportModalOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost Icon Sidebar */}
        <SupabaseSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'connect_api') {
              setIsConnectModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
        />

        {/* View Switcher based on Active Tab */}
        {activeTab === 'table_editor' && (
          <SupabaseTableEditor
            sensors={sensors}
            servos={servos}
            onUpdateSensor={handleUpdateSensor}
            onUpdateServo={handleUpdateServo}
            onAddSensor={handleAddSensor}
            onAddServo={handleAddServo}
            onDeleteSensor={handleDeleteSensor}
            onDeleteServo={handleDeleteServo}
          />
        )}

        {activeTab === 'sql_editor' && (
          <SupabaseSqlEditor />
        )}

        {activeTab === 'realtime_traffic' && (
          <SupabaseTrafficView
            stats={stats}
            trafficHistory={trafficHistory}
            surgeAlerts={surgeAlerts}
            dailyStats={dailyStats}
            isConnected={isConnected}
          />
        )}

        {activeTab === 'unity_glove' && (
          <SupabaseUnityView
            sensors={sensors}
            servos={servos}
            onUpdateSensor={handleUpdateSensor}
            onUpdateServo={handleUpdateServo}
            onOpenConnect={() => setIsConnectModalOpen(true)}
          />
        )}

        {activeTab === 'storage_system' && (
          <StorageSystemView
            sensors={sensors}
            servos={servos}
            storageInfo={storageInfo}
            onRefreshState={fetchAllState}
          />
        )}
      </div>

      {/* 3. Connect & API Modal (Direct URLs, NO API KEY) */}
      <SupabaseConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* 4. JSON Export Modal */}
      <JsonExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sensors={sensors}
        servos={servos}
        stats={stats}
        surgeAlerts={surgeAlerts}
        dailyStats={dailyStats}
        storageInfo={storageInfo}
        trafficHistory={trafficHistory}
      />
    </div>
  );
}
