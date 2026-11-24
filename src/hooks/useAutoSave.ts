import { useEffect } from 'react';
import { saveLocalStorage } from '../utils';

/** Schreibt `value` unter `key` in den localStorage, sobald es sich ändert. */
export function useAutoSave<T>(key: string, value: T): void {
  useEffect(() => {
    saveLocalStorage(key, value);
  }, [key, value]);
}
