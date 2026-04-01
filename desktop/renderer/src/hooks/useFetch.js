import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch(fn, { interval = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    try {
      const data = await fnRef.current();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    run();
    if (interval > 0) {
      const id = setInterval(run, interval);
      return () => clearInterval(id);
    }
  }, [run, interval]);

  return { ...state, refetch: run };
}
