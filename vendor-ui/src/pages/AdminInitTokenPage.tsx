import { FormEvent, useEffect, useState } from 'react';
import adminInitTokenService, { AdminInitToken } from '../services/adminInitTokenService';
import { formatDate, getExpiryWarning, toApiDateInput, toPickerDateInput } from '../utils/date';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const buildMailToLink = (tokenRecord: AdminInitToken) => {
  const subject = encodeURIComponent(`DocKey administrator activation for ${tokenRecord.customerName || 'your account'}`);
  const body = encodeURIComponent([
    'Hello,',
    '',
    'Please use the link below to activate your DocKey administrator account for the first time:',
    tokenRecord.claimUrl,
    '',
    'This link can only be used once.',
    '',
    'Regards,',
    'DocKey Vendor Team',
  ].join('\n'));

  return `mailto:${encodeURIComponent(tokenRecord.customerEmail || '')}?subject=${subject}&body=${body}`;
};

const getPresenceLabel = (tokenRecord: AdminInitToken) => {
  if (!tokenRecord.usedAt) {
    return { label: 'Pending Setup', dotClass: 'bg-slate-400', textClass: 'text-slate-500' };
  }

  if (tokenRecord.online) {
    return { label: 'Online', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700' };
  }

  return { label: 'Offline', dotClass: 'bg-rose-500', textClass: 'text-rose-700' };
};

const getExpiryDisplay = (tokenRecord: AdminInitToken) => {
  if (tokenRecord.warningLevel) {
    const textClass = tokenRecord.warningLevel === 'expired'
      ? 'text-slate-400'
      : tokenRecord.warningLevel === 'critical'
      ? 'font-semibold text-rose-600'
      : tokenRecord.warningLevel === 'warning'
      ? 'font-semibold text-amber-600'
      : 'text-slate-600';

    const messageClass = tokenRecord.warningLevel === 'expired'
      ? 'text-slate-400'
      : tokenRecord.warningLevel === 'critical'
      ? 'text-rose-600'
      : tokenRecord.warningLevel === 'warning'
      ? 'text-amber-600'
      : 'text-slate-500';

    return {
      formattedDate: tokenRecord.expiryDateLabel || formatDate(tokenRecord.expiresAt),
      textClass,
      message: tokenRecord.expiryMessage || null,
      messageClass,
    };
  }

  return getExpiryWarning(tokenRecord.expiresAt);
};

const validateTokenForm = (form: {
  customerName: string;
  customerEmail: string;
  description: string;
  expiresAt: string;
}) => {
  const customerName = form.customerName.trim();
  const customerEmail = form.customerEmail.trim().toLowerCase();
  const description = form.description.trim();
  const expiresAt = toApiDateInput(form.expiresAt);

  if (!customerName) {
    return { valid: false, message: 'Customer name is required.' };
  }

  if (customerName.length > 255) {
    return { valid: false, message: 'Customer name must be 255 characters or fewer.' };
  }

  if (!customerEmail) {
    return { valid: false, message: 'Customer email is required.' };
  }

  if (customerEmail.length > 191) {
    return { valid: false, message: 'Customer email must be 191 characters or fewer.' };
  }

  if (!EMAIL_PATTERN.test(customerEmail)) {
    return { valid: false, message: 'Customer email format is invalid.' };
  }

  if (description.length > 255) {
    return { valid: false, message: 'Description must be 255 characters or fewer.' };
  }

  if (expiresAt === null) {
    return { valid: false, message: 'Please select a valid expiry date.' };
  }

  return {
    valid: true,
    data: {
      customerName,
      customerEmail,
      description,
      expiresAt,
    },
  };
};

export default function AdminInitTokenPage() {
  const [tokens, setTokens] = useState<AdminInitToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    description: '',
    expiresAt: '',
  });

  const loadTokens = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const nextTokens = await adminInitTokenService.list();
      setTokens(nextTokens);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load tokens');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadTokens();

    const intervalId = window.setInterval(() => {
      void loadTokens({ silent: true });
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadTokens({ silent: true });
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const resetForm = () => {
    setEditingId('');
    setForm({
      customerName: '',
      customerEmail: '',
      description: '',
      expiresAt: '',
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateTokenForm(form);

    if (!validation.valid) {
      setError(validation.message || '');
      return;
    }

    const confirmed = window.confirm(
      editingId
        ? `Confirm updating token for ${validation.data?.customerName}?`
        : `Confirm creating token for ${validation.data?.customerName}?`
    );

    if (!confirmed) {
      return;
    }

    if (!validation.data) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingId) {
        const updated = await adminInitTokenService.update(editingId, {
          ...validation.data,
        });
        setTokens((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await adminInitTokenService.create({
          ...validation.data,
        });
        setTokens((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || (editingId ? 'Failed to update token' : 'Failed to create token'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tokenRecord: AdminInitToken) => {
    setEditingId(tokenRecord.id);
    setError('');
    setForm({
      customerName: tokenRecord.customerName || '',
      customerEmail: tokenRecord.customerEmail || '',
      description: tokenRecord.description || '',
      expiresAt: toPickerDateInput(tokenRecord.expiresAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setError('');
    resetForm();
  };

  const handleDisable = async (tokenId: string) => {
    try {
      const updated = await adminInitTokenService.disable(tokenId);
      setTokens((prev) => prev.map((item) => (item.id === tokenId ? updated : item)));
    } catch (disableError: any) {
      setError(disableError?.response?.data?.message || 'Failed to disable token');
    }
  };

  const handleDelete = async (tokenRecord: AdminInitToken) => {
    const confirmed = window.confirm(
      `Confirm deleting token for ${tokenRecord.customerName || tokenRecord.customerEmail || tokenRecord.token}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(tokenRecord.id);
      setError('');
      await adminInitTokenService.remove(tokenRecord.id);
      setTokens((prev) => prev.filter((item) => item.id !== tokenRecord.id));
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || 'Failed to delete token');
    } finally {
      setDeletingId('');
    }
  };

  const handleCopy = async (tokenRecord: AdminInitToken) => {
    try {
      await navigator.clipboard.writeText(tokenRecord.claimUrl);
      setCopiedId(tokenRecord.id);
      window.setTimeout(() => setCopiedId(''), 1600);
    } catch (_error) {
      setError('Failed to copy claim URL');
    }
  };

  const handleSendEmail = (tokenRecord: AdminInitToken) => {
    if (!tokenRecord.customerEmail) {
      setError('Customer email is required before sending token by email.');
      return;
    }

    window.location.href = buildMailToLink(tokenRecord);
  };

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">Vendor Console</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Admin Init Token Manager</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              สร้าง one-time token สำหรับลูกค้า แล้วส่งลิงก์ setup admin ครั้งแรกให้ใช้งานได้ทันที
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTokens()}
            className="vendor-button-secondary"
          >
            Reload Tokens
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <div className="vendor-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{editingId ? 'Edit Token' : 'Create Token'}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{editingId ? 'Update customer link' : 'New customer link'}</h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="vendor-label">Customer Name</label>
                <input
                  value={form.customerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                  className="vendor-field"
                  placeholder="Acme Trading Sdn. Bhd."
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label className="vendor-label">Customer Email</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                  className="vendor-field"
                  placeholder="owner@customer.com"
                  maxLength={191}
                  required
                />
              </div>

              <div>
                <label className="vendor-label">Expire Date</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                  className="vendor-field"                  
                />
                <p className="mt-2 text-xs text-slate-500">
                  {form.expiresAt ? `Selected date: ${formatDate(form.expiresAt)}` : 'Select the expiry date from the calendar dialog.'}
                </p>
              </div>

              <div>
                <label className="vendor-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="vendor-field min-h-[110px]"
                  placeholder="Internal note for this customer activation"
                  maxLength={255}
                />
                <p className="mt-2 text-xs text-slate-500">Description is optional, up to 255 characters.</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl border-2 border-slate-950 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (editingId ? 'Saving changes...' : 'Generating token...') : editingId ? 'Save Changes' : 'Generate Token'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          <div className="vendor-panel overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-slate-300 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">Token Registry</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Issued admin claim links</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {tokens.length} token{tokens.length === 1 ? '' : 's'}
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">Loading tokens...</div>
            ) : tokens.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">No admin init tokens created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y-2 divide-slate-500 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Expires</th>
                      <th className="px-6 py-4">Claim URL</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-600 bg-white text-slate-700">
                    {tokens.map((tokenRecord) => {
                      const presence = getPresenceLabel(tokenRecord);
                      const expiryWarning = getExpiryDisplay(tokenRecord);
                      const statusLabel = tokenRecord.usedAt
                        ? 'Used'
                        : tokenRecord.isActive
                        ? 'Active'
                        : 'Disabled';

                      const statusClass = tokenRecord.usedAt
                        ? 'bg-amber-100 text-amber-700'
                        : tokenRecord.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-700';

                      return (
                        <tr key={tokenRecord.id} className="align-top">
                          <td className="px-6 py-5">
                            <div className="font-medium text-slate-900">{tokenRecord.customerName || '-'}</div>
                            <div className="mt-1 text-xs text-slate-500">{tokenRecord.customerEmail || 'No email specified'}</div>
                            <div className="mt-2 text-xs text-slate-400">Created {formatDateTime(tokenRecord.createdAt)}</div>
                            <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${presence.textClass}`}>
                              <span className={`h-2.5 w-2.5 rounded-full ${presence.dotClass}`}></span>
                              {presence.label}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                            <div className="mt-2 text-xs text-slate-500">
                              {tokenRecord.usedAt ? `Used by ${tokenRecord.usedByEmail || '-'} on ${formatDateTime(tokenRecord.usedAt)}` : 'Not claimed yet'}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              Last Seen: {formatDateTime(tokenRecord.lastSeenAt)}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={`text-xs ${expiryWarning.textClass}`}>{expiryWarning.formattedDate}</div>
                            {expiryWarning.message && (
                              <div className={`mt-1 text-xs font-medium ${expiryWarning.messageClass}`}>
                                {expiryWarning.message}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="max-w-[320px] rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                              Activation link ready
                            </div>
                            {tokenRecord.description && (
                              <div className="mt-2 text-xs text-slate-500">{tokenRecord.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => window.open(tokenRecord.claimUrl, '_blank', 'noopener,noreferrer')}
                                className="rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                              >
                                Open Link
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendEmail(tokenRecord)}
                                disabled={!tokenRecord.customerEmail}
                                className="rounded-xl border-2 border-sky-400 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 transition hover:border-sky-500 hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                Send Email
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopy(tokenRecord)}
                                className="rounded-xl border-2 border-slate-400 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                              >
                                {copiedId === tokenRecord.id ? 'Copied' : 'Copy Link'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(tokenRecord)}
                                className="rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:border-amber-500 hover:bg-amber-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDisable(tokenRecord.id)}
                                disabled={!tokenRecord.isActive || Boolean(tokenRecord.usedAt)}
                                className="rounded-xl border-2 border-rose-700 bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                              >
                                Disable
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(tokenRecord)}
                                disabled={deletingId === tokenRecord.id}
                                className="rounded-xl border-2 border-rose-300 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {deletingId === tokenRecord.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}