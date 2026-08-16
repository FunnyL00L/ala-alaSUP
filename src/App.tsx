import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseHeader } from './components/SupabaseHeader';
import { SupabaseSidebar } from './components/SupabaseSidebar';
import { SupabaseTableEditor } from './components/SupabaseTableEditor';
import { SupabaseSqlEditor } from './components/SupabaseSqlEditor';
import { SupabaseTrafficView } from './components/SupabaseTrafficView';
import { SupabaseUnityView } from './components/SupabaseUnityView';
import { StorageSystemView } from './components/StorageSystemView';
import { SupabaseConnectModal } from './components/SupabaseConnectModal';
import { JsonExportModal } from './components/JsonExportModal';
import { TriProtocolHub } from './components/TriProtocolHub';

import {
  FingerSensor,
  ServoControl,
  TrafficPoint,
  SpikeAlert,
  SystemStats,
  ActiveNavTab,
  StorageInfo,
} from './types';

export default function App() {
  // ============================================================
  // NAVIGATION
  // ============================================================

  const [activeTab, setActiveTab] =
    useState<ActiveNavTab>('table_editor');

  // ============================================================
  // SENSOR STATE
  // ============================================================

  const [sensors, setSensors] = useState<FingerSensor[]>([
    {
      id: 1,
      nama: 'Jempol',
      nilai: 0,
      updated_at: '2026-08-15 08:23:45.173+00',
    },
    {
      id: 2,
      nama: 'Telunjuk',
      nilai: 100,
      updated_at: '2026-08-15 08:23:45.173+00',
    },
    {
      id: 3,
      nama: 'Tengah',
      nilai: 100,
      updated_at: '2026-08-15 08:23:45.173+00',
    },
    {
      id: 4,
      nama: 'Manis',
      nilai: 100,
      updated_at: '2026-08-15 08:23:45.173+00',
    },
    {
      id: 5,
      nama: 'Kelingking',
      nilai: 0,
      updated_at: '2026-08-15 08:23:45.174+00',
    },
  ]);

  // ============================================================
  // SERVO STATE
  // ============================================================

  const [servos, setServos] = useState<ServoControl[]>([
    {
      id: 1,
      nama: 'Servo Ibu Jari',
      limit_genggam: 0,
      updated_at: '2026-08-15 21:38:47.15+00',
    },
    {
      id: 2,
      nama: 'Servo Telunjuk',
      limit_genggam: 0,
      updated_at: '2026-08-15 21:38:47.152+00',
    },
    {
      id: 3,
      nama: 'Servo Jari Tengah',
      limit_genggam: 0,
      updated_at: '2026-08-15 21:38:47.153+00',
    },
    {
      id: 4,
      nama: 'Servo Jari Manis',
      limit_genggam: 0,
      updated_at: '2026-08-15 21:38:47.154+00',
    },
    {
      id: 5,
      nama: 'Servo Kelingking',
      limit_genggam: 0,
      updated_at: '2026-08-15 21:38:47.155+00',
    },
  ]);

  // ============================================================
  // CONNECTION + TELEMETRY
  // ============================================================

  const [isConnected, setIsConnected] = useState(false);

  const [stats, setStats] =
    useState<SystemStats | null>(null);

  const [storageInfo, setStorageInfo] =
    useState<StorageInfo | null>(null);

  const [trafficHistory, setTrafficHistory] =
    useState<TrafficPoint[]>([]);

  const [surgeAlerts, setSurgeAlerts] =
    useState<SpikeAlert[]>([]);

  const [dailyStats, setDailyStats] = useState<any>({
    '2026-08-11': {
      totalPackets: 86400,
      avgLatencyMs: 3.2,
      peakThroughput: 54,
      surgeCount: 4,
      dataTransferredMb: 36.2,
    },

    '2026-08-12': {
      totalPackets: 92300,
      avgLatencyMs: 2.8,
      peakThroughput: 62,
      surgeCount: 7,
      dataTransferredMb: 38.9,
    },

    '2026-08-13': {
      totalPackets: 104500,
      avgLatencyMs: 3.1,
      peakThroughput: 78,
      surgeCount: 11,
      dataTransferredMb: 44.1,
    },

    '2026-08-14': {
      totalPackets: 98200,
      avgLatencyMs: 2.9,
      peakThroughput: 59,
      surgeCount: 5,
      dataTransferredMb: 41.5,
    },

    [new Date().toISOString().split('T')[0]]: {
      totalPackets: 18240,
      avgLatencyMs: 2.7,
      peakThroughput: 64,
      surgeCount: 3,
      dataTransferredMb: 8.2,
    },
  });

  // ============================================================
  // MODALS
  // ============================================================

  const [isConnectModalOpen, setIsConnectModalOpen] =
    useState(false);

  const [isExportModalOpen, setIsExportModalOpen] =
    useState(false);

  // ============================================================
  // FETCH ALL STATE
  //
  // WebSocket sudah dihapus.
  // Dashboard sekarang mengambil data melalui REST.
  // ============================================================

  const fetchAllState = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/state', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        setIsConnected(false);
        return;
      }

      const data = await res.json();

      const sensorList = data.sensors || data.finger_sensor;
      if (sensorList && Array.isArray(sensorList)) {
        setSensors(sensorList);
      }

      const servoList = data.servos || data.servo_control;
      if (servoList && Array.isArray(servoList)) {
        setServos(servoList);
      }

      if (data.stats) {
        setStats(data.stats);
      }

      if (data.storage) {
        setStorageInfo(data.storage);
      }

      setIsConnected(true);
    } catch {
      // Gracefully handle temporary server reconnection/offline states
      setIsConnected(false);
    }
  }, []);

  // ============================================================
  // INITIAL FETCH
  // ============================================================

  useEffect(() => {
    fetchAllState();
  }, [fetchAllState]);

  // ============================================================
  // REALTIME REST POLLING
  // ============================================================

  useEffect(() => {
    let destroyed = false;
    let timeout: ReturnType<typeof setTimeout>;

    const pollingLoop = async () => {
      if (destroyed) {
        return;
      }

      await fetchAllState();

      if (!destroyed) {
        timeout = setTimeout(pollingLoop, 300);
      }
    };

    pollingLoop();

    return () => {
      destroyed = true;

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [fetchAllState]);

  // ============================================================
  // TRAFFIC
  // ============================================================

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const res = await fetch('/api/v1/traffic', {
          cache: 'no-store',
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        if (data.history) {
          setTrafficHistory(data.history);
        }

        if (data.surgeAlerts) {
          setSurgeAlerts(data.surgeAlerts);
        }

        if (data.dailyStats) {
          setDailyStats(data.dailyStats);
        }

        if (data.storage) {
          setStorageInfo(data.storage);
        }
      } catch {
        // Silently ignore transient network glitches
      }
    };

    fetchTraffic();

    const interval = setInterval(fetchTraffic, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // UPDATE SENSOR
  //
  // Tidak ada ws.send() lagi.
  // ============================================================

  const handleUpdateSensor = useCallback(
    (
      id: number,
      nilai: number,
      nama?: string
    ) => {
      const clampedVal = Math.min(
        100,
        Math.max(0, nilai)
      );

      // Optimistic UI
      setSensors((prev) =>
        prev.map((sensor) =>
          sensor.id === id
            ? {
                ...sensor,

                nilai: clampedVal,

                nama:
                  nama ||
                  sensor.nama,

                updated_at:
                  new Date()
                    .toISOString()
                    .replace('T', ' ')
                    .substring(0, 23) +
                  '+00',
              }
            : sensor
        )
      );

      // REST update
      fetch(
        `/api/v1/finger_sensor/${id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            nilai: clampedVal,
            nama,
          }),
        }
      ).catch((error) => {
        console.error(
          'Sensor REST update failed:',
          error
        );
      });
    },
    []
  );

  // ============================================================
  // UPDATE SERVO
  // ============================================================

  const handleUpdateServo = useCallback(
    (
      id: number,
      limit_genggam: number,
      nama?: string
    ) => {
      const clampedVal = Math.min(
        100,
        Math.max(0, limit_genggam)
      );

      // Optimistic update
      setServos((prev) =>
        prev.map((servo) =>
          servo.id === id
            ? {
                ...servo,

                limit_genggam:
                  clampedVal,

                nama:
                  nama ||
                  servo.nama,

                updated_at:
                  new Date()
                    .toISOString()
                    .replace('T', ' ')
                    .substring(0, 23) +
                  '+00',
              }
            : servo
        )
      );

      // REST update
      fetch(
        `/api/v1/servo_control/${id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            limit_genggam:
              clampedVal,

            nama,
          }),
        }
      ).catch((error) => {
        console.error(
          'Servo REST update failed:',
          error
        );
      });
    },
    []
  );

  // ============================================================
  // ADD SENSOR
  // ============================================================

  const handleAddSensor = async (
    nama: string,
    nilai: number
  ) => {
    const clampedVal = Math.min(
      100,
      Math.max(0, nilai)
    );

    try {
      const res = await fetch(
        '/api/v1/finger_sensor',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            nama,
            nilai: clampedVal,
          }),
        }
      );

      if (res.ok) {
        const newRow =
          await res.json();

        setSensors((prev) => [
          ...prev,
          newRow,
        ]);
      }
    } catch (error) {
      console.error(
        'Add sensor error:',
        error
      );
    }
  };

  // ============================================================
  // ADD SERVO
  // ============================================================

  const handleAddServo = async (
    nama: string,
    limit_genggam: number
  ) => {
    const clampedVal = Math.min(
      100,
      Math.max(0, limit_genggam)
    );

    try {
      const res = await fetch(
        '/api/v1/servo_control',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            nama,

            limit_genggam:
              clampedVal,
          }),
        }
      );

      if (res.ok) {
        const newRow =
          await res.json();

        setServos((prev) => [
          ...prev,
          newRow,
        ]);
      }
    } catch (error) {
      console.error(
        'Add servo error:',
        error
      );
    }
  };

  // ============================================================
  // DELETE SENSOR
  // ============================================================

  const handleDeleteSensor = async (
    id: number
  ) => {
    setSensors((prev) =>
      prev.filter(
        (sensor) => sensor.id !== id
      )
    );

    try {
      await fetch(
        `/api/v1/finger_sensor/${id}`,
        {
          method: 'DELETE',
        }
      );
    } catch (error) {
      console.error(
        'Delete sensor error:',
        error
      );
    }
  };

  // ============================================================
  // DELETE SERVO
  // ============================================================

  const handleDeleteServo = async (
    id: number
  ) => {
    setServos((prev) =>
      prev.filter(
        (servo) => servo.id !== id
      )
    );

    try {
      await fetch(
        `/api/v1/servo_control/${id}`,
        {
          method: 'DELETE',
        }
      );
    } catch (error) {
      console.error(
        'Delete servo error:',
        error
      );
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="h-screen w-screen flex flex-col bg-[#121212] text-[#ededed] overflow-hidden select-none font-sans">

      <SupabaseHeader
        isConnected={isConnected}
        stats={stats}
        storageInfo={storageInfo}
        onOpenConnect={() =>
          setIsConnectModalOpen(true)
        }
        onExportJson={() =>
          setIsExportModalOpen(true)
        }
      />

      <div className="flex-1 flex overflow-hidden">

        <SupabaseSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (
              tab ===
              'connect_api'
            ) {
              setIsConnectModalOpen(
                true
              );
            } else {
              setActiveTab(tab);
            }
          }}
        />

        {activeTab ===
          'tri_protocol_hub' && (
          <TriProtocolHub
            sensors={sensors}
            servos={servos}
            onUpdateSensor={
              handleUpdateSensor
            }
            onUpdateServo={
              handleUpdateServo
            }
          />
        )}

        {activeTab ===
          'table_editor' && (
          <SupabaseTableEditor
            sensors={sensors}
            servos={servos}
            onUpdateSensor={
              handleUpdateSensor
            }
            onUpdateServo={
              handleUpdateServo
            }
            onAddSensor={
              handleAddSensor
            }
            onAddServo={
              handleAddServo
            }
            onDeleteSensor={
              handleDeleteSensor
            }
            onDeleteServo={
              handleDeleteServo
            }
          />
        )}

        {activeTab ===
          'sql_editor' && (
          <SupabaseSqlEditor />
        )}

        {activeTab ===
          'realtime_traffic' && (
          <SupabaseTrafficView
            stats={stats}
            trafficHistory={
              trafficHistory
            }
            surgeAlerts={
              surgeAlerts
            }
            dailyStats={
              dailyStats
            }
            isConnected={
              isConnected
            }
          />
        )}

        {activeTab ===
          'unity_glove' && (
          <SupabaseUnityView
            sensors={sensors}
            servos={servos}
            onUpdateSensor={
              handleUpdateSensor
            }
            onUpdateServo={
              handleUpdateServo
            }
            onOpenConnect={() =>
              setIsConnectModalOpen(
                true
              )
            }
          />
        )}

        {activeTab ===
          'storage_system' && (
          <StorageSystemView
            sensors={sensors}
            servos={servos}
            storageInfo={
              storageInfo
            }
            onRefreshState={
              fetchAllState
            }
          />
        )}

      </div>

      <SupabaseConnectModal
        isOpen={
          isConnectModalOpen
        }
        onClose={() =>
          setIsConnectModalOpen(
            false
          )
        }
      />

      <JsonExportModal
        isOpen={
          isExportModalOpen
        }
        onClose={() =>
          setIsExportModalOpen(
            false
          )
        }
        sensors={sensors}
        servos={servos}
        stats={stats}
        surgeAlerts={
          surgeAlerts
        }
        dailyStats={
          dailyStats
        }
        storageInfo={
          storageInfo
        }
        trafficHistory={
          trafficHistory
        }
      />

    </div>
  );
}