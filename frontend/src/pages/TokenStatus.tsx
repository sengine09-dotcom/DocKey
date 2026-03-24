import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout/Layout';
import useThemePreference from '../hooks/useThemePreference';

type TokenStatusResponse = {
  token: string;
  adminEmail?: string | null;
  activatedAt?: string | null;
  vendorReachable: boolean;
  active: boolean;
  reason?: string | null;
  expiresAt?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  usedAt?: string | null;
  warningLevel: 'none' | 'healthy' | 'warning' | 'critical' | 'expired';
  daysUntilExpiry: number | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

export default function TokenStatus({ onNavigate = () => {}, currentPage = 'token-status' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [status, setStatus] = useState<TokenStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setIsLoading(true);
    }

    try {
      setError('');
      const response = await axios.get('/api/auth/token-status');
      setStatus(response.data?.data || null);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load token status');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadStatus();

    const intervalId = window.setInterval(() => {
      void loadStatus({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const summary = useMemo(() => {
    if (!status) {
      return [] as Array<{ label: string; value: string; tone: 'blue' | 'green' | 'amber' | 'red' }>;
    }

    return [
      { label: 'Token State', value: status.active ? 'Active' : 'Inactive', tone: status.active ? 'green' : 'red' },
      { label: 'Vendor Link', value: status.vendorReachable ? 'Connected' : 'Unavailable', tone: status.vendorReachable ? 'blue' : 'amber' },
      { label: 'Days Until Expiry', value: status.daysUntilExpiry == null ? 'No expiry' : String(status.daysUntilExpiry), tone: status.warningLevel === 'critical' || status.warningLevel === 'expired' ? 'red' : status.warningLevel === 'warning' ? 'amber' : 'green' },
    ];
  }, [status]);

  const warningCardClass = useMemo(() => {
    if (!status) return '';
    if (status.warningLevel === 'expired' || status.warningLevel === 'critical') {
      return darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700';
    }
    if (status.warningLevel === 'warning') {
      return darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return darkMode ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-green-200 bg-green-50 text-green-700';
  }, [darkMode, status]);

  const warningText = useMemo(() => {
    if (!status) return '';
    if (!status.expiresAt) return 'This token does not have an expiry date.';
    if (status.warningLevel === 'expired') return 'This token has already expired. Please contact the vendor immediately.';
    if (status.warningLevel === 'critical') return `This token will expire very soon. ${status.daysUntilExpiry} day(s) remaining.`;
    if (status.warningLevel === 'warning') return `This token is approaching expiry. ${status.daysUntilExpiry} day(s) remaining.`;
    return 'Token status is healthy and no expiry warning is active.';
  }, [status]);

  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="🪪 Token Status">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Administration</p>
              <h1 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Token Status</h1>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ตรวจสอบสถานะ token ปัจจุบัน วันหมดอายุ และการเชื่อมต่อกับ vendor service</p>
            </div>
            <button type="button" onClick={() => void loadStatus()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Refresh Status
            </button>
          </div>

          {error && (
            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-white text-gray-700'} shadow-sm`}>
              Loading token status...
            </div>
          ) : status ? (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                {summary.map((item) => (
                  <div key={item.label} className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone === 'green' ? darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700' : item.tone === 'amber' ? darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700' : item.tone === 'red' ? darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700' : darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        🪪 Token
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${warningCardClass}`}>
                {warningText}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={`rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Activation Details</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Token</dt><dd className={`break-all text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{status.token}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Admin Email</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{status.adminEmail || '-'}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Activated At</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{formatDateTime(status.activatedAt)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Used At</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{formatDateTime(status.usedAt)}</dd></div>
                  </dl>
                </div>

                <div className={`rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Vendor Status</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Vendor Reachable</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{status.vendorReachable ? 'Yes' : 'No'}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Customer Name</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{status.customerName || '-'}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Customer Email</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{status.customerEmail || '-'}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Expires At</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{formatDateTime(status.expiresAt)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Status Reason</dt><dd className={darkMode ? 'text-white' : 'text-gray-900'}>{status.reason || '-'}</dd></div>
                  </dl>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}