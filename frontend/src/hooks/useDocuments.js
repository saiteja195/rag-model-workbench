import { useState, useEffect, useCallback } from 'react';
import { listDocuments, deleteDocument } from '../api/client';

export default function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => (
    listDocuments()
      .then(docs => { setDocuments(docs); setError(null); })
      .catch(err => setError(err.message))
  ), []);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = useCallback(async (fileId) => {
    try {
      await deleteDocument(fileId);
      setDocuments(prev => prev.filter(d => d.file_id !== fileId));
      return true;
    } catch (err) {
      setError(`Couldn't delete the document: ${err.message}`);
      return false;
    }
  }, []);

  return { documents, error, refresh, remove, clearError: () => setError(null) };
}
