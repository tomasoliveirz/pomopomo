import { useState, useEffect, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>('idle');

  const markSaving = useCallback(() => {
    setStatus('saving');
  }, []);

  const markSaved = useCallback(() => {
    setStatus('saved');
    // Auto-reset after 2 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 2000);
  }, []);

  const markError = useCallback(() => {
    setStatus('error');
    // Auto-reset after 3 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 3000);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
  }, []);

  return {
    status,
    markSaving,
    markSaved,
    markError,
    reset,
  };
}


