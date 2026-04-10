import React from 'react';

type SummaryCardColor = 'blue' | 'yellow' | 'green';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: SummaryCardColor;
  darkMode: boolean;
}

export default function SummaryCard({ title, value, icon, color, darkMode }: SummaryCardProps) {
  const colorClasses = darkMode ? {
    blue: 'bg-blue-900 border-blue-700',
    yellow: 'bg-yellow-900 border-yellow-700',
    green: 'bg-green-900 border-green-700'
  } : {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200'
  };

  const iconColorClasses = {
    blue: darkMode ? 'text-blue-400' : 'text-blue-600',
    yellow: darkMode ? 'text-yellow-400' : 'text-yellow-600',
    green: darkMode ? 'text-green-400' : 'text-green-600'
  };

  const textColor = darkMode ? 'text-gray-300' : 'text-gray-600';
  const titleColor = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${textColor} text-sm font-medium`}>{title}</p>
          <p className={`text-3xl font-bold ${titleColor} mt-2`}>{value}</p>
        </div>
        <div className={`text-4xl ${iconColorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
