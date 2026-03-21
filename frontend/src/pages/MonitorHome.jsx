import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';

export default function MonitorHome({ onNavigate = () => {} }) {
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Sample monitor documents data
  const sampleMonitors = [
    {
      id: 'MON-001',
      monitorId: 'MON-001/2024',
      customer: 'ABC Corporation',
      poNo: 'PO-2024-001',
      poDate: '2024-03-01',
      issuedDate: '2024-03-15',
      destination: 'Bangkok, Thailand',
      totalQuantity: 150.50,
      totalSales: 45000.00,
      status: 'Active',
      itemCount: 5,
      lastUpdated: '2024-03-20',
      color: 'blue'
    },
    {
      id: 'MON-002',
      monitorId: 'MON-002/2024',
      customer: 'XYZ Industries',
      poNo: 'PO-2024-002',
      poDate: '2024-03-05',
      issuedDate: '2024-03-18',
      destination: 'Chiang Mai, Thailand',
      totalQuantity: 200.00,
      totalSales: 62000.00,
      status: 'Active',
      itemCount: 8,
      lastUpdated: '2024-03-19',
      color: 'green'
    },
    {
      id: 'MON-003',
      monitorId: 'MON-003/2024',
      customer: 'Global Traders',
      poNo: 'PO-2024-003',
      poDate: '2024-02-28',
      issuedDate: '2024-03-10',
      destination: 'Phuket, Thailand',
      totalQuantity: 85.75,
      totalSales: 28500.00,
      status: 'Completed',
      itemCount: 3,
      lastUpdated: '2024-03-15',
      color: 'purple'
    },
    {
      id: 'MON-004',
      monitorId: 'MON-004/2024',
      customer: 'Summit Trading',
      poNo: 'PO-2024-004',
      poDate: '2024-03-08',
      issuedDate: '2024-03-19',
      destination: 'Singapore',
      totalQuantity: 120.00,
      totalSales: 38000.00,
      status: 'Active',
      itemCount: 6,
      lastUpdated: '2024-03-20',
      color: 'cyan'
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setMonitors(sampleMonitors);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleAddMonitor = () => {
    onNavigate('key-monitor');
  };

  const handleEditMonitor = (monitor) => {
    alert(`✏️ Edit Monitor: ${monitor.monitorId}\n\nCustomer: ${monitor.customer}\n\nNavigating to form...`);
    onNavigate('key-monitor');
  };

  const handleDeleteMonitor = (monitor) => {
    if (window.confirm(`🗑️ Delete Monitor Document: ${monitor.monitorId}?\n\nCustomer: ${monitor.customer}\n\nThis action cannot be undone.`)) {
      setMonitors(monitors.filter(m => m.id !== monitor.id));
      alert('✅ Monitor document deleted successfully!');
    }
  };

  const handleViewMonitor = (monitor) => {
    alert(`👁️ View Monitor: ${monitor.monitorId}\n\nCustomer: ${monitor.customer}\nPO No: ${monitor.poNo}\nTotal Sales: ${monitor.totalSales.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}`);
  };

  const getStatusColor = (status) => {
    if (status === 'Active') return 'bg-green-500/20 text-green-600';
    if (status === 'Completed') return 'bg-blue-500/20 text-blue-600';
    return 'bg-gray-500/20 text-gray-600';
  };

  const getColorClass = (color) => {
    const colors = {
      blue: 'border-blue-500',
      green: 'border-green-500',
      purple: 'border-purple-500',
      cyan: 'border-cyan-500'
    };
    return colors[color] || 'border-blue-500';
  };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="monitor">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🖥️ Individual Customer Monitoring
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage and monitor all customer purchase orders
                </p>
              </div>
              <button
                onClick={handleAddMonitor}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>➕</span> New Monitor
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900'}`}>
                <span className="text-sm font-medium">Total: {monitors.length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-900'}`}>
                <span className="text-sm font-medium">Active: {monitors.filter(m => m.status === 'Active').length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-900'}`}>
                <span className="text-sm font-medium">Completed: {monitors.filter(m => m.status === 'Completed').length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-900'}`}>
                <span className="text-sm font-medium">Total Value: ฿{monitors.reduce((sum, m) => sum + m.totalSales, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="text-4xl mb-4">⏳</div>
              <p>Loading monitors...</p>
            </div>
          ) : monitors.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg`}>
              <div className="text-5xl mb-4">📭</div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                No monitor documents found
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create your first monitor document to get started
              </p>
              <button
                onClick={handleAddMonitor}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                ➕ Create New Monitor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {monitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} border-2 ${getColorClass(monitor.color)} rounded-lg overflow-hidden transition-all`}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl">📋</div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(monitor.status)}`}>
                        {monitor.status}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {monitor.monitorId}
                    </h3>
                  </div>

                  {/* Card Content */}
                  <div className="px-6 py-4 space-y-3">
                    {/* Customer Info */}
                    <div>
                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        CUSTOMER
                      </p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {monitor.customer}
                      </p>
                    </div>

                    {/* PO Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          PO NO
                        </p>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {monitor.poNo}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          PO DATE
                        </p>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {new Date(monitor.poDate).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded p-3 space-y-2`}>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Total Quantity:
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          {monitor.totalQuantity.toFixed(2)} MT
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Total Sales:
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
                          ฿{monitor.totalSales.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Items:
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {monitor.itemCount} items
                        </span>
                      </div>
                    </div>

                    {/* Destination */}
                    <div>
                      <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        DESTINATION
                      </p>
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        📍 {monitor.destination}
                      </p>
                    </div>

                    {/* Last Updated */}
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Last updated: {new Date(monitor.lastUpdated).toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  {/* Card Footer - Action Buttons */}
                  <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex gap-2`}>
                    <button
                      onClick={() => handleViewMonitor(monitor)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded transition-colors"
                      title="View"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleEditMonitor(monitor)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded transition-colors"
                      title="Edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMonitor(monitor)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 rounded transition-colors"
                      title="Delete"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
