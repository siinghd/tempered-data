import React, { useState } from 'react';
import { SecureData } from '../types/data';

interface DataEditorProps {
  data: SecureData | null;
  onSave: (data: string) => Promise<void>;
  disabled?: boolean;
}

const DataEditor: React.FC<DataEditorProps> = ({ data, onSave, disabled }) => {
  const [editValue, setEditValue] = useState(data?.data || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  if (!data) return null;

  return (
    <div className="editor">
      {isEditing ? (
        <div>
          <textarea
            className="textarea"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={disabled}
          />
          <div className="button-group">
            <button
              className="button button-primary"
              onClick={handleSave}
              disabled={disabled}
            >
              Save
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setEditValue(data.data);
                setIsEditing(false);
              }}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="content-display">{data.data}</div>
          <button
            className="button button-primary"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
};

export default DataEditor;
