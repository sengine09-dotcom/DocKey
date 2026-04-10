import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import documentService from '../../services/documentService';
import codeService from '../../services/codeService';
import { showAppAlert, showAppConfirm } from '../../services/dialogService';
import { formatDate } from '../../utils/date';

const TOKEN_EXPIRY_CACHE_PREFIX = 'doc-key-token-expiry-v3';

const tokenExpiryMemoryCache = new Map<string, TokenExpirySummary>();
let latestTokenExpiryCache: {
  cacheKey: string;
  userKey: string;
  value: TokenExpirySummary;
} | null = null;

type TokenExpirySummary = {
  active: boolean;
  reason?: string | null;
  expiresAt?: string | null;
  vendorReachable: boolean;
  warningLevel: 'none' | 'healthy' | 'warning' | 'critical' | 'expired';
  daysUntilExpiry: number | null;
  expiryMessage?: string | null;
  expiryShortLabel?: string | null;
  expiryDateLabel?: string | null;
};

const getTodayCacheKey = (userKey: string) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${TOKEN_EXPIRY_CACHE_PREFIX}:${userKey}:${year}-${month}-${day}`;
};

const readTokenExpiryCache = (userKey: string) => {
  try {
    return tokenExpiryMemoryCache.get(getTodayCacheKey(userKey)) || null;
  } catch (_error) {
    return null;
  }
};

const writeTokenExpiryCache = (userKey: string, value: TokenExpirySummary) => {
  try {
    const todayCacheKey = getTodayCacheKey(userKey);
    tokenExpiryMemoryCache.set(todayCacheKey, value);
    latestTokenExpiryCache = {
      cacheKey: todayCacheKey,
      userKey,
      value,
    };
  } catch (_error) {
    // Ignore storage write failure.
  }
};

const readLatestTokenExpiryCache = () => {
  try {
    if (!latestTokenExpiryCache) {
      return null;
    }

    const currentDateSuffix = getTodayCacheKey(latestTokenExpiryCache.userKey || '').split(':').pop();
    if (!latestTokenExpiryCache.cacheKey.endsWith(String(currentDateSuffix))) {
      return null;
    }

    return latestTokenExpiryCache.value;
  } catch (_error) {
    return null;
  }
};

const createEmptyCompanyForm = () => ({
  companyCode: '',
  name: '',
  nameEn: '',
  taxId: '',
  branch: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  signatureUrl: '',
  bankName: '',
  bankAccount: '',
  accountName: '',
  isActive: 'true',
});

export default function Layout({ children, darkMode, setDarkMode, onNavigate = () => {}, currentPage = 'dashboard', topBarCaption = '' }: any) {
  const location = useLocation();
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
        return { documents: true, codes: true, administrator: true };
      }
      const parsed = JSON.parse(saved);
      return {
        documents: parsed?.documents !== false,
        codes: parsed?.codes !== false,
        administrator: parsed?.administrator !== false,
      };
    } catch (_error) {
      return { documents: true, codes: true, administrator: true };
    }
  });
  const [sidebarCounts, setSidebarCounts] = useState({
    quotation: 0, invoice: 0, receipt: 0, purchaseOrder: 0, workOrder: 0,
    customer: 0, product: 0, vendor: 0, company: 0, destination: 0, paymentTerm: 0, endUser: 0,
  });
  const [user, setUser] = useState({
    name: 'User',
    email: 'No email',
    avatar: '👤',
    role: 'User'
  });
  const [tokenExpiry, setTokenExpiry] = useState<TokenExpirySummary | null>(() => readLatestTokenExpiryCache());
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState<Record<string, any>>(createEmptyCompanyForm());
  const [editingCompanyCode, setEditingCompanyCode] = useState<string | null>(null);
  const [isCompanyEditMode, setIsCompanyEditMode] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState('');

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

        return profile || null;
      } catch (_error) {
        // If auth fetch fails, keep fallback user labels.
        return null;
      }
    };

    const loadTokenExpiry = async (userKey: string) => {
      const cached = readTokenExpiryCache(userKey);
      if (cached) {
        if (mounted) {
          setTokenExpiry(cached);
        }
        writeTokenExpiryCache(userKey, cached);
        return;
      }

      try {
        const response = await axios.get('/api/auth/token-expiry');
        if (mounted) {
          const nextValue = response.data?.data || null;
          setTokenExpiry(nextValue);
          if (nextValue) {
            writeTokenExpiryCache(userKey, nextValue);
          }
        }
      } catch (_error) {
        if (mounted) {
          setTokenExpiry(null);
        }
      }
    };

    const initializeHeaderState = async () => {
      const profile = await loadCurrentUser();
      const userKey = String(profile?.id || profile?.email || 'anonymous');
      await loadTokenExpiry(userKey);
    };

    void initializeHeaderState();

    const heartbeat = async () => {
      try {
        await axios.post('/api/auth/user-presence/heartbeat');
      } catch (_error) {
        // Presence failures should not interrupt usage.
      }
    };

    void heartbeat();

    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, 10000);

    const handlePageHide = () => {
      navigator.sendBeacon('/api/auth/user-presence/disconnect');
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const selectedDocumentTab = (() => {
    const selectedType = String((location.state as any)?.selectedType || '').trim().toLowerCase().replace(/-/g, '_');
    if (location.pathname === '/documents' && ['quotation', 'invoice', 'receipt', 'purchase_order', 'work_order'].includes(selectedType)) {
      return selectedType;
    }

    if (currentPage === 'invoice-home' || currentPage === 'key-invoice') {
      return 'invoice';
    }

    return 'quotation';
  })();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/' },
    { id: 'documents', label: 'Documents', icon: '📄', href: '/documents', hasSubmenu: true },
    { id: 'codes', label: 'Codes', icon: '🗂️', href: '/codes', hasSubmenu: true },
    { id: 'reports', label: 'Reports', icon: '📈', href: '/reports' },
    { id: 'upload', label: 'Upload', icon: '⬆️', href: '/upload' },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ];

  const documentSubmenu = [
    { id: 'documents-quotation', label: 'Quotation', icon: '📝', href: '/documents', count: sidebarCounts.quotation, isActive: currentPage === 'documents' && selectedDocumentTab === 'quotation' },
    { id: 'documents-invoice', label: 'Invoice', icon: '🧾', href: '/documents', count: sidebarCounts.invoice, isActive: currentPage === 'invoice-home' || currentPage === 'key-invoice' || (currentPage === 'documents' && selectedDocumentTab === 'invoice') },
    { id: 'documents-receipt', label: 'Receipt', icon: '💵', href: '/documents', count: sidebarCounts.receipt, isActive: currentPage === 'documents' && selectedDocumentTab === 'receipt' },
    { id: 'documents-purchase-order', label: 'PO', icon: '📦', href: '/documents', count: sidebarCounts.purchaseOrder, isActive: currentPage === 'documents' && selectedDocumentTab === 'purchase_order' },
    { id: 'documents-work-order', label: 'Work Order', icon: '🛠️', href: '/documents', count: sidebarCounts.workOrder, isActive: currentPage === 'documents' && selectedDocumentTab === 'work_order' },
  ];

  const codeSubmenu = [
    { id: 'customer-code', label: 'Customer', icon: '🏢', href: '/codes/customer', count: sidebarCounts.customer, isActive: currentPage === 'customer-code' },
    { id: 'product-code', label: 'Product', icon: '📦', href: '/codes/product', count: sidebarCounts.product, isActive: currentPage === 'product-code' },
    { id: 'vendor-code', label: 'Vendor', icon: '🚚', href: '/codes/vendor', count: sidebarCounts.vendor, isActive: currentPage === 'vendor-code' },
    { id: 'destination-code', label: 'Destination', icon: '📍', href: '/codes/destination', count: sidebarCounts.destination, isActive: currentPage === 'destination-code' },
    { id: 'payment-term-code', label: 'Payment Term', icon: '💳', href: '/codes/payment-term', count: sidebarCounts.paymentTerm, isActive: currentPage === 'payment-term-code' },
    { id: 'end-user-code', label: 'End User', icon: '👤', href: '/codes/end-user', count: sidebarCounts.endUser, isActive: currentPage === 'end-user-code' },
  ];

  const isDocumentSectionActive =
    currentPage === 'documents' ||
    currentPage === 'invoice-home' ||
    currentPage === 'key-invoice';

  const isCodeSectionActive =
    currentPage === 'codes' ||
    currentPage === 'customer-code' ||
    currentPage === 'product-code' ||
    currentPage === 'vendor-code' ||
    currentPage === 'destination-code' ||
    currentPage === 'payment-term-code' ||
    currentPage === 'end-user-code';

  useEffect(() => {
    localStorage.setItem('doc-key-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('doc-key-open-submenus', JSON.stringify(openSubmenus));
  }, [openSubmenus]);

  useEffect(() => {
    const fetchCounts = async () => {
      const [quotation, invoice, receipt, purchaseOrder, workOrder, cust, prod, vendor, company, dest, term, endUser] = await Promise.allSettled([
        documentService.getAll('quotation'),
        documentService.getAll('invoice'),
        documentService.getAll('receipt'),
        documentService.getAll('purchase_order'),
        documentService.getAll('work_order'),
        codeService.getAll('customer'),
        codeService.getAll('product'),
        codeService.getAll('vendor'),
        codeService.getAll('company'),
        codeService.getAll('destination'),
        codeService.getAll('payment-term'),
        codeService.getAll('end-user'),
      ]);
      setSidebarCounts({
        quotation:   quotation.status === 'fulfilled' ? (quotation.value?.data?.data?.length ?? 0) : 0,
        invoice:     invoice.status === 'fulfilled' ? (invoice.value?.data?.data?.length ?? 0) : 0,
        receipt:     receipt.status === 'fulfilled' ? (receipt.value?.data?.data?.length ?? 0) : 0,
        purchaseOrder: purchaseOrder.status === 'fulfilled' ? (purchaseOrder.value?.data?.data?.length ?? 0) : 0,
        workOrder:   workOrder.status === 'fulfilled' ? (workOrder.value?.data?.data?.length ?? 0) : 0,
        customer:    cust.status === 'fulfilled' ? (cust.value?.data?.data?.length ?? 0) : 0,
        product:     prod.status === 'fulfilled' ? (prod.value?.data?.data?.length ?? 0) : 0,
        vendor:      vendor.status === 'fulfilled' ? (vendor.value?.data?.data?.length ?? 0) : 0,
        company:     company.status === 'fulfilled' ? (company.value?.data?.data?.length ?? 0) : 0,
        destination: dest.status === 'fulfilled' ? (dest.value?.data?.data?.length ?? 0) : 0,
        paymentTerm: term.status === 'fulfilled' ? (term.value?.data?.data?.length ?? 0) : 0,
        endUser:     endUser.status === 'fulfilled' ? (endUser.value?.data?.data?.length ?? 0) : 0,
      });
    };
    fetchCounts();
  }, []);

  const toggleSubmenu = (menuId: string) => {
    if (menuId !== 'documents' && menuId !== 'codes') return;
    setOpenSubmenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId as keyof typeof prev],
    }));
  };

  const handleMenuClick = (id: string) => {
    // Navigate to the appropriate page
    if (id === 'dashboard') {
      onNavigate('dashboard');
    } else if (id === 'documents') {
      onNavigate('documents');
    } else if (id === 'codes') {
      onNavigate('customer-code');
    } else if (id === 'documents-quotation') {
      onNavigate('documents', { selectedType: 'quotation' });
    } else if (id === 'documents-invoice') {
      onNavigate('documents', { selectedType: 'invoice' });
    } else if (id === 'documents-receipt') {
      onNavigate('documents', { selectedType: 'receipt' });
    } else if (id === 'documents-purchase-order') {
      onNavigate('documents', { selectedType: 'purchase_order' });
    } else if (id === 'documents-work-order') {
      onNavigate('documents', { selectedType: 'work_order' });
    } else if (id === 'customer-code') {
      onNavigate('customer-code');
    } else if (id === 'product-code') {
      onNavigate('product-code');
    } else if (id === 'vendor-code') {
      onNavigate('vendor-code');
    } else if (id === 'company-info') {
      onNavigate('company-info');
    } else if (id === 'destination-code') {
      onNavigate('destination-code');
    } else if (id === 'payment-term-code') {
      onNavigate('payment-term-code');
    } else if (id === 'end-user-code') {
      onNavigate('end-user-code');
    } else if (id === 'key-invoice') {
      onNavigate('key-invoice');
    } else if (id === 'reports') {
      void showAppAlert({ title: 'Coming Soon', message: 'Reports page is coming soon.', tone: 'info' });
    } else if (id === 'upload') {
      void showAppAlert({ title: 'Coming Soon', message: 'Upload page is coming soon.', tone: 'info' });
    } else if (id === 'settings') {
      void showAppAlert({ title: 'Coming Soon', message: 'Settings page is coming soon.', tone: 'info' });
    }
  };

  const renderSubmenu = (items: { id: string; label: string; icon: string; href: string; count: number; isActive: boolean }[]) => (
    <div className="ml-3 space-y-1">
      {items.map((submenu) => (
        <button
          key={submenu.id}
          onClick={() => handleMenuClick(submenu.id)}
          className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-all duration-200 group ${getMenuItemClasses(submenu.isActive)}`}
        >
          <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            {submenu.icon}
          </span>
          <span className="font-medium whitespace-nowrap text-sm">{submenu.label}</span>
          <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            submenu.isActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
          }`}>
            {submenu.count}
          </span>
          {submenu.isActive && <div className="w-1 h-6 bg-white rounded-full"></div>}
        </button>
      ))}
    </div>
  );

  const getMenuItemClasses = (isActive: boolean) => (
    isActive
      ? 'bg-blue-600 text-white shadow-md'
      : darkMode
      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  );

  const tokenExpiryUnavailable = tokenExpiry === null;

  const tokenExpiryTone = tokenExpiryUnavailable
    ? darkMode
      ? 'border-slate-500/30 text-slate-200'
      : 'border-slate-200  text-slate-700'
    : tokenExpiry.warningLevel === 'none' || tokenExpiry.warningLevel === 'healthy'
    ? darkMode
      ? 'border-emerald-500/30 text-emerald-200'
      : 'border-emerald-200  text-emerald-700'
    : tokenExpiry.warningLevel === 'warning'
    ? darkMode
      ? 'border-amber-500/30 text-amber-200'
      : 'border-amber-200 text-amber-700'
    : darkMode
    ? 'border-rose-500/30 text-rose-200'
    : 'border-rose-200 text-rose-700';

  const tokenExpiryLabel = tokenExpiryUnavailable
    ? 'Unavailable'
    : tokenExpiry?.expiryShortLabel || (!tokenExpiry?.expiresAt ? 'No expiry limit' : 'Token active');

  const tokenExpiryInlineText = tokenExpiryUnavailable
    ? 'Expiry : unavailable'
    : !tokenExpiry?.expiresAt
    ? 'Expiry : no expiry date'
    : `Expiry : ${tokenExpiryLabel} ${tokenExpiry.expiryDateLabel || formatDate(tokenExpiry.expiresAt)}`;

  const normalizedUserRole = String(user.role || '').toLowerCase();
  const canShowAdminNavigation = normalizedUserRole === 'admin' || user.email === 'No email';

  const loadCompanyRecords = async () => {
    try {
      setIsLoadingCompany(true);
      setCompanyError('');
      const response = await codeService.getAll('company');
      const records = response?.data?.data || [];
      const primaryCompany = records[0] || null;
      if (primaryCompany) {
        setEditingCompanyCode(primaryCompany.companyCode || null);
        setIsCompanyEditMode(false);
        setCompanyForm({
          companyCode: primaryCompany.companyCode || '',
          name: primaryCompany.name || '',
          nameEn: primaryCompany.nameEn || '',
          taxId: primaryCompany.taxId || '',
          branch: primaryCompany.branch || '',
          address: primaryCompany.address || '',
          phone: primaryCompany.phone || '',
          email: primaryCompany.email || '',
          website: primaryCompany.website || '',
          logoUrl: primaryCompany.logoUrl || '',
          signatureUrl: primaryCompany.signatureUrl || '',
          bankName: primaryCompany.bankName || '',
          bankAccount: primaryCompany.bankAccount || '',
          accountName: primaryCompany.accountName || '',
          isActive: primaryCompany.isActive === false || String(primaryCompany.isActive) === 'false' ? 'false' : 'true',
        });
      } else {
        setEditingCompanyCode(null);
        setIsCompanyEditMode(true);
        setCompanyForm(createEmptyCompanyForm());
      }
    } catch (error: any) {
      setCompanyError(error?.response?.data?.message || error?.message || 'Failed to load company information');
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const openCompanyModal = async () => {
    setShowUserMenu(false);
    setCompanyModalOpen(true);
    await loadCompanyRecords();
  };

  const closeCompanyModal = () => {
    setCompanyModalOpen(false);
    setEditingCompanyCode(null);
    setIsCompanyEditMode(false);
    setCompanyForm(createEmptyCompanyForm());
    setCompanyError('');
  };

  const resetCompanyForm = () => {
    void loadCompanyRecords();
  };

  const openCompanyEditMode = () => {
    setCompanyError('');
    setIsCompanyEditMode(true);
  };

  const handleCompanyFieldChange = (key: string, value: string) => {
    setCompanyForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCompany = async () => {
    if (!String(companyForm.name || '').trim()) {
      setCompanyError('Company Name is required');
      return;
    }

    try {
      setIsSavingCompany(true);
      setCompanyError('');
      if (editingCompanyCode) {
        await codeService.update('company', editingCompanyCode, companyForm);
      } else {
        await codeService.create('company', companyForm);
      }
      await loadCompanyRecords();
    } catch (error: any) {
      setCompanyError(error?.response?.data?.message || error?.message || 'Failed to save company information');
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <div className={`no-print ${sidebarOpen ? 'w-64' : 'w-24'} transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-800 border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-lg'} border-r flex flex-col`}>
        
        {/* Logo Section */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300`}>
          <div className={sidebarOpen ? 'space-y-4' : 'flex justify-center'}>
            <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
              <div className="text-4xl">📋</div>
              {sidebarOpen && (
                <div className="min-w-0 overflow-hidden">
                  <span className={`block font-bold text-lg whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Doc Key
                  </span>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Document Management
                  </p>
                </div>
              )}
            </div>

            {sidebarOpen && (
              <div className={`rounded-2xl border px-3 py-2 ${tokenExpiryTone}`}>
                <p className="text-xs font-medium leading-5 opacity-90">{tokenExpiryInlineText}</p>
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
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${getMenuItemClasses(currentPage === item.id || (item.id === 'documents' && isDocumentSectionActive) || (item.id === 'codes' && isCodeSectionActive))}`}
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
                        {sidebarCounts.quotation + sidebarCounts.invoice + sidebarCounts.receipt + sidebarCounts.purchaseOrder + sidebarCounts.workOrder}
                      </span>
                    )}
                    {/* Count badge for Codes */}
                    {item.id === 'codes' && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isCodeSectionActive ? 'bg-white/20 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {sidebarCounts.customer + sidebarCounts.product + sidebarCounts.vendor + sidebarCounts.destination + sidebarCounts.paymentTerm + sidebarCounts.endUser}
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
                        aria-label={(openSubmenus as Record<string, boolean>)[item.id] ? `Collapse ${item.label} submenu` : `Expand ${item.label} submenu`}
                        title={(openSubmenus as Record<string, boolean>)[item.id] ? 'Collapse submenu' : 'Expand submenu'}
                      >
                        {(openSubmenus as Record<string, boolean>)[item.id] ? '▾' : '▸'}
                      </button>
                    )}
                    {/* Active page indicator bar */}
                    {(currentPage === item.id || (item.id === 'documents' && isDocumentSectionActive) || (item.id === 'codes' && isCodeSectionActive)) && (
                      <div className="w-1 h-6 bg-white rounded-full"></div>
                    )}
                  </div>
                )}
              </a>

              {item.id === 'documents' && sidebarOpen && openSubmenus.documents && (
                renderSubmenu(documentSubmenu)
              )}

              {item.id === 'codes' && sidebarOpen && openSubmenus.codes && (
                renderSubmenu(codeSubmenu)
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
                if (!label && currentPage === 'invoice-home') label = '🧾 Invoice Documents';
                if (!label && currentPage === 'key-invoice') label = '🧾 Invoice Document';
                if (!label && currentPage === 'customer-code') label = '🏢 Customer Codes';
                if (!label && currentPage === 'product-code') label = '📦 Product Codes';
                if (!label && currentPage === 'vendor-code') label = '🚚 Vendor Codes';
                if (!label && currentPage === 'company-info') label = '🏛️ Company Info';
                if (!label && currentPage === 'destination-code') label = '📍 Destination Codes';
                if (!label && currentPage === 'payment-term-code') label = '💳 Payment Term Codes';
                if (!label && currentPage === 'end-user-code') label = '👤 End User Codes';
                if (!label && currentPage === 'user-management') label = '👥 User Management';
                if (!label && currentPage === 'token-status') label = '🪪 Token Status';
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
                    void showAppAlert({ title: 'Coming Soon', message: 'Profile page is coming soon.', tone: 'info' });
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
                    void showAppAlert({ title: 'Coming Soon', message: 'Edit profile page is coming soon.', tone: 'info' });
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
                    void showAppAlert({ title: 'Coming Soon', message: 'Change password page is coming soon.', tone: 'info' });
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
                  href="#company-info"
                  onClick={(e) => {
                    e.preventDefault();
                    void openCompanyModal();
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    canShowAdminNavigation
                      ? darkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                      : 'hidden'
                  }`}
                >
                  🏛️ Company Info
                </a>
                <a
                  href="#user-management"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowUserMenu(false);
                    onNavigate('user-management');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    canShowAdminNavigation
                      ? darkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                      : 'hidden'
                  }`}
                >
                  👥 Manage Users
                </a>
                <a
                  href="#token-status"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowUserMenu(false);
                    onNavigate('token-status');
                  }}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    canShowAdminNavigation
                      ? darkMode
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                      : 'hidden'
                  }`}
                >
                  🪪 Token Status
                </a>
                <a
                  href="#settings"
                  onClick={(e) => {
                    e.preventDefault();
                    void showAppAlert({ title: 'Coming Soon', message: 'Settings page is coming soon.', tone: 'info' });
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

        {companyModalOpen ? (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 px-4 py-8">
            <div className="flex min-h-full items-center justify-center">
              <div className={`max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border shadow-2xl ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                <div className={`flex items-center justify-between border-b px-6 py-5 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Administrator</p>
                    <h2 className={`mt-1 text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Company Info</h2>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>จัดการข้อมูลบริษัท โลโก้ ข้อมูลภาษี และบัญชีธนาคารจาก popup เดียว</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetCompanyForm();
                        void loadCompanyRecords();
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={closeCompanyModal}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className={`max-h-[calc(90vh-96px)] overflow-y-auto ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
                  <div className="p-6">
                    <div className={`sticky top-0 z-10 -mx-6 mb-5 flex items-center justify-between gap-3 border-b px-6 py-4 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Company Settings</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ใช้ข้อมูลบริษัทเดียวสำหรับเอกสารที่ส่งให้ลูกค้า เช่น Quotation</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${String(companyForm.isActive ?? 'true') === 'true' ? (darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700')}`}>
                          {String(companyForm.isActive ?? 'true') === 'true' ? 'Active' : 'Inactive'}
                        </span>
                        {editingCompanyCode && !isCompanyEditMode ? (
                          <button
                            type="button"
                            onClick={openCompanyEditMode}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>
                        ) : null}
                        {isCompanyEditMode ? (
                          <button
                            type="button"
                            onClick={() => void handleSaveCompany()}
                            disabled={isSavingCompany}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                          >
                            {isSavingCompany ? 'Saving...' : 'Save'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={resetCompanyForm}
                          className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                        >
                          Reload
                        </button>
                      </div>
                    </div>

                    {companyError ? (
                      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {companyError}
                      </div>
                    ) : null}

                    {isLoadingCompany ? (
                      <div className={`mb-6 rounded-2xl border px-6 py-12 text-center text-sm ${darkMode ? 'border-gray-700 bg-gray-900 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
                        Loading company information...
                      </div>
                    ) : null}

                    <div className={`mb-6 rounded-2xl border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Company Code</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {editingCompanyCode || 'Will be generated automatically on first save'}
                        </p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          ULID Auto
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[
                        { key: 'name', label: 'Company Name', required: true },
                        { key: 'nameEn', label: 'Company Name (EN)' },
                        { key: 'taxId', label: 'Tax ID' },
                        { key: 'branch', label: 'Branch' },
                        { key: 'phone', label: 'Phone' },
                        { key: 'email', label: 'Email', type: 'email' },
                        { key: 'website', label: 'Website' },
                        { key: 'bankName', label: 'Bank Name' },
                        { key: 'bankAccount', label: 'Bank Account' },
                        { key: 'accountName', label: 'Account Name' },
                        { key: 'logoUrl', label: 'Logo URL' },
                        { key: 'signatureUrl', label: 'Signature URL' },
                      ].map((field) => (
                        <label key={field.key} className="flex flex-col gap-2 text-sm">
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{field.label}{field.required ? ' *' : ''}</span>
                          <input
                            type={field.type || 'text'}
                            value={companyForm[field.key] ?? ''}
                            disabled={!isCompanyEditMode}
                            onChange={(e) => handleCompanyFieldChange(field.key, e.target.value)}
                            className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900 text-white disabled:bg-gray-800 disabled:text-gray-500' : 'border-gray-300 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500'}`}
                          />
                        </label>
                      ))}

                      <label className="flex flex-col gap-2 text-sm">
                        <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Active</span>
                        <select
                          value={companyForm.isActive ?? 'true'}
                          disabled={!isCompanyEditMode}
                          onChange={(e) => handleCompanyFieldChange('isActive', e.target.value)}
                          className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>

                      <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                        <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Address</span>
                        <textarea
                          rows={4}
                          value={companyForm.address ?? ''}
                          disabled={!isCompanyEditMode}
                          onChange={(e) => handleCompanyFieldChange('address', e.target.value)}
                          className={`rounded-lg border px-4 py-3 ${darkMode ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                        />
                      </label>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCompanyForm(createEmptyCompanyForm())}
                        disabled={!isCompanyEditMode}
                        className={`rounded-lg px-4 py-3 text-sm font-medium ${darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveCompany()}
                        disabled={isSavingCompany || !isCompanyEditMode}
                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                      >
                        {isSavingCompany ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
