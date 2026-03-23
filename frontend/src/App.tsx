import React, { useState } from 'react';
import CodeMaster from './pages/CodeMaster';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import MonitorHome from './pages/MonitorHome';
import KeyDocumentMonitor from './pages/KeyDocumentMonitor';
import InvoiceHome from './pages/InvoiceHome';
import KeyInvoice from './pages/KeyInvoice';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handlePageChange = (page, payload = null) => {
    if (page === 'key-monitor') {
      setSelectedMonitor(payload);
    } else {
      setSelectedMonitor(null);
    }

    if (page === 'key-invoice') {
      setSelectedInvoice(payload);
    } else {
      setSelectedInvoice(null);
    }

    setCurrentPage(page);
  };

  return (
    <>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handlePageChange} />}
      {currentPage === 'documents' && <Documents onNavigate={handlePageChange} />}
      {currentPage === 'monitor-home' && <MonitorHome onNavigate={handlePageChange} />}
      {currentPage === 'key-monitor' && (
        <KeyDocumentMonitor onNavigate={handlePageChange} initialData={selectedMonitor} />
      )}
      {currentPage === 'invoice-home' && <InvoiceHome onNavigate={handlePageChange} />}
      {currentPage === 'key-invoice' && (
        <KeyInvoice onNavigate={handlePageChange} initialData={selectedInvoice} />
      )}
      {(currentPage === 'customer-code' || currentPage === 'product-code' || currentPage === 'destination-code') && (
        <CodeMaster onNavigate={handlePageChange} currentPage={currentPage} />
      )}
    </>
  );
}

export default App;
