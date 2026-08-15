import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Database, AlertCircle } from 'lucide-react';

interface SupabaseSqlEditorProps {
  onRunQuerySuccess?: () => void;
}

export const SupabaseSqlEditor: React.FC<SupabaseSqlEditorProps> = () => {
  const [sqlQuery, setSqlQuery] = useState<string>(
    `-- Query DB_HyperMedia Tables\nSELECT * FROM servo_control ORDER BY id ASC;\n\n-- Direct update example (Limit strictly 0-100)\n-- UPDATE finger_sensor SET nilai = 85 WHERE id = 1;\n-- UPDATE servo_control SET limit_genggam = 75 WHERE id = 1;`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>([
    { id: 1, nama: 'Servo Ibu Jari', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.15+00' },
    { id: 2, nama: 'Servo Telunjuk', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.152+00' },
    { id: 3, nama: 'Servo Jari Tengah', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.153+00' },
    { id: 4, nama: 'Servo Jari Manis', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.154+00' },
    { id: 5, nama: 'Servo Kelingking', limit_genggam: 0, updated_at: '2026-08-15 21:38:47.155+00' },
  ]);
  const [message, setMessage] = useState<string | null>('Success: 5 rows returned');
  const [copied, setCopied] = useState(false);

  const quickSnippets = [
    { label: 'Select all servos', sql: 'SELECT * FROM servo_control ORDER BY id ASC;' },
    { label: 'Select all finger sensors', sql: 'SELECT * FROM finger_sensor ORDER BY id ASC;' },
    { label: 'Reset all servo limits to 0', sql: 'UPDATE servo_control SET limit_genggam = 0;' },
    { label: 'Full grip test (all limits 100)', sql: 'UPDATE servo_control SET limit_genggam = 100;' },
  ];

  const handleRunQuery = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      });
      const data = await res.json();
      if (data.rows) {
        setResults(data.rows);
        setMessage(`Success: ${data.rows.length} rows returned/affected`);
      } else {
        setMessage(data.message || 'Query executed successfully');
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#141414] text-[#ededed] overflow-hidden">
      {/* Top SQL Editor Bar */}
      <div className="bg-[#181818] border-b border-[#262626] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#3ecf8e]" />
          <span className="font-semibold text-xs text-white font-mono">DB_HyperMedia SQL Editor</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e2f26] text-[#3ecf8e] border border-[#2b5942]">
            public (finger_sensor, servo_control)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#222222] hover:bg-[#2a2a2a] text-xs text-[#a0a0a0] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleRunQuery}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#121212] font-semibold rounded text-xs transition-colors shadow-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isLoading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Snippet Pills */}
      <div className="bg-[#161616] border-b border-[#242424] px-4 py-1.5 flex items-center space-x-2 overflow-x-auto text-[11px]">
        <span className="text-[#666666] font-mono shrink-0">Quick Queries:</span>
        {quickSnippets.map((snip, idx) => (
          <button
            key={idx}
            onClick={() => setSqlQuery(snip.sql)}
            className="px-2 py-0.5 rounded bg-[#202020] hover:bg-[#282828] text-[#a0a0a0] hover:text-[#ededed] border border-[#2e2e2e] shrink-0 font-mono transition-colors"
          >
            {snip.label}
          </button>
        ))}
      </div>

      {/* Main Split: Textarea + Results */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#262626] bg-[#121212]">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="flex-1 p-4 bg-transparent font-mono text-xs text-[#3ecf8e] placeholder-[#555555] focus:outline-hidden resize-none leading-relaxed"
            placeholder="Ketik query SQL..."
            spellCheck={false}
          />
          {message && (
            <div className="px-4 py-1.5 bg-[#181818] border-t border-[#262626] text-xs font-mono text-[#3ecf8e] flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
          <div className="px-4 py-2 border-b border-[#262626] bg-[#181818] flex items-center justify-between text-xs text-[#808080]">
            <span className="font-mono font-semibold text-white">Results Output</span>
            <span className="font-mono text-[11px]">{results?.length || 0} rows</span>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {results && results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#282828] text-[#808080]">
                      {Object.keys(results[0]).map((key) => (
                        <th key={key} className="py-2 px-3 font-semibold text-white">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020] text-[#c0c0c0]">
                    {results.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#1c1c1c]">
                        {Object.values(row).map((val: any, valIdx) => (
                          <td key={valIdx} className="py-2 px-3 truncate max-w-xs">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#666666] font-mono">
                No results returned
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
