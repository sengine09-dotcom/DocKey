import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import MonitorHome from './pages/MonitorHome';
import KeyDocumentMonitor from './pages/KeyDocumentMonitor';
import InvoiceHome from './pages/InvoiceHome';
import KeyInvoice from './pages/KeyInvoice';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
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
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitors"
          element={
            <ProtectedRoute>
              <MonitorHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceHome />
            </ProtectedRoute>
          }
        />

        {/* Redirect to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
