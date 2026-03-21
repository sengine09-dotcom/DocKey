import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import SummaryCard from '../components/Dashboard/SummaryCard';
import DocumentTable from '../components/Dashboard/DocumentTable';
import documentService from '../services/documentService';

export default function Dashboard({ onNavigate = () => {} }: any) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  // Fetch documents from API
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentService.getAll(search, filterStatus);
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      alert('Failed to load documents. Make sure the backend API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch documents when search or filter changes
  useEffect(() => {
    fetchDocuments();
  }, [search, filterStatus]);

  // Handle creating new document
  const handleNewDocument = async () => {
    try {
      const response = await documentService.create('Untitled Document', 'Unnamed Customer');
      if (response.data.success) {
        // Refresh the list
        fetchDocuments();
        // In a real app, you would redirect to the form page with the new document ID
        alert(`Document created! ID: ${response.data.data.id}\n\nIn production, this would redirect to the form page.`);
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document');
    }
  };

  // Handle deleting document
  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await documentService.delete(id);
      if (response.data.success) {
        fetchDocuments();
        alert('Document deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  // Handle editing document (placeholder)
  const handleEditDocument = (id) => {
    alert(`Edit document ${id}\n\nIn production, this would navigate to the form page.`);
    // window.location.href = `/form/${id}`;
  };

  // Calculate statistics
  const totalDocuments = documents.length;
  const draftDocuments = documents.filter(doc => doc.status === 'Draft').length;
  const completedDocuments = documents.filter(doc => doc.status === 'Completed').length;

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage="dashboard">
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <DashboardHeader
          onNewDocument={handleNewDocument}
          onSearch={setSearch}
          onFilterChange={setFilterStatus}
          searchValue={search}
          filterValue={filterStatus}
          darkMode={darkMode}
        />

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <SummaryCard
              title="Total Documents"
              value={totalDocuments}
              icon="📄"
              color="blue"
              darkMode={darkMode}
            />
            <SummaryCard
              title="Draft Documents"
              value={draftDocuments}
              icon="✏️"
              color="yellow"
              darkMode={darkMode}
            />
            <SummaryCard
              title="Completed Documents"
              value={completedDocuments}
              icon="✓"
              color="green"
              darkMode={darkMode}
            />
          </div>

          {/* Document Table */}
          <DocumentTable
            documents={documents}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            isLoading={isLoading}
            darkMode={darkMode}
          />
        </div>
      </div>
    </Layout>
  );
}
