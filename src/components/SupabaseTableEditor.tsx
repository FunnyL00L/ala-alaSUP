import React, { useState } from 'react';
import { 
  Table2, 
  Search, 
  Plus, 
  Filter, 
  RefreshCw, 
  Key, 
  Type, 
  Hash, 
  Clock, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  ChevronDown,
  Sliders,
  SlidersHorizontal,
  HardDrive
} from 'lucide-react';
import { FingerSensor, ServoControl } from '../types';

interface SupabaseTableEditorProps {
  sensors: FingerSensor[];
  servos: ServoControl[];
  onUpdateSensor: (id: number, nilai: number, nama?: string) => void;
  onUpdateServo: (id: number, limit_genggam: number, nama?: string) => void;
  onAddSensor: (nama: string, nilai: number) => void;
  onAddServo: (nama: string, limit_genggam: number) => void;
  onDeleteSensor: (id: number) => void;
  onDeleteServo: (id: number) => void;
}

export const SupabaseTableEditor: React.FC<SupabaseTableEditorProps> = ({
  sensors,
  servos,
  onUpdateSensor,
  onUpdateServo,
  onAddSensor,
  onAddServo,
  onDeleteSensor,
  onDeleteServo,
}) => {
  const [activeTable, setActiveTable] = useState<'finger_sensor' | 'servo_control'>('finger_sensor');
  const [filterQuery, setFilterQuery] = useState('');
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);

  // Editing state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ nama: string; value: number }>({ nama: '', value: 0 });

  // Insert row modal state
  const [insertNama, setInsertNama] = useState('');
  const [insertValue, setInsertValue] = useState(0);

  // Selected row checkboxes
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Tables list - strictly finger_sensor and servo_control
  const tablesList = [
    { 
      id: 'finger_sensor' as const, 
      name: 'finger_sensor', 
      desc: 'Sensor flex jari (0 - 100)', 
      count: sensors.length 
    },
    { 
      id: 'servo_control' as const, 
      name: 'servo_control', 
      desc: 'Limit batas gerak servo (0 - 100)', 
      count: servos.length 
    },
  ];

  const handleStartEdit = (id: number, nama: string, val: number) => {
    setEditingRowId(id);
    setEditFields({ nama, value: Math.min(100, Math.max(0, val)) });
  };

  const handleSaveEdit = (id: number) => {
    const clampedVal = Math.min(100, Math.max(0, Number(editFields.value) || 0));
    if (activeTable === 'servo_control') {
      onUpdateServo(id, clampedVal, editFields.nama);
    } else {
      onUpdateSensor(id, clampedVal, editFields.nama);
    }
    setEditingRowId(null);
  };

  const handleInsertRow = (e: React.FormEvent) => {
    e.preventDefault();
    const clampedVal = Math.min(100, Math.max(0, Number(insertValue) || 0));
    if (activeTable === 'servo_control') {
      onAddServo(insertNama || `Servo Baru ${servos.length + 1}`, clampedVal);
    } else {
      onAddSensor(insertNama || `Sensor Baru ${sensors.length + 1}`, clampedVal);
    }
    setInsertNama('');
    setInsertValue(0);
    setIsInsertModalOpen(false);
  };

  const toggleSelectAll = () => {
    const currentList = activeTable === 'servo_control' ? servos : sensors;
    if (selectedRows.length === currentList.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentList.map(r => r.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  // Filter current rows
  const currentRows = activeTable === 'servo_control'
    ? servos.filter(s => s.nama.toLowerCase().includes(filterQuery.toLowerCase()) || s.id.toString().includes(filterQuery))
    : sensors.filter(s => s.nama.toLowerCase().includes(filterQuery.toLowerCase()) || s.id.toString().includes(filterQuery));

  return (
    <div className="flex-1 flex overflow-hidden bg-[#161616] text-[#ededed]">
      {/* 1. Left Table Navigator: DB_HyperMedia tables */}
      <div className="w-64 bg-[#121212] border-r border-[#242424] flex flex-col shrink-0">
        {/* Schema Header */}
        <div className="p-3 border-b border-[#242424]">
          <div className="flex items-center justify-between text-xs text-[#808080] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Database Schema</span>
            <span className="text-[10px] text-[#3ecf8e] font-mono">DB_HyperMedia</span>
          </div>
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#181818] border border-[#2c2c2c] text-xs font-mono text-[#e0e0e0]">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span>public</span>
            </div>
            <span className="text-[10px] text-[#666666]">2 tables</span>
          </div>
        </div>

        {/* Tables Section Header */}
        <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#808080] uppercase tracking-wider">
            Tables
          </span>
          <span className="text-[10px] font-mono text-[#555555]">
            Max Limit: 100
          </span>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tablesList.map((t) => {
            const isSelected = activeTable === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTable(t.id);
                  setSelectedRows([]);
                  setEditingRowId(null);
                }}
                className={`w-full flex flex-col px-3 py-2 rounded-md text-left transition-all ${
                  isSelected
                    ? 'bg-[#1e2f26] border border-[#2b5942] text-white'
                    : 'text-[#909090] hover:text-[#e0e0e0] hover:bg-[#181818] border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Table2 className={`w-3.5 h-3.5 ${isSelected ? 'text-[#3ecf8e]' : 'text-[#666666]'}`} />
                    <span className="font-mono text-xs font-semibold">{t.name}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-[#15241d] text-[#3ecf8e]' : 'bg-[#1e1e1e] text-[#777777]'
                  }`}>
                    {t.count}
                  </span>
                </div>
                <span className="text-[10px] text-[#666666] mt-0.5 ml-5">
                  {t.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Persistent Storage badge */}
        <div className="p-3 border-t border-[#242424] bg-[#101010]">
          <div className="flex items-center space-x-2 text-[11px] text-[#888888] font-mono">
            <HardDrive className="w-3.5 h-3.5 text-[#3ecf8e]" />
            <div className="flex flex-col">
              <span className="text-white text-[11px] font-medium">Auto-saved to Disk</span>
              <span className="text-[10px] text-[#666666]">data/db_hypermedia.json</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Table Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141414]">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-[#242424] flex flex-wrap items-center justify-between gap-2 bg-[#161616]">
          {/* Table title info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Table2 className="w-4 h-4 text-[#3ecf8e]" />
              <h2 className="text-sm font-bold text-white font-mono">{activeTable}</h2>
            </div>
            <span className="text-[#444444]">|</span>
            <span className="text-xs text-[#808080] font-mono">
              {currentRows.length} baris {filterQuery && `(difilter)`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e2f26] text-[#3ecf8e] border border-[#2b5942] font-mono">
              Rentang Nilai: 0 - 100
            </span>
          </div>

          {/* Controls: Search, Insert Row */}
          <div className="flex items-center space-x-2">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter baris..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#1c1c1c] border border-[#2e2e2e] rounded-md text-xs text-white placeholder-[#666666] focus:outline-hidden focus:border-[#3ecf8e] w-44 font-mono"
              />
            </div>

            {/* Insert Row Button */}
            <button
              onClick={() => {
                setInsertNama(activeTable === 'servo_control' ? `Servo ${servos.length + 1}` : `Sensor ${sensors.length + 1}`);
                setInsertValue(0);
                setIsInsertModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#121212] font-semibold text-xs transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert row</span>
            </button>
          </div>
        </div>

        {/* Table Data Grid */}
        <div className="flex-1 overflow-auto bg-[#141414]">
          <table className="w-full text-left border-collapse font-mono text-xs">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#242424] bg-[#181818] text-[#808080] select-none sticky top-0 z-10">
                <th className="w-10 px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === currentRows.length && currentRows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-[#242424] border-[#383838] text-[#3ecf8e] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5 font-semibold text-[#a0a0a0] w-20">
                  <div className="flex items-center space-x-1.5">
                    <Key className="w-3 h-3 text-[#3ecf8e]" />
                    <span>id</span>
                    <span className="text-[10px] text-[#555555]">int8</span>
                  </div>
                </th>
                <th className="px-4 py-2.5 font-semibold text-[#a0a0a0] w-64">
                  <div className="flex items-center space-x-1.5">
                    <Type className="w-3 h-3 text-sky-400" />
                    <span>nama</span>
                    <span className="text-[10px] text-[#555555]">text</span>
                  </div>
                </th>
                <th className="px-4 py-2.5 font-semibold text-[#a0a0a0] min-w-[280px]">
                  <div className="flex items-center space-x-1.5">
                    <Hash className="w-3 h-3 text-amber-400" />
                    <span>{activeTable === 'servo_control' ? 'limit_genggam (0-100)' : 'nilai (0-100)'}</span>
                    <span className="text-[10px] text-[#555555]">int4 [0-100]</span>
                  </div>
                </th>
                <th className="px-4 py-2.5 font-semibold text-[#a0a0a0] w-60">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>updated_at</span>
                    <span className="text-[10px] text-[#555555]">timestamptz</span>
                  </div>
                </th>
                <th className="px-4 py-2.5 font-semibold text-[#a0a0a0] w-28 text-right">
                  <span>Aksi</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#202020] text-[#d4d4d4]">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#666666]">
                    Tidak ada baris data pada tabel {activeTable}
                  </td>
                </tr>
              ) : (
                currentRows.map((row: any) => {
                  const isEditing = editingRowId === row.id;
                  const isSelected = selectedRows.includes(row.id);
                  const val = activeTable === 'servo_control' ? row.limit_genggam : row.nilai;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#1a1a1a] transition-colors group ${
                        isSelected ? 'bg-[#18261e]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded bg-[#242424] border-[#383838] text-[#3ecf8e] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-4 py-2 text-[#707070] font-mono">
                        {row.id}
                      </td>

                      {/* Nama */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFields.nama}
                            onChange={(e) => setEditFields({ ...editFields, nama: e.target.value })}
                            className="w-full px-2 py-0.5 bg-[#1f1f1f] border border-[#3ecf8e] rounded text-white text-xs focus:outline-hidden"
                            autoFocus
                          />
                        ) : (
                          <span className="text-white font-medium">{row.nama}</span>
                        )}
                      </td>

                      {/* Nilai / Limit (0-100 Slider & Input) */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editFields.value}
                              onChange={(e) => setEditFields({ ...editFields, value: Math.min(100, Math.max(0, Number(e.target.value))) })}
                              className="w-16 px-2 py-0.5 bg-[#1f1f1f] border border-[#3ecf8e] rounded text-white text-xs text-center"
                            />
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={editFields.value}
                              onChange={(e) => setEditFields({ ...editFields, value: Number(e.target.value) })}
                              className="flex-1 accent-[#3ecf8e] h-1.5 bg-[#262626] rounded cursor-pointer"
                            />
                            <span className="text-xs font-bold text-[#3ecf8e] w-8">
                              {editFields.value}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-12 text-left font-bold text-[#3ecf8e]">
                              {val} <span className="text-[10px] text-[#666666]">/100</span>
                            </div>
                            <div className="flex-1 max-w-xs h-2 bg-[#202020] rounded-full overflow-hidden border border-[#2c2c2c]">
                              <div
                                style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                                className={`h-full transition-all duration-150 ${
                                  activeTable === 'servo_control' ? 'bg-amber-400' : 'bg-[#3ecf8e]'
                                }`}
                              ></div>
                            </div>
                            {/* Quick interactive inline slider */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={val}
                              onChange={(e) => {
                                const newVal = Math.min(100, Math.max(0, Number(e.target.value)));
                                if (activeTable === 'servo_control') {
                                  onUpdateServo(row.id, newVal);
                                } else {
                                  onUpdateSensor(row.id, newVal);
                                }
                              }}
                              className="w-24 accent-[#3ecf8e] opacity-30 hover:opacity-100 cursor-pointer h-1.5 bg-[#262626] rounded transition-opacity"
                              title="Tarik untuk ubah langsung (0-100)"
                            />
                          </div>
                        )}
                      </td>

                      {/* Updated At */}
                      <td className="px-4 py-2 text-[#777777] text-[11px]">
                        {row.updated_at}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleSaveEdit(row.id)}
                              className="p-1 rounded bg-[#1e2f26] text-[#3ecf8e] hover:bg-[#28493b]"
                              title="Simpan"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              className="p-1 rounded bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333333]"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(row.id, row.nama, val)}
                              className="p-1 rounded hover:bg-[#262626] text-[#909090] hover:text-white"
                              title="Edit baris"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (activeTable === 'servo_control') {
                                  onDeleteServo(row.id);
                                } else {
                                  onDeleteSensor(row.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-rose-950/40 text-[#909090] hover:text-rose-400"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Status Bar */}
        <div className="px-4 py-2 bg-[#121212] border-t border-[#242424] flex items-center justify-between text-xs text-[#707070] font-mono">
          <div className="flex items-center space-x-3">
            <span>Tabel: <strong className="text-white">public.{activeTable}</strong></span>
            <span>|</span>
            <span>Total: <strong className="text-white">{currentRows.length} baris</strong></span>
            <span>|</span>
            <span>Batas Nilai: <strong className="text-[#3ecf8e]">0 hingga 100</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
            <span>Direct Realtime Sync (500ms)</span>
          </div>
        </div>
      </div>

      {/* Insert Row Modal */}
      {isInsertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-sans">
          <div className="bg-[#171717] border border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-xs text-[#ededed]">
            <div className="px-5 py-3.5 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-bold text-white">Insert Row ke {activeTable}</h3>
              </div>
              <button
                onClick={() => setIsInsertModalOpen(false)}
                className="text-[#888888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertRow} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#a0a0a0] mb-1 font-mono">
                  nama (text)
                </label>
                <input
                  type="text"
                  required
                  value={insertNama}
                  onChange={(e) => setInsertNama(e.target.value)}
                  placeholder={activeTable === 'servo_control' ? 'cth: Servo Kelingking' : 'cth: Jempol'}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#2e2e2e] rounded-md text-white font-mono focus:border-[#3ecf8e] focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 font-mono">
                  <label className="text-xs text-[#a0a0a0]">
                    {activeTable === 'servo_control' ? 'limit_genggam (0 - 100)' : 'nilai (0 - 100)'}
                  </label>
                  <span className="text-xs font-bold text-[#3ecf8e]">{insertValue}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={insertValue}
                  onChange={(e) => setInsertValue(Number(e.target.value))}
                  className="w-full accent-[#3ecf8e] h-2 bg-[#262626] rounded cursor-pointer mb-2"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={insertValue}
                  onChange={(e) => setInsertValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-1.5 bg-[#121212] border border-[#2e2e2e] rounded-md text-white font-mono focus:border-[#3ecf8e] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsInsertModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#242424] hover:bg-[#2a2a2a] text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#121212] font-semibold"
                >
                  Simpan Baris
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
