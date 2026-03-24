import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

type TokenStatus = {
  valid: boolean;
  reason?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  description?: string | null;
  expiresAt?: string | null;
};

const reasonMessageMap: Record<string, string> = {
  'not-found': 'This admin activation link was not found.',
  disabled: 'This admin activation link has been disabled.',
  used: 'This admin activation link has already been used.',
  expired: 'This admin activation link has expired.',
  'admin-configured': 'Administrator has already been configured for this system.',
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

export default function InitAdmin() {
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('id') || '', []);
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setStatus({ valid: false, reason: 'not-found' });
        setIsChecking(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/init-admin/status', { params: { id: token } });
        const nextStatus = response.data?.data || { valid: false, reason: 'not-found' };
        setStatus(nextStatus);
        if (nextStatus.customerEmail) {
          setForm((prev) => ({ ...prev, email: nextStatus.customerEmail }));
        }
      } catch (statusError: any) {
        setStatus({ valid: false, reason: statusError?.response?.data?.reason || 'not-found' });
        setError(statusError?.response?.data?.message || 'Failed to validate activation link');
      } finally {
        setIsChecking(false);
      }
    };

    void checkToken();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post('/api/auth/init-admin/claim', {
        token,
        email: form.email,
        password: form.password,
      });

      navigate('/dashboard');
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || 'Failed to create administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-2xl shadow-slate-300/40 backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">DocKey Activation</p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">Claim your administrator account</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              ใช้ลิงก์นี้เพื่อตั้งค่า administrator สำหรับการใช้งานครั้งแรกของลูกค้า ระบบจะผูกสิทธิ์ admin ให้กับอีเมลที่คุณกรอก
            </p>

            <div className="mt-10 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer</p>
                <p className="mt-2 font-medium text-white">{status?.customerName || 'Pending validation'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assigned Email</p>
                <p className="mt-2">{status?.customerEmail || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Token Expiry</p>
                <p className="mt-2">{formatDateTime(status?.expiresAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Note</p>
                <p className="mt-2">{status?.description || '-'}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-10 md:px-12 md:py-14">
            {isChecking ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Validating activation link...</div>
            ) : status?.valid ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Step 1 of 1</p>
                <h2 className="mt-4 text-3xl font-semibold text-slate-900">Set administrator credentials</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  กำหนด Email และ Password ที่จะใช้เป็น administrator account ของระบบนี้ ระบบจะ login ให้ทันทีหลังจากตั้งค่าเสร็จ
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      placeholder="admin@customer.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      placeholder="Repeat your password"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Creating administrator...' : 'Activate Administrator'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Activation unavailable</p>
                <h2 className="mt-4 text-3xl font-semibold text-slate-900">This link cannot be used</h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">
                  {error || reasonMessageMap[String(status?.reason || 'not-found')] || 'This activation link is not available.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}