import React from 'react';
import { SecureData } from '../types/data';

interface DataHistoryProps {
  history: SecureData[];
  onRestore: (version: number) => Promise<void>;
  disabled?: boolean;
}

const DataHistory: React.FC<DataHistoryProps> = ({
  history,
  onRestore,
  disabled,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="history-container">
      <h2 className="history-title">History</h2>
      <div>
        {history.map((item) => (
          <div key={item.version} className="history-item">
            <div className="history-info">
              <div className="version-number">Version {item.version}</div>
              <div className="timestamp">
                {new Date(item.timestamp).toLocaleString()}
              </div>
              <div className="history-data">{item.data}</div>
            </div>
            <button
              className="button button-success"
              onClick={() => onRestore(item.version)}
              disabled={disabled}
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataHistory;
