import React from 'react';

interface DashboardHeaderProps {
  onNewDocument: () => void;
  onSearch: (value: string) => void;
  onFilterChange: (value: string) => void;
  searchValue: string;
  filterValue: string;
  darkMode: boolean;
}

export default function DashboardHeader({ onNewDocument, onSearch, onFilterChange, searchValue, filterValue, darkMode }: DashboardHeaderProps) {
  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>All Documents</h1>
          <button
            onClick={onNewDocument}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <span>+</span> New Document
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search by file name or customer name..."
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-400'
                  : 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-blue-500'
              } focus:outline-none focus:ring-2`}
            />
          </div>
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-400'
                : 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500'
            }`}
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
}
