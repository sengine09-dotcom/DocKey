import React, { useEffect, useState } from 'react';
import axios from 'axios';
import monitorService from '../../services/monitorService';
import invoiceService from '../../services/invoiceService';
import codeService from '../../services/codeService';

export default function Layout({ children, darkMode, setDarkMode, onNavigate = () => {}, currentPage = 'dashboard', topBarCaption = '' }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('doc-key-sidebar-open');
      return saved == null ? true : saved === 'true';
    } catch (_error) {
      return true;
    }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState(() => {
    try {
      const saved = localStorage.getItem('doc-key-open-submenus');
      if (!saved) {
        return { documents: true, codes: true };
      }
      const parsed = JSON.parse(saved);
      return {
        documents: parsed?.documents !== false,
        codes: parsed?.codes !== false,
      };
    } catch (_error) {
      return { documents: true, codes: true };
    }
  });
  const [sidebarCounts, setSidebarCounts] = useState({
    monitor: 0, invoice: 0,
    customer: 0, product: 0, destination: 0, paymentTerm: 0,
  });
  const [user, setUser] = useState({
    name: 'User',
    email: 'No email',
    avatar: '👤',
    role: 'User'
  });

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        const profile = response.data?.user;

        if (mounted && profile) {
          setUser({
            name: profile.name || 'User',
            email: profile.email || 'No email',
            avatar: '👤',
            role: profile.role || 'User'
          });
        }
      } catch (_error) {
        // If auth fetch fails, keep fallback user labels.
      }
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/' },
    { id: 'documents', label: 'Documents', icon: '📄', href: '/documents', hasSubmenu: true },
    { id: 'codes', label: 'Codes', icon: '🗂️', href: '/codes', hasSubmenu: true },
    { id: 'reports', label: 'Reports', icon: '📈', href: '/reports' },
    { id: 'upload', label: 'Upload', icon: '⬆️', href: '/upload' },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ];

  const documentSubmenu = [
    { id: 'monitor-home', label: 'Monitor', icon: '🖥️', href: '/monitor' },
    { id: 'invoice-home', label: 'Invoice', icon: '📋', href: '/invoice' },
  ];

  const codeSubmenu = [
    { id: 'customer-code', label: 'Customer', icon: '🏢', href: '/codes/customer' },
    { id: 'product-code', label: 'Product', icon: '📦', href: '/codes/product' },
    { id: 'destination-code', label: 'Destination', icon: '📍', href: '/codes/destination' },
    { id: 'payment-term-code', label: 'Payment Term', icon: '💳', href: '/codes/payment-term' },
  ];

  const isDocumentSectionActive =
    currentPage === 'documents' ||
    currentPage === 'monitor-home' ||
    currentPage === 'key-monitor' ||
    currentPage === 'invoice-home' ||
    currentPage === 'key-invoice';

  const isCodeSectionActive =
    currentPage === 'codes' ||
    currentPage === 'customer-code' ||
    currentPage === 'product-code' ||
    currentPage === 'destination-code' ||
    currentPage === 'payment-term-code';

  useEffect(() => {
    localStorage.setItem('doc-key-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('doc-key-open-submenus', JSON.stringify(openSubmenus));
  }, [openSubmenus]);

  useEffect(() => {
    const fetchCounts = async () => {
      const [mon, inv, cust, prod, dest, term] = await Promise.allSettled([
        monitorService.getAll(),
        invoiceService.getAll(),
        codeService.getAll('customer'),
        codeService.getAll('product'),
        codeService.getAll('destination'),
        codeService.getAll('payment-term'),
      ]);
      setSidebarCounts({
        monitor:     mon.status  === 'fulfilled' ? (mon.value?.data?.data?.length  ?? 0) : 0,
        invoice:     inv.status  === 'fulfilled' ? (inv.value?.data?.data?.length  ?? 0) : 0,
        customer:    cust.status === 'fulfilled' ? (cust.value?.data?.data?.length ?? 0) : 0,
        product:     prod.status === 'fulfilled' ? (prod.value?.data?.data?.length ?? 0) : 0,
        destination: dest.status === 'fulfilled' ? (dest.value?.data?.data?.length ?? 0) : 0,
        paymentTerm: term.status === 'fulfilled' ? (term.value?.data?.data?.length ?? 0) : 0,
      });
    };
    fetchCounts();
  }, []);

  const toggleSubmenu = (menuId) => {
    if (menuId !== 'documents' && menuId !== 'codes') return;
    setOpenSubmenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleMenuClick = (id) => {
    // Navigate to the appropriate page
    if (id === 'dashboard') {
      onNavigate('dashboard');
    } else if (id === 'documents') {
      onNavigate('documents');
    } else if (id === 'codes') {
      onNavigate('customer-code');
    } else if (id === 'monitor-home') {
      onNavigate('monitor-home');
    } else if (id === 'invoice-home') {
      onNavigate('invoice-home');
    } else if (id === 'customer-code') {
      onNavigate('customer-code');
    } else if (id === 'product-code') {
      onNavigate('product-code');
    } else if (id === 'destination-code') {
      onNavigate('destination-code');
    } else if (id === 'payment-term-code') {
      onNavigate('payment-term-code');
    } else if (id === 'key-monitor') {
      onNavigate('key-monitor');
    } else if (id === 'key-invoice') {
      onNavigate('key-invoice');
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
      <div className={`no-print ${sidebarOpen ? 'w-64' : 'w-24'} transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-800 border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-lg'} border-r flex flex-col`}>
        
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
                  currentPage === item.id || (item.id === 'documents' && isDocumentSectionActive) || (item.id === 'codes' && isCodeSectionActive)
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
                {sidebarOpen && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Count badge for Documents */}
                    {item.id === 'documents' && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isDocumentSectionActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {sidebarCounts.monitor + sidebarCounts.invoice}
                      </span>
                    )}
                    {/* Count badge for Codes */}
                    {item.id === 'codes' && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isCodeSectionActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {sidebarCounts.customer + sidebarCounts.product + sidebarCounts.destination + sidebarCounts.paymentTerm}
                      </span>
                    )}
                    {/* Submenu toggle button */}
                    {item.hasSubmenu && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSubmenu(item.id);
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                          darkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        aria-label={openSubmenus[item.id] ? `Collapse ${item.label} submenu` : `Expand ${item.label} submenu`}
                        title={openSubmenus[item.id] ? 'Collapse submenu' : 'Expand submenu'}
                      >
                        {openSubmenus[item.id] ? '▾' : '▸'}
                      </button>
                    )}
                    {/* Active page indicator bar */}
                    {(currentPage === item.id || (item.id === 'documents' && isDocumentSectionActive) || (item.id === 'codes' && isCodeSectionActive)) && (
                      <div className="w-1 h-6 bg-white rounded-full"></div>
                    )}
                  </div>
                )}
              </a>

              {/* Submenu under Documents */}
              {item.id === 'documents' && sidebarOpen && openSubmenus.documents && (
                <div className="space-y-1">                
                  {documentSubmenu.map((submenu) => (
                    <button
                      key={submenu.id}
                      onClick={() => handleMenuClick(submenu.id)}
                      className={`ml-12 mt-1 w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        currentPage === submenu.id || currentPage === 'key-monitor' && submenu.id === 'monitor-home' || currentPage === 'key-invoice' && submenu.id === 'invoice-home'
                          ? darkMode
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-400 text-white shadow-sm'
                          : darkMode
                          ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm">{submenu.icon}</span>
                      <span>{submenu.label}</span>
                      <span className="ml-auto text-xs font-medium opacity-70 tabular-nums">
                        {submenu.id === 'monitor-home' ? sidebarCounts.monitor : sidebarCounts.invoice}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {item.id === 'codes' && sidebarOpen && openSubmenus.codes && (
                <div className="space-y-1">
                  {codeSubmenu.map((submenu) => (
                    <button
                      key={submenu.id}
                      onClick={() => handleMenuClick(submenu.id)}
                      className={`ml-12 mt-1 w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        currentPage === submenu.id
                          ? darkMode
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-400 text-white shadow-sm'
                          : darkMode
                          ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-sm">{submenu.icon}</span>
                      <span>{submenu.label}</span>
                      <span className="ml-auto text-xs font-medium opacity-70 tabular-nums">
                        {({'customer-code': sidebarCounts.customer, 'product-code': sidebarCounts.product, 'destination-code': sidebarCounts.destination, 'payment-term-code': sidebarCounts.paymentTerm} as any)[submenu.id] ?? 0}
                      </span>
                    </button>
                  ))}
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
        <div className={`no-print ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-between shadow-sm relative`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {topBarCaption || (() => {
                let label = menuItems.find(m => m.id === currentPage)?.label || '';
                if (!label && currentPage === 'monitor-home') label = '🖥️ Monitor';
                if (!label && currentPage === 'key-monitor') label = '🖥️ Individual Customer Monitoring';
                if (!label && currentPage === 'invoice-home') label = '📋 Invoice Management';
                if (!label && currentPage === 'key-invoice') label = '📋 Invoice Management';
                if (!label && currentPage === 'customer-code') label = '🏢 Customer Codes';
                if (!label && currentPage === 'product-code') label = '📦 Product Codes';
                if (!label && currentPage === 'destination-code') label = '📍 Destination Codes';
                return label || 'Dashboard';
              })()}
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
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await axios.post('/api/auth/logout');
                    } catch (_error) {
                      // Ignore logout API failure and continue redirecting.
                    }
                    window.location.href = '/login';
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
