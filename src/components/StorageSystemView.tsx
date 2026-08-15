import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileJson, 
  FolderCheck, 
  Server, 
  Database,
  ArrowDownToLine,
  RotateCcw
} from 'lucide-react';
import { FingerSensor, ServoControl, StorageInfo } from '../types';

interface StorageSystemViewProps {
  sensors: FingerSensor[];
  servos: ServoControl[];
  storageInfo?: StorageInfo | null;
  onRefreshState?: () => void;
}

export const StorageSystemView: React.FC<StorageSystemViewProps> = ({
  sensors,
  servos,
  storageInfo,
  onRefreshState,
}) => {
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const rawJsonContent = JSON.stringify({
    database: 'DB_HyperMedia',
    version: '1.0.0',
    storage_location: storageInfo?.fullPath || 'data/db_hypermedia.json',
    last_saved: storageInfo?.lastSaved || new Date().toISOString(),
    finger_sensor: sensors,
    servo_control: servos,
  }, null, 2);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(storageInfo?.fullPath || 'data/db_hypermedia.json');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/v1/storage/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(`Tersimpan ke disk: ${new Date().toLocaleTimeString()}`);
        if (onRefreshState) onRefreshState();
      }
    } catch (e) {
      setSyncStatus('Gagal menyimpan');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([rawJsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `db_hypermedia_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141414] text-[#ededed] font-sans">
      {/* Header Info */}
      <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#1a2f24] border border-[#2b5942] flex items-center justify-center text-[#3ecf8e]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-mono">Penyimpanan Sistem DB_HyperMedia</h2>
              <span className="text-[10px] px-2 py-0.2 rounded bg-[#1e2f26] text-[#3ecf8e] border border-[#2b5942] font-mono">
                PERSISTENT DISK
              </span>
            </div>
            <p className="text-xs text-[#888888] mt-0.5">
              Semua perubahan nilai sensor dan limit servo tersimpan otomatis di disk sistem file JSON.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#1f382b] hover:bg-[#284a39] border border-[#2d5f47] text-[#3ecf8e] text-xs font-semibold font-mono transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyimpan...' : 'Simpan ke Disk'}</span>
          </button>
          <button
            onClick={handleDownloadBackup}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download Backup</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-3 rounded-lg bg-[#18261e] border border-[#2b5942] text-xs text-[#3ecf8e] flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Storage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: File Location */}
        <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs text-[#808080]">
            <span>Lokasi File di Sistem</span>
            <FolderCheck className="w-4 h-4 text-[#3ecf8e]" />
          </div>
          <div className="text-xs font-bold text-white bg-[#121212] p-2 rounded border border-[#222222] truncate flex items-center justify-between">
            <span className="text-[#3ecf8e]">{storageInfo?.file || 'data/db_hypermedia.json'}</span>
            <button onClick={handleCopyPath} className="text-[#888888] hover:text-white ml-2">
              {copied ? <Check className="w-3.5 h-3.5 text-[#3ecf8e]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-[10px] text-[#666666]">
            File lokal di dalam workspace container
          </div>
        </div>

        {/* Card 2: Records Count */}
        <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs text-[#808080]">
            <span>Tabel & Record Aktif</span>
            <Database className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="p-2 bg-[#121212] rounded border border-[#222222] flex-1 text-center">
              <div className="text-[10px] text-[#808080]">finger_sensor</div>
              <div className="text-base font-bold text-[#3ecf8e]">{sensors.length} baris</div>
            </div>
            <div className="p-2 bg-[#121212] rounded border border-[#222222] flex-1 text-center">
              <div className="text-[10px] text-[#808080]">servo_control</div>
              <div className="text-base font-bold text-amber-400">{servos.length} baris</div>
            </div>
          </div>
          <div className="text-[10px] text-[#666666]">
            Batas limit nilai valid: 0 sampai 100
          </div>
        </div>

        {/* Card 3: Storage Engine & Sync Status */}
        <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs text-[#808080]">
            <span>Status Penyimpanan</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between text-[#a0a0a0]">
              <span>Sinkronisasi:</span>
              <strong className="text-[#3ecf8e]">Realtime 500ms</strong>
            </div>
            <div className="flex justify-between text-[#a0a0a0]">
              <span>Ukuran File:</span>
              <strong className="text-white">{storageInfo?.sizeKb ?? '~1.2'} KB</strong>
            </div>
            <div className="flex justify-between text-[#a0a0a0]">
              <span>Format:</span>
              <strong className="text-white">JSON UTF-8</strong>
            </div>
          </div>
          <div className="text-[10px] text-[#666666]">
            Otomatis ter-update setiap kali ada PUT/POST/WS
          </div>
        </div>
      </div>

      {/* Raw JSON File Content Preview */}
      <div className="bg-[#181818] border border-[#262626] rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-[#161616] border-b border-[#242424] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-2">
            <FileJson className="w-4 h-4 text-[#3ecf8e]" />
            <span className="font-semibold text-white">Preview Isi File: data/db_hypermedia.json</span>
          </div>
          <span className="text-[11px] text-[#888888]">Live Sync</span>
        </div>
        <div className="p-4 bg-[#101010] overflow-auto max-h-96 font-mono text-xs text-[#a0a0a0] leading-relaxed">
          <pre>{rawJsonContent}</pre>
        </div>
      </div>
    </div>
  );
};
