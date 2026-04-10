import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import InitAdmin from './pages/InitAdmin';
import ActivationLocked from './pages/ActivationLocked';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import InvoiceHome from './pages/InvoiceHome';
import KeyInvoice from './pages/KeyInvoice';
import CodeMaster from './pages/CodeMaster';
import UserManagement from './pages/UserManagement';
import TokenStatus from './pages/TokenStatus';
import DialogProvider from './components/DialogProvider';
import './index.css';
import Home from './pages/Home';
import RegisterCompany from './pages/RegisterCompany';

const pageRouteMap: Record<string, string> = {
  dashboard: '/dashboard',
  documents: '/documents',
  'invoice-home': '/documents/invoice',
  'key-invoice': '/documents/invoice/detail',
  'company-info': '/admin/company-info',
  'customer-code': '/codes/customer',
  'product-code': '/codes/product',
  'vendor-code': '/codes/vendor',
  'destination-code': '/codes/destination',
  'payment-term-code': '/codes/payment-term',
  'end-user-code': '/codes/end-user',
  'user-management': '/users',
  'token-status': '/token-status',
};

function ActivationAwareRoutes() {
  const location = useLocation();
  const [isCheckingActivation, setIsCheckingActivation] = useState(true);
  const [isActivated, setIsActivated] = useState(false);
  const [activationReason, setActivationReason] = useState<string | null>(null);
  const [activationToken, setActivationToken] = useState<string | null>(null);

  const loadActivationStatus = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setIsCheckingActivation(true);
    }

    try {
      const response = await axios.get('/api/auth/activation-status');
      setIsActivated(Boolean(response.data?.data?.activated));
      setActivationReason(response.data?.data?.reason || null);
      setActivationToken(response.data?.data?.token || null);
    } catch (_error) {
      setIsActivated(false);
      setActivationReason('activation-check-failed');
      setActivationToken(null);
    } finally {
      if (!silent) {
        setIsCheckingActivation(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) {
        return;
      }
      await loadActivationStatus();
    };

    void run();
    const intervalId = window.setInterval(() => {
      void loadActivationStatus({ silent: true });
    }, 10000);

    const handlePageHide = () => {
      navigator.sendBeacon('/api/auth/runtime-disconnect');
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  if (isCheckingActivation) {
    return <div className="min-h-screen flex items-center justify-center">Checking system activation...</div>;
  }

  if (!isActivated && location.pathname !== '/dockey/init/admin') {
    return (
      <Routes>
        <Route path="*" element={<ActivationLocked reason={activationReason} token={activationToken} onRefresh={() => void loadActivationStatus()} isRefreshing={isCheckingActivation} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path='/' element={<Home/>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-company" element={<RegisterCompany />} />
      <Route path="/dockey/init/admin" element={<InitAdmin />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={<RoutedPage component={Dashboard} currentPage="dashboard" />}
      />
      <Route
        path="/documents"
        element={<RoutedPage component={Documents} currentPage="documents" useLocationState={true} />}
      />
      <Route
        path="/documents/invoice"
        element={<RoutedPage component={InvoiceHome} currentPage="invoice-home" />}
      />
      <Route
        path="/documents/invoice/detail"
        element={<RoutedPage component={KeyInvoice} currentPage="key-invoice" useLocationState={true} />}
      />
      <Route
        path="/admin/company-info"
        element={<RoutedPage component={CodeMaster} currentPage="company-info" requireAdmin={true} />}
      />
      <Route path="/invoices" element={<Navigate to="/documents/invoice" replace />} />
      <Route path="/invoices/detail" element={<Navigate to="/documents/invoice/detail" replace />} />
      <Route
        path="/codes/customer"
        element={<RoutedPage component={CodeMaster} currentPage="customer-code" />}
      />
      <Route
        path="/codes/product"
        element={<RoutedPage component={CodeMaster} currentPage="product-code" />}
      />
      <Route
        path="/codes/vendor"
        element={<RoutedPage component={CodeMaster} currentPage="vendor-code" />}
      />
      <Route
        path="/codes/destination"
        element={<RoutedPage component={CodeMaster} currentPage="destination-code" />}
      />
      <Route
        path="/codes/payment-term"
        element={<RoutedPage component={CodeMaster} currentPage="payment-term-code" />}
      />
      <Route
        path="/codes/end-user"
        element={<RoutedPage component={CodeMaster} currentPage="end-user-code" />}
      />
      <Route
        path="/users"
        element={<RoutedPage component={UserManagement} currentPage="user-management" requireAdmin={true} />}
      />
      <Route
        path="/token-status"
        element={<RoutedPage component={TokenStatus} currentPage="token-status" requireAdmin={true} />}
      />

      {/* Redirect unknown to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const childElement = children as React.ReactElement<any>;
  const requiresAdmin = Boolean(childElement?.props?.requireAdmin);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        const role = String(response.data?.user?.role || '').toLowerCase();
        if (mounted) {
          setIsAuthenticated(true);
          setIsAdmin(role === 'admin');
          setAccessDenied(requiresAdmin && role !== 'admin');
        }
      } catch (_error) {
        if (mounted) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setAccessDenied(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Checking login...</div>;
  }

  if (isAuthenticated && requiresAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true }} />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoutedPage({
  component: Component,
  currentPage,
  useLocationState = false,
  requireAdmin = false,
}: {
  component: React.ComponentType<any>;
  currentPage?: string;
  useLocationState?: boolean;
  requireAdmin?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (page: string, state?: unknown) => {
    const path = pageRouteMap[page];
    if (!path) {
      return;
    }

    navigate(path, { state: state ?? null });
  };

  return (
    <ProtectedRoute>
      <Component
        requireAdmin={requireAdmin}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        initialData={useLocationState ? location.state : null}
      />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <DialogProvider>
      <Router>
        <ActivationAwareRoutes />
      </Router>
    </DialogProvider>
  );
}

export default App;