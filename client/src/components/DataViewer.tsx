import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { SecureData } from '../types/data';
import DataEditor from './DataEditor';
import DataHistory from './DataHistory';

interface DataViewerProps {
  id: string;
}

const DataViewer: React.FC<DataViewerProps> = ({ id }) => {
  const [data, setData] = useState<SecureData | null>(null);
  const [history, setHistory] = useState<SecureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [newData, newHistory] = await Promise.all([
        ApiService.getData(id),
        ApiService.getHistory(id),
      ]);
      setData(newData);
      setHistory(newHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSave = async (newData: string) => {
    try {
      setLoading(true);
      const updated = await ApiService.updateData(id, newData, data?.version);
      setData(updated);
      await loadData(); // Refresh history
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (isTempered = false) => {
    if (!data) return;

    try {
      setVerifying(true);
      const isValid = await ApiService.verifyData(
        id,
        isTempered ? `${data.data}-tempered` : data.data
      );
      alert(isValid ? '✅ Data verified!' : '⚠️ Data verification failed!');

      if (!isValid) {
        const recovered = await ApiService.recoverData(id);
        setData(recovered);
        await loadData(); // Refresh history
        alert('Data recovered from backup');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRestore = async (version: number) => {
    try {
      setLoading(true);
      const restored = await ApiService.restoreVersion(id, version);
      setData(restored);
      await loadData(); // Refresh history
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        Error: {error}
        <button className="button button-primary" onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Secure Data Editor</h1>
        <div className="button-group">
          <button
            className="button button-success"
            onClick={() => handleVerify()}
            disabled={loading || verifying || !data}
          >
            {verifying ? 'Verifying...' : 'Verify Data'}
          </button>
          <button
            className="button button-success"
            onClick={() => handleVerify(true)}
            disabled={loading || verifying || !data}
          >
            {verifying ? 'Verifying...' : 'Verify Tempered Data'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <DataEditor
            data={data}
            onSave={handleSave}
            disabled={loading || verifying}
          />
          <DataHistory
            history={history}
            onRestore={handleRestore}
            disabled={loading || verifying}
          />
        </>
      )}
    </div>
  );
};

export default DataViewer;
