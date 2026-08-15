import React, { useState } from 'react';
import { X, Download, Copy, Check, FileJson, CheckCircle2, HardDrive } from 'lucide-react';
import { FingerSensor, ServoControl, TrafficPoint, SpikeAlert, SystemStats, StorageInfo } from '../types';

interface JsonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensors: FingerSensor[];
  servos: ServoControl[];
  stats: SystemStats | null;
  surgeAlerts: SpikeAlert[];
  dailyStats: any;
  storageInfo?: StorageInfo | null;
  trafficHistory?: TrafficPoint[];
}

export const JsonExportModal: React.FC<JsonExportModalProps> = ({
  isOpen,
  onClose,
  sensors,
  servos,
  stats,
  surgeAlerts,
  dailyStats,
  storageInfo,
  trafficHistory = [],
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportData = {
    metadata: {
      database: 'DB_HyperMedia',
      exportedAt: new Date().toISOString(),
      storage_location: storageInfo?.fullPath || 'data/db_hypermedia.json',
      schema: 'public',
      protocol: 'WebSocket 500ms (0.5s)',
      engine: 'DB_HyperMedia In-Memory & System File Persistence',
      limits: '0 - 100 (Max Limit: 100)',
      clientTarget: 'Unity C# (DBHyperMediaClient / Haptic Glove)',
    },
    tables: {
      finger_sensor: sensors,
      servo_control: servos,
    },
    telemetry: {
      stats,
      surgeAlerts,
      dailyStats,
      recentTrafficSample: trafficHistory.slice(-15),
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db_hypermedia_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans">
      <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs text-[#ededed]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#282828] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#1e2f26] text-[#3ecf8e] border border-[#2b5942]">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight font-mono">
                Export DB_HyperMedia (JSON Snapshot)
              </h3>
              <p className="text-[11px] text-[#888888] font-mono">
                Tabel public.finger_sensor & public.servo_control (Batas 0 - 100)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#252525] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-2 bg-[#191919] border-b border-[#282828] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#888888]">
            Ukuran Payload: ~{Math.round(jsonString.length / 1024)} KB
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#242424] hover:bg-[#2c2c2c] text-[#dcdcdc] font-mono text-[11px] border border-[#333333] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#3ecf8e]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#121212] font-semibold text-[11px] transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#121212] font-mono text-xs text-[#a0a0a0] leading-relaxed">
          <pre>{jsonString}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#141414] border-t border-[#282828] flex items-center justify-between text-[11px] text-[#777777]">
          <div className="flex items-center space-x-1.5 text-[#3ecf8e]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Format standard JSON kompatibel dengan Unity JsonUtility & REST Client</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#242424] hover:bg-[#2c2c2c] text-white"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
