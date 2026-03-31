import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout/Layout';
import useThemePreference from '../hooks/useThemePreference';
import { formatDate, formatDateTime } from '../utils/date';

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
  expiryMessage?: string | null;
  expiryShortLabel?: string | null;
  expiryDateLabel?: string | null;
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

  const expiryStatus = useMemo(() => {
    if (!status) {
      return {
        formattedDate: '-',
        daysUntilExpiry: null as number | null,
        level: 'none' as 'none' | 'healthy' | 'warning' | 'critical' | 'expired',
        message: '',
      };
    }

    if (!status.expiresAt) {
      return {
        formattedDate: status.expiryDateLabel || '-',
        daysUntilExpiry: null as number | null,
        level: 'none' as 'none' | 'healthy' | 'warning' | 'critical' | 'expired',
        message: status.expiryMessage || 'Token นี้ไม่มีวันหมดอายุ',
      };
    }

    if (status.expiryMessage) {
      return {
        formattedDate: status.expiryDateLabel || formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: status.warningLevel,
        message: status.expiryMessage,
      };
    }

    if (status.warningLevel === 'expired') {
      return {
        formattedDate: formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: 'expired' as const,
        message: 'Token นี้หมดอายุแล้ว กรุณาติดต่อ vendor เพื่อออก token ใหม่',
      };
    }

    if (status.warningLevel === 'critical' && status.daysUntilExpiry === 0) {
      return {
        formattedDate: formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: 'critical' as const,
        message: 'Token นี้หมดอายุวันนี้',
      };
    }

    if (status.warningLevel === 'critical' && status.daysUntilExpiry === 1) {
      return {
        formattedDate: formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: 'critical' as const,
        message: 'Token นี้จะหมดอายุพรุ่งนี้',
      };
    }

    if (status.warningLevel === 'critical') {
      return {
        formattedDate: formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: 'critical' as const,
        message: `Token นี้ใกล้หมดอายุ เหลืออีก ${status.daysUntilExpiry} วัน`,
      };
    }

    if (status.warningLevel === 'warning') {
      return {
        formattedDate: formatDate(status.expiresAt),
        daysUntilExpiry: status.daysUntilExpiry,
        level: 'warning' as const,
        message: `Token นี้ใกล้หมดอายุในอีก ${status.daysUntilExpiry} วัน`,
      };
    }

    return {
      formattedDate: formatDate(status.expiresAt),
      daysUntilExpiry: status.daysUntilExpiry,
      level: 'healthy' as const,
      message: status.daysUntilExpiry == null
        ? 'Token นี้ยังใช้งานได้'
        : `Token นี้ยังใช้งานได้ อีก ${status.daysUntilExpiry} วันก่อนหมดอายุ`,
    };
  }, [status]);

  const warningCardClass = useMemo(() => {
    if (!status) return '';
    if (expiryStatus.level === 'expired' || expiryStatus.level === 'critical') {
      return darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700';
    }
    if (expiryStatus.level === 'warning') {
      return darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700';
    }
    return darkMode ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-green-200 bg-green-50 text-green-700';
  }, [darkMode, expiryStatus.level, status]);

  const warningText = useMemo(() => {
    if (!status) return '';
    return expiryStatus.message;
  }, [expiryStatus.message, status]);

  const expiryDateClass = useMemo(() => {
    if (expiryStatus.level === 'expired') {
      return darkMode ? 'font-semibold text-red-300' : 'font-semibold text-red-600';
    }
    if (expiryStatus.level === 'critical') {
      return darkMode ? 'font-semibold text-red-300' : 'font-semibold text-red-600';
    }
    if (expiryStatus.level === 'warning') {
      return darkMode ? 'font-semibold text-amber-300' : 'font-semibold text-amber-600';
    }
    return darkMode ? 'text-white' : 'text-gray-900';
  }, [darkMode, expiryStatus.level]);

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
              <div className={`mb-8 overflow-hidden rounded-3xl border ${warningCardClass}`}>
                <div className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">Expiry Status</p>
                    <h2 className="mt-2 text-2xl font-semibold">{warningText}</h2>
                  </div>
                  <div className={`min-w-[220px] rounded-2xl border px-4 py-4 text-right ${darkMode ? 'border-white/10 bg-black/10' : 'border-white/70 bg-white/70'}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Expire Date</p>
                    <p className={`mt-2 text-2xl font-bold ${expiryDateClass}`}>{expiryStatus.formattedDate}</p>
                    <p className="mt-1 text-xs opacity-80">
                      {expiryStatus.daysUntilExpiry == null
                        ? 'No expiry limit'
                        : expiryStatus.daysUntilExpiry < 0
                        ? 'Expired'
                        : `${expiryStatus.daysUntilExpiry} day(s) remaining`}
                    </p>
                  </div>
                </div>
              </div>

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
                    <div className="flex justify-between gap-4"><dt className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Expires At</dt><dd className={expiryDateClass}>{expiryStatus.formattedDate}</dd></div>
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