import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import invoiceService from '../services/invoiceService';
import useThemePreference from '../hooks/useThemePreference';

export default function InvoiceHome({ onNavigate = () => {} }: any) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useThemePreference();

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const response = await invoiceService.getAll();
        setInvoices(response.data.data || []);
      } catch (error) {
        alert('Failed to load invoices from API');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const handleAddInvoice = () => {
    onNavigate('key-invoice');
  };

  const handleEditInvoice = (invoice) => {
    onNavigate('key-invoice', { ...invoice, __mode: 'edit' });
  };

  const handleDeleteInvoice = (invoice) => {
    if (window.confirm(`🗑️ Delete Invoice: ${invoice.invoiceId}?\n\nCustomer: ${invoice.customer}\n\nThis action cannot be undone.`)) {
      invoiceService.delete(invoice.invoiceNo).then(() => {
        setInvoices(invoices.filter((i: any) => i.invoiceNo !== invoice.invoiceNo));
        alert('✅ Invoice deleted successfully!');
      }).catch(() => {
        alert('Failed to delete invoice');
      });
    }
  };

  const handleViewInvoice = (invoice) => {
    onNavigate('key-invoice', { ...invoice, __mode: 'view' });
  };

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'bg-green-500/20 text-green-600';
    if (status === 'Pending') return 'bg-yellow-500/20 text-yellow-600';
    if (status === 'Overdue') return 'bg-red-500/20 text-red-600';
    return 'bg-gray-500/20 text-gray-600';
  };

  const getColorClass = (color) => {
    const colors = {
      green: 'border-green-500',
      yellow: 'border-yellow-500',
      red: 'border-red-500',
      blue: 'border-blue-500'
    };
    return colors[color] || 'border-blue-500';
  };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="invoice-home">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📋 Invoice Management
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage and track all invoices
                </p>
              </div>
              <button
                onClick={handleAddInvoice}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>➕</span> New Invoice
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900'}`}>
                <span className="text-sm font-medium">Total: {invoices.length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-900'}`}>
                <span className="text-sm font-medium">Paid: {invoices.filter(i => i.status === 'Paid').length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-900'}`}>
                <span className="text-sm font-medium">Pending: {invoices.filter(i => i.status === 'Pending').length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-900'}`}>
                <span className="text-sm font-medium">Total Amount: ฿{invoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="text-4xl mb-4">⏳</div>
              <p>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg`}>
              <div className="text-5xl mb-4">📭</div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                No invoices found
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Create your first invoice to get started
              </p>
              <button
                onClick={handleAddInvoice}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                ➕ Create New Invoice
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {invoices.map((invoice) => (
                <div
                  key={invoice.invoiceNo}
                  className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'} border-2 ${getColorClass(invoice.color)} rounded-lg overflow-hidden transition-all`}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl">📋</div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {invoice.invoiceId}
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
                        {invoice.customer}
                      </p>
                    </div>

                    {/* Invoice Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          INVOICE NO
                        </p>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {invoice.invoiceNo}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          INVOICE DATE
                        </p>
                        <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {new Date(invoice.invoiceDate).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded p-3 space-y-2`}>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Amount:
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          ฿{invoice.amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Due Date:
                        </span>
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {new Date(invoice.dueDate).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Items:
                        </span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {invoice.itemCount} items
                        </span>
                      </div>
                    </div>

                    {/* Last Updated */}
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Last updated: {new Date(invoice.lastUpdated).toLocaleDateString('th-TH')}
                    </p>
                  </div>

                  {/* Card Footer - Action Buttons */}
                  <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex gap-2`}>
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded transition-colors"
                      title="View"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleEditInvoice(invoice)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded transition-colors"
                      title="Edit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice)}
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
