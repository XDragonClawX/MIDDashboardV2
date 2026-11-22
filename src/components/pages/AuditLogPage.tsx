import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { downloadCSV, formatDate, verifyAuditChain } from '../../utils';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronRight, Download } from 'lucide-react';

interface AuditLogPageProps {
  logs: AuditLog[];
}

export default function AuditLogPage({ logs }: AuditLogPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const verification = useMemo(() => verifyAuditChain(logs), [logs]);

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || b.id - a.id
  );

  const filteredLogs = sortedLogs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.details.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q) ||
      (l.hash || '').toLowerCase().includes(q)
    );
  });

  const downloadAuditCSV = () => {
    const headers = [
      'ID',
      'Zeitstempel',
      'Modul',
      'Aktion',
      'Beschreibung',
      'Bearbeiter',
      'PreviousHash',
      'SHA256-Hash',
      'PDF-Hash',
    ];
    const rows = [
      headers,
      ...filteredLogs.map((l) => [
        l.id,
        l.timestamp,
        l.module,
        l.action,
        l.details,
        l.user,
        l.previousHash || '',
        l.hash || '',
        l.pdfHash || '',
      ]),
    ];
    downloadCSV(`MiD-PCT_ERP_GoBD_AuditLog_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Änderungs<span className="bg-zs-signal-gelb px-1 py-0.5 rounded text-zs-blau-schwarz">protokoll (GoBD)</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            SHA-256 Hash-verkettete Revisionshistorie aller Beleg- und Zahlungsänderungen
          </p>
        </div>
        <button
          onClick={downloadAuditCSV}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>GoBD-Log exportieren (.csv)</span>
        </button>
      </div>

      <div
        className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          verification.valid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-red-50 border-red-300 text-red-900'
        }`}
      >
        {verification.valid ? (
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
        )}
        <div>
          <div className="font-bold">
            {verification.valid
              ? `GoBD SHA-256 Hash-Kette vollständig verifiziert (${verification.checkedCount} Einträge, lückenlos)`
              : `Integritätswarnung: Hash-Kette unterbrochen bei Eintrag #${verification.brokenId}`}
          </div>
          <div className="text-[11px] font-mono opacity-80 mt-0.5">
            Jeder Buchungssatz verweist kryptographisch auf den SHA-256-Hash seines Vorgängers (NIST FIPS 180-4).
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap gap-4 items-center">
        <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
        <input
          type="text"
          placeholder="Suchen nach Vorgang, Modul oder SHA-256 Hash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs border border-zinc-300 rounded-md px-3 py-1.5 outline-none focus:border-zs-blau-schwarz w-full sm:w-80"
        />
        <div className="text-xs text-zinc-400 font-mono ml-auto">
          Einträge: <strong>{filteredLogs.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden pb-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider uppercase">
                <th className="p-3 pl-5 w-44">Zeitstempel</th>
                <th className="p-3 w-28">ERP-Modul</th>
                <th className="p-3 w-24">Vorgang</th>
                <th className="p-3">Protokollnotiz &amp; Prüfsummen</th>
                <th className="p-3 w-36">Hash-Kette</th>
                <th className="p-3 w-28">Bearbeiter</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-zinc-400 font-mono">
                    Keine Logfiles vorhanden.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => {
                  const isCreate = l.action.toLowerCase() === 'create';
                  const isDelete = l.action.toLowerCase() === 'delete';
                  const hasDiff = Boolean(l.beforeJson || l.afterJson);
                  const isExpanded = expandedId === l.id;

                  return (
                    <React.Fragment key={l.id}>
                      <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors font-mono text-[11px]">
                        <td className="p-3 pl-5 text-zinc-500">
                          {formatDate(l.timestamp)} &middot;{' '}
                          {new Date(l.timestamp).toLocaleTimeString('de-DE')}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 font-bold">
                            {l.module}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCreate
                                ? 'bg-emerald-50 text-emerald-800'
                                : isDelete
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-700 font-medium font-sans text-xs">
                          <div>{l.details}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {l.pdfHash && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                                PDF SHA-256: {l.pdfHash.slice(0, 14)}...
                              </span>
                            )}
                            {hasDiff && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : l.id)}
                                className="text-[10px] font-mono text-zs-blau-schwarz hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <span>JSON-Diff</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-[10px] text-zinc-500 font-mono">
                          <div title={l.previousHash}>prev: {(l.previousHash || '').slice(0, 8)}</div>
                          <div className="font-bold text-zs-blau-schwarz" title={l.hash}>
                            hash: {(l.hash || '').slice(0, 8)}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-500 font-sans text-xs">{l.user}</td>
                      </tr>
                      {isExpanded && hasDiff && (
                        <tr className="bg-zinc-50/90 border-b border-zinc-200">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-mono">
                              <div className="p-3 rounded bg-white border border-zinc-200">
                                <div className="font-bold text-zinc-500 uppercase mb-1">Vorher (Before)</div>
                                <pre className="whitespace-pre-wrap break-all text-zinc-700">
                                  {l.beforeJson || '– (Neu-Anlage)'}
                                </pre>
                              </div>
                              <div className="p-3 rounded bg-white border border-zinc-200">
                                <div className="font-bold text-zinc-500 uppercase mb-1">Nachher (After)</div>
                                <pre className="whitespace-pre-wrap break-all text-zinc-700">
                                  {l.afterJson || '–'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
