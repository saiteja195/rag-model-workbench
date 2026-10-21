import { useState, useEffect, useCallback } from 'react';
import { getRAGTypes } from '../api/client';

export default function useRagTypes() {
  const [ragTypes, setRagTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getRAGTypes()
      .then(setRagTypes)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return { ragTypes, loading, error, reload: load };
}
