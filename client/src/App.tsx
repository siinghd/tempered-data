import React from 'react';
import DataViewer from './components/DataViewer';
import './styles/styles.css';

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <DataViewer id="test-data" />
    </div>
  );
}

export default App;
