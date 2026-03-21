import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import MonitorHome from './pages/MonitorHome';
import KeyDocumentMonitor from './pages/KeyDocumentMonitor';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handlePageChange} />}
      {currentPage === 'documents' && <Documents onNavigate={handlePageChange} />}
      {currentPage === 'monitor' && <MonitorHome onNavigate={handlePageChange} />}
      {currentPage === 'key-monitor' && <KeyDocumentMonitor onNavigate={handlePageChange} />}
    </>
  );
}

export default App;
