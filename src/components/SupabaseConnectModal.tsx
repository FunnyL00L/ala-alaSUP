import React, { useState } from 'react';
import { 
  Radio, 
  X, 
  Copy, 
  Check, 
  Code2, 
  Terminal, 
  Globe, 
  Cpu, 
  CheckCircle2,
  Zap,
  HardDrive
} from 'lucide-react';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'unity' | 'rest' | 'curl'>('unity');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = window.location.origin;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
  const apiUrl = `${origin}/api/v1`;

  const copyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const unityCSharpCode = `// DBHyperMediaClient.cs - Unity C# Realtime Client
// Direct Connection for DB_HyperMedia (NO API KEY REQUIRED)
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

public class DBHyperMediaClient : MonoBehaviour
{
    [Header("DB_HyperMedia Endpoints")]
    public string apiBaseUrl = "${apiUrl}";
    public string wsUrl = "${wsUrl}";

    [Header("Glove Sensor State (0 - 100)")]
    public int[] fingerSensors = new int[5]; // Jempol, Telunjuk, Tengah, Manis, Kelingking
    public int[] servoLimits = new int[5];   // Limit batas 0 - 100

    void Start()
    {
        // 1. Fetch initial state
        StartCoroutine(FetchAllState());
        
        // 2. Start 500ms sync loop
        StartCoroutine(SyncLoop05s());
    }

    IEnumerator SyncLoop05s()
    {
        while (true)
        {
            yield return new WaitForSeconds(0.5f); // 0.5s Realtime sync
            StartCoroutine(FetchServoControls());
        }
    }

    // GET /api/v1/servo_control (No API Key needed)
    public IEnumerator FetchServoControls()
    {
        using (UnityWebRequest req = UnityWebRequest.Get(apiBaseUrl + "/servo_control"))
        {
            yield return req.SendWebRequest();
            if (req.result == UnityWebRequest.Result.Success)
            {
                // Format: [{"id":1,"nama":"Servo Ibu Jari","limit_genggam":80}, ...]
                Debug.Log("Realtime Servos: " + req.downloadHandler.text);
            }
        }
    }

    // PUT /api/v1/finger_sensor/1 (Update Sensor Flexion 0 - 100)
    public IEnumerator SendFingerFlexion(int sensorId, int flexionValue)
    {
        int clamped = Mathf.Clamp(flexionValue, 0, 100);
        string json = "{\\"nilai\\": " + clamped + "}";
        using (UnityWebRequest req = UnityWebRequest.Put(apiBaseUrl + "/finger_sensor/" + sensorId, json))
        {
            req.SetRequestHeader("Content-Type", "application/json");
            yield return req.SendWebRequest();
        }
    }

    // PUT /api/v1/servo_control/1 (Update Servo Limit 0 - 100)
    public IEnumerator SendServoLimit(int servoId, int limitMax)
    {
        int clamped = Mathf.Clamp(limitMax, 0, 100);
        string json = "{\\"limit_genggam\\": " + clamped + "}";
        using (UnityWebRequest req = UnityWebRequest.Put(apiBaseUrl + "/servo_control/" + servoId, json))
        {
            req.SetRequestHeader("Content-Type", "application/json");
            yield return req.SendWebRequest();
        }
    }

    IEnumerator FetchAllState()
    {
        using (UnityWebRequest req = UnityWebRequest.Get(apiBaseUrl + "/state"))
        {
            yield return req.SendWebRequest();
            if (req.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("DB_HyperMedia State: " + req.downloadHandler.text);
            }
        }
    }
}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 font-sans">
      <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl max-w-3xl w-full p-6 shadow-2xl text-xs text-[#ededed] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282828]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#1e2f26] border border-[#2b5942] flex items-center justify-center text-[#3ecf8e]">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight font-mono">Connect to DB_HyperMedia</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[11px] text-[#8e8e8e]">Direct Endpoint Connection</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#1e2f26] text-[#3ecf8e] text-[10px] font-mono font-semibold border border-[#2b5942]">
                  NO API KEY REQUIRED
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#888888] hover:text-white hover:bg-[#252525] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick URL Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          {/* REST API URL Card */}
          <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-[#888888] flex items-center space-x-1.5">
                <Globe className="w-3 h-3 text-[#3ecf8e]" />
                <span>REST API Base URL</span>
              </span>
              <button
                onClick={() => copyText(apiUrl, 'api_base')}
                className="text-[11px] text-[#3ecf8e] hover:underline flex items-center space-x-1 font-mono"
              >
                {copiedSection === 'api_base' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'api_base' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded px-2.5 py-1.5 font-mono text-xs text-[#ededed] truncate">
              {apiUrl}
            </div>
          </div>

          {/* WebSocket URL Card */}
          <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-[#888888] flex items-center space-x-1.5">
                <Zap className="w-3 h-3 text-[#f59e0b]" />
                <span>WebSocket URL (500ms Realtime)</span>
              </span>
              <button
                onClick={() => copyText(wsUrl, 'ws_url')}
                className="text-[11px] text-[#3ecf8e] hover:underline flex items-center space-x-1 font-mono"
              >
                {copiedSection === 'ws_url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'ws_url' ? 'Tersalin' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded px-2.5 py-1.5 font-mono text-xs text-[#ededed] truncate">
              {wsUrl}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-[#282828] mb-3">
          <button
            onClick={() => setActiveTab('unity')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'unity'
                ? 'border-[#3ecf8e] text-[#3ecf8e]'
                : 'border-transparent text-[#888888] hover:text-[#ededed]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Unity C# Script</span>
          </button>

          <button
            onClick={() => setActiveTab('rest')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'rest'
                ? 'border-[#3ecf8e] text-[#3ecf8e]'
                : 'border-transparent text-[#888888] hover:text-[#ededed]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>REST Endpoints</span>
          </button>

          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'curl'
                ? 'border-[#3ecf8e] text-[#3ecf8e]'
                : 'border-transparent text-[#888888] hover:text-[#ededed]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL Examples</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'unity' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8e8e8e]">Siap di-copy langsung ke Unity project:</span>
                <button
                  onClick={() => copyText(unityCSharpCode, 'unity_code')}
                  className="px-2.5 py-1 bg-[#1e2f26] hover:bg-[#28493b] text-[#3ecf8e] border border-[#2b5942] rounded flex items-center space-x-1 font-mono text-[11px]"
                >
                  {copiedSection === 'unity_code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSection === 'unity_code' ? 'Code Tersalin!' : 'Copy C# Script'}</span>
                </button>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-3 font-mono text-xs overflow-x-auto text-[#c5c5c5] max-h-72 leading-relaxed">
                <pre>{unityCSharpCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'rest' && (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#141414] border border-[#282828] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-bold">GET</span>
                    <span className="text-[#ededed]">{apiUrl}/servo_control</span>
                  </div>
                  <button onClick={() => copyText(`${apiUrl}/servo_control`, 'get_servos')} className="text-slate-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] font-sans text-[#777777]">Mengambil seluruh data servo limit (0 - 100)</p>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#282828] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-bold">GET</span>
                    <span className="text-[#ededed]">{apiUrl}/finger_sensor</span>
                  </div>
                  <button onClick={() => copyText(`${apiUrl}/finger_sensor`, 'get_sensors')} className="text-slate-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] font-sans text-[#777777]">Mengambil seluruh 5 sensor jari (0 - 100)</p>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#282828] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">PUT</span>
                    <span className="text-[#ededed]">{apiUrl}/servo_control/:id</span>
                  </div>
                  <button onClick={() => copyText(`curl -X PUT ${apiUrl}/servo_control/1 -H "Content-Type: application/json" -d '{"limit_genggam": 80}'`, 'put_servo')} className="text-slate-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] font-sans text-[#777777]">Update batas limit servo (0 - 100, body: {'{"limit_genggam": 80}'})</p>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#282828] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">PUT</span>
                    <span className="text-[#ededed]">{apiUrl}/finger_sensor/:id</span>
                  </div>
                  <button onClick={() => copyText(`curl -X PUT ${apiUrl}/finger_sensor/1 -H "Content-Type: application/json" -d '{"nilai": 85}'`, 'put_sensor')} className="text-slate-400 hover:text-white">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] font-sans text-[#777777]">Update nilai sensor flex jari (0 - 100, body: {'{"nilai": 85}'})</p>
              </div>
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#121212] border border-[#262626] space-y-2">
                <span className="text-[11px] text-[#888888] font-sans block">1. Fetch semua servo:</span>
                <pre className="text-[#3ecf8e] p-2 bg-[#181818] rounded overflow-x-auto">
{`curl -X GET ${apiUrl}/servo_control`}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-[#121212] border border-[#262626] space-y-2">
                <span className="text-[11px] text-[#888888] font-sans block">2. Mutasi limit genggam servo (maks 100):</span>
                <pre className="text-[#3ecf8e] p-2 bg-[#181818] rounded overflow-x-auto">
{`curl -X PUT ${apiUrl}/servo_control/1 \\
  -H "Content-Type: application/json" \\
  -d '{"limit_genggam": 80}'`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#282828] flex items-center justify-between text-xs text-[#888888]">
          <div className="flex items-center space-x-1.5 text-[#3ecf8e]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>DB_HyperMedia Server Active & Listening</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#242424] hover:bg-[#2c2c2c] text-white font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
