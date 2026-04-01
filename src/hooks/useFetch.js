import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch(url, { deps = [], interval = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetch_ = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Request failed');
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetch_();
    if (interval > 0) {
      timerRef.current = setInterval(fetch_, interval);
      return () => clearInterval(timerRef.current);
    }
  }, [fetch_, interval, ...deps]);

  return { data, loading, error, refetch: fetch_ };
}
