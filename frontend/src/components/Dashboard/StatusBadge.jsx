import React from 'react';

export default function StatusBadge({ status, darkMode }) {
  const isCompleted = status === 'Completed';
  const isDraft = status === 'Draft';

  if (isCompleted) {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        darkMode
          ? 'bg-green-900 text-green-200'
          : 'bg-green-100 text-green-800'
      }`}>
        ✅ Completed
      </span>
    );
  }

  if (isDraft) {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        darkMode
          ? 'bg-yellow-900 text-yellow-200'
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        📝 Draft
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      darkMode
        ? 'bg-gray-700 text-gray-200'
        : 'bg-gray-100 text-gray-800'
    }`}>
      {status}
    </span>
  );
}
