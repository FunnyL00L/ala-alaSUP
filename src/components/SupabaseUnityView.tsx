import React from 'react';
import { 
  Hand, 
  RotateCcw, 
  Zap, 
  Check, 
  Sparkles,
  Play,
  Sliders,
  HardDrive
} from 'lucide-react';
import { FingerSensor, ServoControl } from '../types';

interface SupabaseUnityViewProps {
  sensors: FingerSensor[];
  servos: ServoControl[];
  onUpdateSensor: (id: number, nilai: number) => void;
  onUpdateServo: (id: number, limit_genggam: number) => void;
  onOpenConnect: () => void;
}

export const SupabaseUnityView: React.FC<SupabaseUnityViewProps> = ({
  sensors,
  servos,
  onUpdateSensor,
  onUpdateServo,
  onOpenConnect,
}) => {
  // Preset Postures with MAX 100 LIMIT
  const applyPreset = (presetName: string) => {
    if (presetName === 'buka') {
      sensors.forEach((s) => onUpdateSensor(s.id, 0));
      servos.forEach((sv) => onUpdateServo(sv.id, 0));
    } else if (presetName === 'genggam') {
      sensors.forEach((s) => onUpdateSensor(s.id, 100));
      servos.forEach((sv) => onUpdateServo(sv.id, 100)); // MAX LIMIT 100
    } else if (presetName === 'pinch') {
      onUpdateSensor(1, 90); // Jempol
      onUpdateSensor(2, 90); // Telunjuk
      onUpdateSensor(3, 10);
      onUpdateSensor(4, 0);
      onUpdateSensor(5, 0);
      onUpdateServo(1, 80);
      onUpdateServo(2, 80);
      onUpdateServo(3, 10);
      onUpdateServo(4, 0);
      onUpdateServo(5, 0);
    } else if (presetName === 'point') {
      onUpdateSensor(1, 75);
      onUpdateSensor(2, 0); // Telunjuk lurus
      onUpdateSensor(3, 100);
      onUpdateSensor(4, 100);
      onUpdateSensor(5, 100);
      onUpdateServo(1, 75);
      onUpdateServo(2, 0);
      onUpdateServo(3, 100);
      onUpdateServo(4, 100);
      onUpdateServo(5, 100);
    }
  };

  const fingerDetails = [
    { id: 1, name: 'Jempol (Thumb)', color: '#38bdf8' },
    { id: 2, name: 'Telunjuk (Index)', color: '#3ecf8e' },
    { id: 3, name: 'Tengah (Middle)', color: '#a855f7' },
    { id: 4, name: 'Manis (Ring)', color: '#f59e0b' },
    { id: 5, name: 'Kelingking (Pinky)', color: '#f43f5e' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141414] text-[#ededed] font-sans">
      {/* Top Banner */}
      <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#1a2f24] border border-[#2b5942] flex items-center justify-center text-[#3ecf8e]">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white font-mono">DB_HyperMedia Simulator</h2>
              <span className="text-[10px] px-2 py-0.2 rounded bg-[#1e2f26] text-[#3ecf8e] border border-[#2b5942] font-mono">
                Limit Max: 100
              </span>
            </div>
            <p className="text-xs text-[#888888] mt-0.5">
              Kontrol sensor flex jari (0-100) dan limit batas genggam servo (0-100) secara realtime 500ms
            </p>
          </div>
        </div>

        {/* Posture Presets */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[11px] text-[#777777] font-mono mr-1">Preset Cepat:</span>
          <button
            onClick={() => applyPreset('buka')}
            className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-xs font-mono text-[#dcdcdc] transition-colors"
          >
            Buka (0%)
          </button>
          <button
            onClick={() => applyPreset('genggam')}
            className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-xs font-mono text-[#dcdcdc] transition-colors"
          >
            Genggam (100%)
          </button>
          <button
            onClick={() => applyPreset('pinch')}
            className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-xs font-mono text-[#dcdcdc] transition-colors"
          >
            Pinch Grip
          </button>
          <button
            onClick={() => applyPreset('point')}
            className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-xs font-mono text-[#dcdcdc] transition-colors"
          >
            Telunjuk (Point)
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Finger Sliders & Glove Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: 5-Finger Controls */}
        <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white flex items-center space-x-2 font-mono">
              <Sliders className="w-4 h-4 text-[#3ecf8e]" />
              <span>Finger Sensors & Servo Limits (0 - 100)</span>
            </h3>
            <span className="text-[10px] font-mono text-[#3ecf8e]">WebSocket Live 0.5s</span>
          </div>

          <div className="space-y-3">
            {fingerDetails.map((f) => {
              const sensor = sensors.find((s) => s.id === f.id) || { nilai: 0 };
              const servo = servos.find((sv) => sv.id === f.id) || { limit_genggam: 0 };

              return (
                <div key={f.id} className="p-3 rounded-lg bg-[#121212] border border-[#242424] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }}></span>
                      <span className="font-semibold text-white">{f.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px]">
                      <span>Sensor: <strong className="text-[#3ecf8e]">{sensor.nilai}</strong><span className="text-[10px] text-[#666666]">/100</span></span>
                      <span>Limit Servo: <strong className="text-amber-400">{servo.limit_genggam}</strong><span className="text-[10px] text-[#666666]">/100</span></span>
                    </div>
                  </div>

                  {/* Sensor Flex Slider (0-100) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#777777] font-mono">
                      <span>Input Flex Sensor (0 - 100)</span>
                      <span className="text-white font-bold">{sensor.nilai}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sensor.nilai}
                      onChange={(e) => onUpdateSensor(f.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full accent-[#3ecf8e] cursor-pointer h-2 bg-[#222222] rounded"
                    />
                  </div>

                  {/* Servo Limit Slider (0-100) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#777777] font-mono">
                      <span>Batas Limit Servo (0 - 100)</span>
                      <span className="text-amber-400 font-bold">{servo.limit_genggam}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={servo.limit_genggam}
                      onChange={(e) => onUpdateServo(f.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-[#222222] rounded"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: SVG Haptic Glove Visualizer & Joint Articulation */}
        <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white flex items-center space-x-2 font-mono">
              <Zap className="w-4 h-4 text-[#3ecf8e]" />
              <span>Glove Kinematics & Haptic Resistance (0-100)</span>
            </h3>
            <button
              onClick={onOpenConnect}
              className="text-[11px] text-[#3ecf8e] hover:underline font-mono"
            >
              Unity C# Snippet ➔
            </button>
          </div>

          {/* Glove SVG Articulation Diagram */}
          <div className="flex-1 bg-[#101010] border border-[#222222] rounded-lg p-4 flex flex-col items-center justify-center min-h-[320px] relative">
            <div className="w-full max-w-[300px] flex justify-between items-end h-52 px-4">
              {fingerDetails.map((f) => {
                const sensor = sensors.find((s) => s.id === f.id) || { nilai: 0 };
                const servo = servos.find((sv) => sv.id === f.id) || { limit_genggam: 0 };
                // 0 is fully extended, 100 is fully flexed
                const flexHeight = 100 - (sensor.nilai * 0.7);
                const isLimitHit = sensor.nilai >= servo.limit_genggam && servo.limit_genggam > 0;

                return (
                  <div key={f.id} className="flex flex-col items-center space-y-1.5 w-11">
                    <div className="text-[10px] font-mono font-bold text-center text-[#888888]">
                      {f.id}
                    </div>

                    {/* Finger Column representation */}
                    <div className={`w-6 h-40 bg-[#161616] rounded-full border relative overflow-hidden flex flex-col justify-end p-0.5 transition-colors ${
                      isLimitHit ? 'border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'border-[#282828]'
                    }`}>
                      <div
                        style={{ height: `${flexHeight}%`, backgroundColor: f.color }}
                        className="w-full rounded-full transition-all duration-200 opacity-90 shadow-sm"
                      ></div>

                      {/* Limit Marker (0-100 scaled) */}
                      <div
                        style={{ bottom: `${servo.limit_genggam}%` }}
                        className="absolute left-0 right-0 h-1 bg-amber-400 z-10 rounded-full"
                        title={`Limit Max: ${servo.limit_genggam}/100`}
                      ></div>
                    </div>

                    <div className="text-[10px] font-mono text-center font-bold text-white">
                      {sensor.nilai}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controller Base */}
            <div className="w-56 h-11 bg-[#181818] border border-[#2a2a2a] rounded-b-2xl mt-1 flex items-center justify-between px-4 text-[10px] font-mono text-[#888888]">
              <span>DB_HyperMedia Base</span>
              <span className="text-[#3ecf8e]">Sync: 500ms</span>
            </div>
          </div>

          <div className="p-3 bg-[#121212] border border-[#222222] rounded-lg flex items-center justify-between text-xs font-mono text-[#888888]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Garis Amber = Batas Limit Servo (0 - 100)</span>
            </div>
            <span className="text-[10px] text-[#666666]">Sistem Persisten File</span>
          </div>
        </div>
      </div>
    </div>
  );
};
