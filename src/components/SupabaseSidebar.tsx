import React from 'react';
import { 
  Table2, 
  Terminal, 
  Activity, 
  Hand, 
  Code2, 
  HardDrive,
  Layers,
  Settings
} from 'lucide-react';
import { ActiveNavTab } from '../types';

interface SupabaseSidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
}

export const SupabaseSidebar: React.FC<SupabaseSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const navItems: Array<{ id: ActiveNavTab; label: string; icon: any }> = [
    { id: 'tri_protocol_hub', label: 'Tri-Protocol Hub (WS/UDP/REST)', icon: Layers },
    { id: 'table_editor', label: 'Table Editor (finger & servo)', icon: Table2 },
    { id: 'unity_glove', label: 'Unity VR Glove (0-100)', icon: Hand },
    { id: 'realtime_traffic', label: 'Realtime & Traffic', icon: Activity },
    { id: 'sql_editor', label: 'SQL Editor', icon: Terminal },
    { id: 'storage_system', label: 'Storage Sistem (Disk)', icon: HardDrive },
    { id: 'connect_api', label: 'API Endpoints (No Key)', icon: Code2 },
  ];

  return (
    <aside className="w-12 bg-[#101010] border-r border-[#222222] flex flex-col justify-between items-center py-2.5 select-none shrink-0 z-30">
      {/* Top Nav Icons */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative group w-9 h-9 rounded-md flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#222222] text-[#3ecf8e] shadow-sm'
                  : 'text-[#777777] hover:text-[#e0e0e0] hover:bg-[#181818]'
              }`}
              title={item.label}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[#3ecf8e] rounded-r"></span>
              )}
              <Icon className="w-4 h-4" />
              
              {/* Tooltip on hover */}
              <div className="absolute left-12 px-2.5 py-1 bg-[#1a1a1a] text-slate-200 border border-[#303030] text-[11px] font-medium rounded shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        <button
          onClick={() => onSelectTab('connect_api')}
          className="w-9 h-9 rounded-md flex items-center justify-center text-[#777777] hover:text-[#d0d0d0] hover:bg-[#181818] transition-colors relative group"
          title="DB_HyperMedia Settings"
        >
          <Settings className="w-4 h-4" />
          <div className="absolute left-12 px-2.5 py-1 bg-[#1a1a1a] text-slate-200 border border-[#303030] text-[11px] rounded shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            DB_HyperMedia Settings
          </div>
        </button>
      </div>
    </aside>
  );
};
