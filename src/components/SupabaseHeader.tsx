import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Zap, 
  Terminal, 
  ExternalLink, 
  Search, 
  ChevronDown,
  Database,
  Radio,
  HardDrive,
  CheckCircle2
} from 'lucide-react';
import { SystemStats, StorageInfo } from '../types';

interface SupabaseHeaderProps {
  isConnected: boolean;
  stats: SystemStats | null;
  storageInfo?: StorageInfo | null;
  onOpenConnect: () => void;
  onExportJson: () => void;
  onOpenStorage?: () => void;
}

export const SupabaseHeader: React.FC<SupabaseHeaderProps> = ({
  isConnected,
  stats,
  storageInfo,
  onOpenConnect,
  onExportJson,
  onOpenStorage,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const apiUrl = `${window.location.origin}/api/v1`;

  const handleCopyApiUrl = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <header className="bg-[#141414] border-b border-[#242424] text-[#ededed] h-12 flex items-center justify-between px-3 text-xs select-none sticky top-0 z-40">
      {/* Left: DB_HyperMedia Brand & Breadcrumb */}
      <div className="flex items-center space-x-2">
        {/* DB_HyperMedia Logo */}
        <div className="flex items-center space-x-2 pr-2.5 border-r border-[#262626]">
          <div className="w-6 h-6 rounded-md bg-[#1c3327] border border-[#2b5942] flex items-center justify-center text-[#3ecf8e]">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white font-mono">DB_HyperMedia</span>
        </div>

        {/* Breadcrumb Path */}
        <div className="flex items-center space-x-1.5 font-medium">
          <div className="flex items-center space-x-1.5 text-[#e0e0e0] font-semibold px-2 py-1 rounded bg-[#1c1c1c] border border-[#2a2a2a]">
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse"></span>
            <span>public</span>
          </div>

          <span className="text-[#444444]">/</span>

          {/* Tables quick count */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#181818] border border-[#282828] text-[11px] text-[#909090]">
            <span className="font-mono text-[#3ecf8e]">2 tables</span>
            <span className="text-[10px] text-[#666666]">(finger_sensor & servo_control)</span>
          </div>
        </div>
      </div>

      {/* Center/Right: Actions & Realtime Status */}
      <div className="flex items-center space-x-2">
        {/* System Persistent Storage Indicator */}
        <button
          onClick={onOpenStorage}
          className="hidden md:flex items-center space-x-1.5 px-2 py-1 rounded bg-[#181818] hover:bg-[#202020] border border-[#2c2c2c] text-[11px] font-mono text-[#a0a0a0] transition-colors"
          title="Lokasi Penyimpanan Sistem: data/db_hypermedia.json"
        >
          <HardDrive className="w-3 h-3 text-[#3ecf8e]" />
          <span className="text-[#777777]">Storage:</span>
          <span className="text-[#dcdcdc] truncate max-w-[130px]">data/db_hypermedia.json</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#1e2f26] text-[#3ecf8e]">DISK</span>
        </button>

        {/* Realtime 500ms Status */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded bg-[#181818] border border-[#282828] text-[11px] font-mono">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3ecf8e] animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-[#888888]">Realtime:</span>
          <span className="text-[#3ecf8e] font-semibold">500ms (0.5s)</span>
          <span className="text-[#444444]">|</span>
          <span className="text-[#888888]">{stats?.currentLatencyMs ?? 2}ms</span>
        </div>

        {/* Quick Copy API URL (Direct, No Key) */}
        <button
          onClick={handleCopyApiUrl}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#333333] text-[#dcdcdc] font-mono text-[11px] transition-colors"
          title="Salin Link API DB_HyperMedia (Direct, tanpa API key)"
        >
          {copiedUrl ? (
            <>
              <Check className="w-3 h-3 text-[#3ecf8e]" />
              <span className="text-[#3ecf8e]">URL Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Copy API URL</span>
            </>
          )}
        </button>

        {/* Connect Button */}
        <button
          onClick={onOpenConnect}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1b382b] hover:bg-[#234938] border border-[#2a5e45] text-[#3ecf8e] font-semibold text-[11px] transition-colors shadow-xs"
        >
          <Radio className="w-3 h-3" />
          <span>Connect API</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportJson}
          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-slate-300 text-[11px] transition-colors"
          title="Export Database Snapshot JSON"
        >
          <Download className="w-3 h-3 text-sky-400" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
