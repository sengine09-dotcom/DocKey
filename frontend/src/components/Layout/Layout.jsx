import React, { useState } from 'react';

export default function Layout({ children, darkMode, setDarkMode, onNavigate = () => {}, currentPage = 'dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Sample user data (can be replaced with real user data from props or context)
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: '👤',
    role: 'Admin'
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/' },
    { id: 'documents', label: 'Documents', icon: '📄', href: '/documents' },
    { id: 'reports', label: 'Reports', icon: '📈', href: '/reports' },
    { id: 'upload', label: 'Upload', icon: '⬆️', href: '/upload' },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ];

  const handleMenuClick = (id) => {
    // Navigate to the appropriate page
    if (id === 'dashboard') {
      onNavigate('dashboard');
    } else if (id === 'documents') {
      onNavigate('documents');
    } else if (id === 'key-monitor') {
      onNavigate('key-monitor');
    } else if (id === 'reports') {
      alert('📈 Reports - Coming Soon!');
    } else if (id === 'upload') {
      alert('⬆️ Upload - Coming Soon!');
    } else if (id === 'settings') {
      alert('⚙️ Settings - Coming Soon!');
    }
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-24'} transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-800 border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-lg'} border-r flex flex-col`}>
        
        {/* Logo Section */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="text-4xl">📋</div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <span className={`font-bold text-lg whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Doc Key
                </span>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Document Management
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.id} className="space-y-1">
              <a
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick(item.id);
                }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  currentPage === item.id
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-600 text-white shadow-md'
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="font-medium whitespace-nowrap text-sm">{item.label}</span>
                )}
                {sidebarOpen && currentPage === item.id && (
                  <div className="ml-auto w-1 h-6 bg-white rounded-full"></div>
                )}
              </a>

              {/* Submenu under Documents */}
              {item.id === 'documents' && sidebarOpen && (
                <div className="space-y-1">
                  <button
                    onClick={() => handleMenuClick('key-monitor')}
                    className={`ml-12 mt-1 flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
                      currentPage === 'key-monitor'
                        ? darkMode
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-100 text-blue-900'
                        : darkMode
                        ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-sm">🖥️</span>
                    <span>Monitor</span>
                  </button>

                  <button
                    onClick={() => alert('Invoice - Coming Soon!')}
                    className={`ml-12 flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
                      darkMode
                        ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-sm">📄</span>
                    <span>Invoice</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-px my-4`}></div>

        {/* Bottom Section with Options */}
        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full p-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
            {sidebarOpen && <span className="text-xs">Theme</span>}
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-full p-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium text-sm ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white hover:shadow-lg'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900 hover:shadow-lg'
            }`}
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            <span className="text-lg">{sidebarOpen ? '◀️' : '▶️'}</span>
            {sidebarOpen && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-between shadow-sm relative`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {menuItems.find(m => m.id === currentPage)?.label || 'Dashboard'}
            </h1>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          
          {/* Right Side - User Profile & Status */}
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${
              darkMode
                ? 'bg-green-900 text-green-200'
                : 'bg-green-100 text-green-800'
            }`}>
              ✅ Online
            </div>

            {/* User Profile Button */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-md ${
                darkMode
                  ? 'hover:bg-gray-700 text-white'
                  : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-900'
              }`}>
                {user.avatar}
              </div>
              <div className="text-left hidden sm:block">
                <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.name}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user.role}
                </p>
              </div>
              <span className={`text-lg ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {showUserMenu ? '▼' : '▶'}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className={`absolute top-16 right-6 mt-2 w-56 py-2 rounded-lg ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'} shadow-xl z-50`}>
                {/* User Info Header */}
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user.name}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user.email}
                  </p>
                </div>

                {/* Menu Items */}
                <a
                  href="#profile"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('👤 Profile Page - Coming Soon!');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  👤 My Profile
                </a>
                <a
                  href="#edit-profile"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('✏️ Edit Profile - Coming Soon!');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✏️ Edit Information
                </a>
                <a
                  href="#change-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('🔐 Change Password - Coming Soon!');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🔐 Change Password
                </a>
                <a
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('⚙️ Settings - Coming Soon!');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ⚙️ Settings
                </a>
                
                {/* Divider */}
                <div className={`my-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-px`}></div>

                {/* Logout */}
                <a
                  href="#logout"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('👋 Logout - Coming Soon!');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    darkMode
                      ? 'text-red-400 hover:bg-gray-800'
                      : 'text-red-600 hover:bg-gray-50'
                  }`}
                >
                  👋 Logout
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
