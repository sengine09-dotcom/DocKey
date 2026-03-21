import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import DocumentCard from '../components/Documents/DocumentCard';

export default function Documents({ onNavigate = () => { } }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [expandedDocs, setExpandedDocs] = useState({});

  // Sample documents data
  const sampleDocuments = [
    {
      id: 1,
      title: 'Monitor',
      icon: '🖥️',
      type: 'monitor',
      description: 'Monthly system performance and monitoring report',
      status: 'Active',
      color: 'blue',
      items: [
        { id: 101, name: '0001/26', date: '2024-03-20', size: '1.2 MB', status: 'Print' },
        { id: 102, name: '0002/26', date: '2024-03-15', size: '1.2 MB', status: 'NotPrint' }
      ]
    },
    {
      id: 2,
      title: 'Invoice',
      icon: '📄',
      type: 'invoice',
      description: 'First quarter invoice documentation',
      status: 'Active',
      color: 'green',
      items: [
        { id: 201, name: 'INV-001/2024', date: '2024-03-20', size: '0.8 MB', status: 'Print' },
        { id: 202, name: 'INV-002/2024', date: '2024-03-15', size: '0.9 MB', status: 'Print' }
      ]
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setDocuments(sampleDocuments);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleViewDocument = (doc) => {
    alert(`📂 Opening: ${doc.title}\nType: ${doc.type}\nSize: ${doc.size}`);
  };

  const handleDownloadDocument = (doc) => {
    alert(`⬇️ Downloading: ${doc.title}`);
  };

  const handleDeleteDocument = (doc) => {
    if (window.confirm(`Delete "${doc.title}"?`)) {
      setDocuments(documents.filter(d => d.id !== doc.id));
      alert(`✅ Document deleted successfully!`);
    }
  };

  const toggleExpandDoc = (docId) => {
    setExpandedDocs({
      ...expandedDocs,
      [docId]: !expandedDocs[docId]
    });
  };

  const handleAddItem = (docId) => {
    const itemName = prompt(`Enter ${documents.find(d => d.id === docId)?.title} item name:`);
    if (itemName && itemName.trim()) {
      const updatedDocs = documents.map(doc => {
        if (doc.id === docId) {
          return {
            ...doc,
            items: [
              ...doc.items,
              {
                id: Math.max(...doc.items.map(i => i.id), 0) + 1,
                name: itemName.trim(),
                date: new Date().toISOString().split('T')[0],
                size: '0 MB',
                status: 'Print'
              }
            ]
          };
        }
        return doc;
      });
      setDocuments(updatedDocs);
      alert(`✅ Item "${itemName}" added successfully!`);
    }
  };

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="documents">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📂 All Documents
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage and view all your documents
                </p>
              </div>
              <button
                onClick={() => alert('📤 Upload Document - Coming Soon!')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <span>⬆️</span> Upload Document
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900'}`}>
                <span className="text-sm font-medium">Total: {documents.length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-900'}`}>
                <span className="text-sm font-medium">Active: {documents.filter(d => d.status === 'Active').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="text-4xl mb-4">⏳</div>
              <p>Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg`}>
              <div className="text-5xl mb-4">📭</div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                No documents found
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Upload your first document to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {documents.map((doc) => {
                const totalItems = doc.items.length;
                const printedItems = doc.items.filter(i => i.status !== 'NotPrint').length;
                const notPrintItems = doc.items.filter(i => i.status === 'NotPrint').length;

                return (
                  <div
                    key={doc.id}
                    className={`${darkMode ? 'bg-gray-800 hover:bg-gray-750 border-gray-700' : 'bg-white hover:bg-gray-50 border-gray-200'} border rounded-lg overflow-hidden transition-all h-full flex flex-col`}
                  >
                    {/* Card Content */}
                    <div className="flex-1 px-8 py-16 flex flex-col items-start justify-start text-left">
                      <span className="text-7xl mb-8">{doc.icon}</span>

                      <div className="flex flex-row justify-between items-start w-full">

                        <h3 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                          {doc.title}
                        </h3>

                        {/* Summary Stats */}
                        <div className="mb-10 space-y-1 left-0">
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Total {totalItems}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-green-600' : 'text-gray-600'}`}>
                            New {notPrintItems}
                          </p>
                        </div>

                      </div>


                      {/* Action Buttons */}
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => handleAddItem(doc.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm transition-colors font-medium"
                        >
                          ➕ Add new
                        </button>
                        <button
                          onClick={() => toggleExpandDoc(doc.id)}
                          className={`flex-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} px-4 py-3 rounded-lg text-sm transition-colors font-medium`}
                        >
                          👁️ Show All
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
