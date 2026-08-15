import React from 'react';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Radio, 
  Database,
  CheckCircle2,
  Cpu,
  BarChart3,
  Calendar
} from 'lucide-react';
import { TrafficPoint, SpikeAlert, SystemStats } from '../types';

interface SupabaseTrafficViewProps {
  stats: SystemStats | null;
  trafficHistory: TrafficPoint[];
  surgeAlerts: SpikeAlert[];
  dailyStats: Record<string, any>;
  isConnected: boolean;
}

export const SupabaseTrafficView: React.FC<SupabaseTrafficViewProps> = ({
  stats,
  trafficHistory,
  surgeAlerts,
  dailyStats,
  isConnected,
}) => {
  const maxThroughput = Math.max(...trafficHistory.map(p => p.throughput), 50);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141414] text-[#ededed] font-sans">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-[#181818] border border-[#282828] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
            <span>Sync Interval</span>
            <Zap className="w-3.5 h-3.5 text-[#3ecf8e]" />
          </div>
          <div className="text-lg font-bold font-mono text-[#3ecf8e]">500ms (0.5s)</div>
          <div className="text-[10px] text-[#777777] mt-0.5">DB_HyperMedia WebSocket Pulse</div>
        </div>

        <div className="p-3 bg-[#181818] border border-[#282828] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
            <span>Current Latency</span>
            <Activity className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {stats?.currentLatencyMs ?? 2} <span className="text-xs text-[#888888]">ms</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Ultra fast in-memory response</div>
        </div>

        <div className="p-3 bg-[#181818] border border-[#282828] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
            <span>Packets Processed</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {stats?.totalPacketsProcessed.toLocaleString() ?? '1,845'}
          </div>
          <div className="text-[10px] text-[#777777] mt-0.5">Throughput: {stats?.currentThroughput ?? 26} pkt/s</div>
        </div>

        <div className="p-3 bg-[#181818] border border-[#282828] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
            <span>Surge / Spikes Today</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {surgeAlerts.length} <span className="text-xs text-[#888888]">events</span>
          </div>
          <div className="text-[10px] text-[#777777] mt-0.5">Delta threshold: &gt;25</div>
        </div>
      </div>

      {/* Real-time Throughput Graph (0.5s resolution) */}
      <div className="p-4 bg-[#181818] border border-[#282828] rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#3ecf8e]" />
            <h3 className="text-xs font-semibold text-white">Realtime Traffic DB_HyperMedia (Packets / Sec)</h3>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono text-[#888888]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span>Normal Traffic</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Traffic Spike</span>
            </span>
          </div>
        </div>

        {/* Live SVG Bar Chart */}
        <div className="h-44 bg-[#121212] border border-[#242424] rounded-lg p-3 flex items-end justify-between gap-1 overflow-hidden">
          {trafficHistory.map((p, idx) => {
            const barHeight = Math.max(8, (p.throughput / maxThroughput) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    p.isSpike
                      ? 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                      : 'bg-[#2b5942] hover:bg-[#3ecf8e]'
                  }`}
                ></div>

                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center bg-[#1e1e1e] border border-[#333333] p-1.5 rounded text-[10px] font-mono z-20 pointer-events-none whitespace-nowrap shadow-xl">
                  <span className="text-white font-bold">{p.throughput} pkt/s</span>
                  <span className="text-[#888888]">{p.latencyMs}ms | {p.bandwidthKb} KB/s</span>
                  <span className="text-[#666666]">{p.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Surge Spike Event Log */}
      <div className="p-4 bg-[#181818] border border-[#282828] rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Surge & Sudden Flex Detection Log</span>
          </h3>
          <span className="text-[10px] font-mono text-[#777777]">Trigger: Δ &ge; 25 unit</span>
        </div>

        <div className="divide-y divide-[#242424] max-h-56 overflow-y-auto font-mono text-xs">
          {surgeAlerts.length === 0 ? (
            <div className="py-6 text-center text-[#666666]">
              Belum ada spike/surge terdeteksi hari ini.
            </div>
          ) : (
            surgeAlerts.map((alert) => (
              <div key={alert.id} className="py-2.5 flex items-center justify-between hover:bg-[#1c1c1c] px-2 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800">
                    {alert.type}
                  </span>
                  <span className="text-[#e0e0e0] font-medium">{alert.detail}</span>
                </div>
                <div className="text-[11px] text-[#777777]">
                  {alert.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
