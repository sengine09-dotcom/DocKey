import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import MonitorHome from './pages/MonitorHome';
import KeyDocumentMonitor from './pages/KeyDocumentMonitor';
import InvoiceHome from './pages/InvoiceHome';
import KeyInvoice from './pages/KeyInvoice';
import CodeMaster from './pages/CodeMaster';
import './index.css';

const pageRouteMap: Record<string, string> = {
  dashboard: '/dashboard',
  documents: '/documents',
  'monitor-home': '/documents/monitor',
  'key-monitor': '/documents/monitor/detail',
  'invoice-home': '/documents/invoice',
  'key-invoice': '/documents/invoice/detail',
  'customer-code': '/codes/customer',
  'product-code': '/codes/product',
  'destination-code': '/codes/destination',
  'payment-term-code': '/codes/payment-term',
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        await axios.get('/api/auth/me');
        if (mounted) {
          setIsAuthenticated(true);
        }
      } catch (_error) {
        if (mounted) {
          setIsAuthenticated(false);
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

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoutedPage({
  component: Component,
  currentPage,
  useLocationState = false,
}: {
  component: React.ComponentType<any>;
  currentPage?: string;
  useLocationState?: boolean;
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
        onNavigate={handleNavigate}
        currentPage={currentPage}
        initialData={useLocationState ? location.state : null}
      />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          path="/documents/monitor"
          element={<RoutedPage component={MonitorHome} currentPage="monitor-home" />}
        />
        <Route
          path="/documents/monitor/detail"
          element={<RoutedPage component={KeyDocumentMonitor} currentPage="key-monitor" useLocationState={true} />}
        />
        <Route
          path="/documents/invoice"
          element={<RoutedPage component={InvoiceHome} currentPage="invoice-home" />}
        />
        <Route
          path="/documents/invoice/detail"
          element={<RoutedPage component={KeyInvoice} currentPage="key-invoice" useLocationState={true} />}
        />
        <Route path="/monitors" element={<Navigate to="/documents/monitor" replace />} />
        <Route path="/monitors/detail" element={<Navigate to="/documents/monitor/detail" replace />} />
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
          path="/codes/destination"
          element={<RoutedPage component={CodeMaster} currentPage="destination-code" />}
        />
        <Route
          path="/codes/payment-term"
          element={<RoutedPage component={CodeMaster} currentPage="payment-term-code" />}
        />

        {/* Redirect to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
