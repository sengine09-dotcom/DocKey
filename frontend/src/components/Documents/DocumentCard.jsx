import React from 'react';

export default function DocumentCard({ document, darkMode, onView, onDownload, onDelete }) {
  const colorClasses = {
    blue: darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200',
    green: darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200',
    red: darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200',
    purple: darkMode ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-200',
  };

  const iconColorClasses = {
    blue: darkMode ? 'text-blue-300' : 'text-blue-600',
    green: darkMode ? 'text-green-300' : 'text-green-600',
    red: darkMode ? 'text-red-300' : 'text-red-600',
    purple: darkMode ? 'text-purple-300' : 'text-purple-600',
  };

  const textColor = {
    title: darkMode ? 'text-white' : 'text-gray-900',
    subtitle: darkMode ? 'text-gray-400' : 'text-gray-600',
    muted: darkMode ? 'text-gray-500' : 'text-gray-400',
  };

  return (
    <div className={`${colorClasses[document.color]} border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
      {/* Card Header */}
      <div className={`p-6 ${colorClasses[document.color]}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="text-5xl">{document.icon}</div>
          <div className={`px-2 py-1 rounded text-xs font-semibold ${
            document.status === 'Active'
              ? darkMode ? 'bg-green-800 text-green-200' : 'bg-green-200 text-green-900'
              : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900'
          }`}>
            {document.status}
          </div>
        </div>
        <h3 className={`text-xl font-bold ${textColor.title} mb-1 line-clamp-2`}>
          {document.title}
        </h3>
        <p className={`text-sm ${textColor.subtitle} line-clamp-2`}>
          {document.description}
        </p>
      </div>

      {/* Card Body */}
      <div className={`px-6 py-4 ${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-gray-200'}`}>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${textColor.muted}`}>Type</span>
            <span className={`text-sm font-semibold ${textColor.subtitle}`}>{document.type}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${textColor.muted}`}>Size</span>
            <span className={`text-sm font-semibold ${textColor.subtitle}`}>{document.size}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${textColor.muted}`}>Date</span>
            <span className={`text-sm font-semibold ${textColor.subtitle}`}>
              {new Date(document.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: '2-digit' 
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onView}
            className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
              darkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-900'
            }`}
          >
            👁️ View
          </button>
          <button
            onClick={onDownload}
            className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
              darkMode
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-green-100 hover:bg-green-200 text-green-900'
            }`}
          >
            ⬇️ Download
          </button>
          <button
            onClick={onDelete}
            className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
              darkMode
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-red-100 hover:bg-red-200 text-red-900'
            }`}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}
