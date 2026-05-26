import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { downloadCSV, formatDate } from '../../utils';

interface AuditLogPageProps {
  logs: AuditLog[];
}

export default function AuditLogPage({ logs }: AuditLogPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Sorter logs by latest first
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredLogs = sortedLogs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.details.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q)
    );
  });

  const downloadAuditCSV = () => {
    const headers = ['Zeitstempel', 'Modul', 'Aktion', 'Beschreibung', 'Bearbeiter'];
    const rows = [
      headers,
      ...filteredLogs.map((l) => [
        l.timestamp,
        l.module,
        l.action,
        l.details,
        l.user
      ])
    ];
    downloadCSV(`MiD-PCT_ERP_Aenderungsprotokoll_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-zs-blau-schwarz tracking-tight">
            Änderungs<span className="bg-zs-signal-gelb px-1 py-0.5 rounded text-zs-blau-schwarz">protokoll (Audit)</span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Transparente Offenlegung aller Belegänderungen nach den Grundsätzen GoB / GoBD
          </p>
        </div>
        <button
          onClick={downloadAuditCSV}
          className="px-5 py-2 text-xs font-bold rounded-full bg-zs-signal-gelb text-zs-blau-schwarz hover:bg-zs-blau-schwarz hover:text-zs-signal-gelb transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          ⬇️ Verlauf exportieren
        </button>
      </div>

      {/* Filter console bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-wrap gap-4 items-center">
        <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Filter:</span>
        <input
          type="text"
          placeholder="Auszüge suchen (z.B. 'Rechnungsnr', 'Stelle Elena')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs border border-zinc-300 rounded-md px-3 py-1.5 outline-none focus:border-zs-blau-schwarz w-full sm:w-80"
        />
        <div className="text-xs text-zinc-400 font-mono ml-auto">
          Geladene Einträge: <strong>{filteredLogs.length} Buchungen</strong>
        </div>
      </div>

      {/* Database logs console layout */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden pb-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 font-mono text-[9px] text-zinc-400 tracking-wider">
                <th className="p-3 pl-5 w-40">Zeitstempel</th>
                <th className="p-3 w-32">ERP-Modul</th>
                <th className="p-3 w-28">Vorgang</th>
                <th className="p-3">Protokollnotiz</th>
                <th className="p-3 w-32">Zuständigkeit</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-zinc-400 font-mono">Keine Logfiles vorhanden.</td>
                </tr>
              ) : (
                filteredLogs.map((l) => {
                  const isCreate = l.action.toLowerCase() === 'create';
                  const isDelete = l.action.toLowerCase() === 'delete';
                  return (
                    <tr key={l.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors font-mono text-[11px]">
                      <td className="p-3 pl-5 text-zinc-400">{formatDate(l.timestamp)} &middot; {new Date(l.timestamp).toLocaleTimeString('de-DE')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 font-bold">
                          {l.module}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCreate ? 'bg-emerald-50 text-emerald-800' :
                          isDelete ? 'bg-red-50 text-red-00' :
                          'bg-amber-50 text-amber-800'
                        }`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-700 font-medium whitespace-pre-wrap">{l.details}</td>
                      <td className="p-3 text-zinc-500 font-sans">{l.user}</td>
                    </tr>
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
