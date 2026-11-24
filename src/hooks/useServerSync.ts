import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

export type ServerSyncStatus = 'synced' | 'saving' | 'offline' | 'conflict';

interface Options {
  /** Der Stand wurde ins Offline-HTML eingebettet – dann gibt es keinen Server-Abgleich. */
  isInjected: boolean;
  buildStatePayload: () => unknown;
  applyFullStateSnapshot: (snap: any, logSnapshot?: boolean) => void;
  /** Wird gesetzt, wenn ein Stand eingespielt wurde (der nächste Auto-Push entfällt dann). */
  skipNextPushRef: MutableRefObject<boolean>;
  /** Erst nach der ersten Server-Prüfung true (vorher kein Auto-Push). */
  isMountedRef: MutableRefObject<boolean>;
  /** Alle Datenstände, bei deren Änderung automatisch gespeichert wird (feste Länge!). */
  dataDeps: unknown[];
}

/** Hybrid-Persistenz: Stand beim Start vom Server holen, Änderungen verzögert zurückschreiben. */
export function useServerSync({
  isInjected,
  buildStatePayload,
  applyFullStateSnapshot,
  skipNextPushRef,
  isMountedRef,
  dataDeps,
}: Options) {
  // Server Hybrid Persistence status
  const [serverSyncStatus, setServerSyncStatus] = useState<ServerSyncStatus>('offline');
  const [lastServerSync, setLastServerSync] = useState<string | null>(null);
  // Letzter bekannter Server-Stand (für die Versionsprüfung beim Speichern, ohne veraltete Closure)
  const lastServerSyncRef = useRef<string | null>(null);
  const markServerSynced = (iso: string) => {
    lastServerSyncRef.current = iso;
    setLastServerSync(iso);
  };

  // Initial server hydration check (only when served via http(s) and no offline injection)
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.protocol === 'file:' || isInjected) {
      setServerSyncStatus('offline');
      isMountedRef.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) {
          if (!cancelled) setServerSyncStatus('offline');
          isMountedRef.current = true;
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.state) {
          const localLastModified = localStorage.getItem('midpct_last_local_modified') || '';
          const serverUpdatedAt = data.updatedAt || data.state.updatedAt || '';
          if (!localLastModified || (serverUpdatedAt && serverUpdatedAt > localLastModified)) {
            applyFullStateSnapshot(data.state, false);
          }
          markServerSynced(serverUpdatedAt || new Date().toISOString());
          setServerSyncStatus('synced');
        } else {
          // Server has no file yet: seed it immediately with current client state
          const pushRes = await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: buildStatePayload() }),
          });
          if (pushRes.ok) {
            const pData = await pushRes.json();
            markServerSynced(pData.updatedAt || new Date().toISOString());
            setServerSyncStatus('synced');
          } else {
            setServerSyncStatus('offline');
          }
        }
      } catch {
        if (!cancelled) setServerSyncStatus('offline');
      } finally {
        isMountedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-push to /api/state whenever data changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    localStorage.setItem('midpct_last_local_modified', new Date().toISOString());

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return;
    }

    setServerSyncStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: buildStatePayload(),
            baseUpdatedAt: lastServerSyncRef.current,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          markServerSynced(data.updatedAt || new Date().toISOString());
          setServerSyncStatus('synced');
        } else if (res.status === 409) {
          // Neuerer Stand auf dem Server: nicht überschreiben, Nutzer entscheidet in den Einstellungen
          setServerSyncStatus('conflict');
        } else {
          setServerSyncStatus('offline');
        }
      } catch {
        setServerSyncStatus('offline');
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dataDeps);

  const handleSyncWithServer = async (direction: 'push' | 'pull'): Promise<{ ok: boolean; message: string }> => {
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return { ok: false, message: 'Im Offline-HTML-Modus (file://) steht kein lokaler Express-Server zur Verfügung.' };
    }
    try {
      if (direction === 'push') {
        setServerSyncStatus('saving');
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: buildStatePayload() }),
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Anmeldung am Server erforderlich.');
          throw new Error('Serverfehler beim Speichern');
        }
        const data = await res.json();
        markServerSynced(data.updatedAt || new Date().toISOString());
        setServerSyncStatus('synced');
        return { ok: true, message: `Server-Persistenz erfolgreich aktualisiert (data/midpct_db.json).` };
      } else {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Server nicht erreichbar');
        const data = await res.json();
        if (!data?.state) {
          return { ok: false, message: 'Auf dem Server existiert noch kein gespeicherter Stand.' };
        }
        applyFullStateSnapshot(data.state, false);
        markServerSynced(data.updatedAt || new Date().toISOString());
        setServerSyncStatus('synced');
        return { ok: true, message: 'Datenstand erfolgreich aus Server-Datenbank (data/midpct_db.json) geladen.' };
      }
    } catch (err: any) {
      setServerSyncStatus('offline');
      return { ok: false, message: err?.message || 'Verbindung zum Server fehlgeschlagen.' };
    }
  };

  return { serverSyncStatus, lastServerSync, handleSyncWithServer };
}
