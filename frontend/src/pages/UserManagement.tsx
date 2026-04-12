import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout/Layout';
import userService, { DocKeyUser } from '../services/userService';
import useThemePreference from '../hooks/useThemePreference';
import { showAppConfirm } from '../services/dialogService';

const roleOptions = [
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'User' },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
};

const emptyForm = { name: '', email: '', password: '', role: 'user' as 'admin' | 'user' };

export default function UserManagement({ onNavigate = () => {}, currentPage = 'user-management' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();

  // ── data state ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<DocKeyUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // ── ui state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);

  // ── stable refs (avoid stale closures in interval) ───────────────────────
  const currentUserIdRef = useRef('');
  const isSavingRef = useRef(false);

  // ── fetch helpers ─────────────────────────────────────────────────────────
  const fetchAllUsers = useCallback(async (): Promise<DocKeyUser[] | null> => {
    try {
      const res = await userService.getAll();
      return (res.data?.data ?? []) as DocKeyUser[];
    } catch {
      return null;
    }
  }, []);

  const applyPresence = useCallback((list: DocKeyUser[], meId: string): DocKeyUser[] => {
    if (!meId) return list;
    return list.map((u) =>
      u.id === meId ? { ...u, online: true, lastSeenAt: new Date().toISOString() } : u,
    );
  }, []);

  // Full reload — shows spinner, used on mount and after mutations
  const reloadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const data = await fetchAllUsers();
    setIsLoading(false);
    if (data === null) {
      setError('โหลดข้อมูลผู้ใช้งานไม่สำเร็จ');
      return;
    }
    setUsers(applyPresence(data, currentUserIdRef.current));
  }, [fetchAllUsers, applyPresence]);

  // Silent refresh — interval, no spinner
  const silentRefresh = useCallback(async () => {
    const data = await fetchAllUsers();
    if (data !== null) {
      setUsers(applyPresence(data, currentUserIdRef.current));
    }
  }, [fetchAllUsers, applyPresence]);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        const profile = res.data?.user;
        const uid = profile?.id ?? '';
        const admin = String(profile?.role ?? '').toLowerCase() === 'admin';
        setCurrentUserId(uid);
        currentUserIdRef.current = uid;
        setIsAdmin(admin);
        if (!admin) {
          setError('เฉพาะ admin เท่านั้นที่เข้าถึงหน้านี้ได้');
          setIsLoading(false);
          return;
        }
        // Load users after confirming admin
        setIsLoading(true);
        setError('');
        const data = await fetchAllUsers();
        setIsLoading(false);
        if (data === null) {
          setError('โหลดข้อมูลผู้ใช้งานไม่สำเร็จ');
          return;
        }
        setUsers(applyPresence(data, uid));
      } catch (e: any) {
        setIsLoading(false);
        setError(e?.response?.data?.message ?? e?.message ?? 'เกิดข้อผิดพลาด');
      }
    };
    void init();
  }, [fetchAllUsers, applyPresence]);

  // ── presence polling (every 5 s, skip during save) ───────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isSavingRef.current) void silentRefresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [silentRefresh]);

  // ── derived data ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return users;
    return users.filter((u) =>
      [u.name, u.email, u.role].some((v) => String(v ?? '').toLowerCase().includes(kw)),
    );
  }, [users, search]);

  const summary = useMemo(() => {
    const admins = users.filter((u) => u.role === 'admin').length;
    const online = users.filter((u) => u.online).length;
    return [
      { label: 'Total Users', value: users.length, tone: 'blue' },
      { label: 'Administrators', value: admins, tone: 'green' },
      { label: 'Standard Users', value: users.length - admins, tone: 'amber' },
      { label: 'Online', value: online, tone: 'green' },
      { label: 'Offline', value: users.length - online, tone: 'rose' },
    ];
  }, [users]);

  // ── form helpers ──────────────────────────────────────────────────────────
  const closeForm = () => {
    setFormOpen(false);
    setEditingUserId(null);
    setFormValues(emptyForm);
    setError('');
  };

  const openAdd = () => {
    setEditingUserId(null);
    setFormValues(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const openEdit = (u: DocKeyUser) => {
    setEditingUserId(u.id);
    setFormValues({ name: u.name, email: u.email, password: '', role: u.role });
    setError('');
    setFormOpen(true);
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formValues.name.trim() || !formValues.email.trim()) {
      setError('กรุณากรอก Name และ Email');
      return;
    }
    if (!editingUserId && !formValues.password) {
      setError('กรุณากรอก Password');
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    setError('');

    try {
      if (editingUserId) {
        await userService.update(editingUserId, {
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          role: formValues.role,
          ...(formValues.password ? { password: formValues.password } : {}),
        });
      } else {
        await userService.create({
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
          role: formValues.role,
        });
      }
      closeForm();
      await reloadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (u: DocKeyUser) => {
    const ok = await showAppConfirm({
      title: 'Delete User',
      message: `ลบ ${u.name} (${u.email})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });
    if (!ok) return;

    setError('');
    try {
      await userService.delete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      void silentRefresh();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'ลบไม่สำเร็จ');
    }
  };

  // ── colour helpers ────────────────────────────────────────────────────────
  const tone = (t: string) => ({
    green: darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700',
    rose:  darkMode ? 'bg-red-500/15 text-red-300'   : 'bg-red-100 text-red-700',
    amber: darkMode ? 'bg-amber-500/15 text-amber-300': 'bg-amber-100 text-amber-700',
    blue:  darkMode ? 'bg-blue-500/15 text-blue-300'  : 'bg-blue-100 text-blue-700',
  }[t] ?? '');

  const card  = `rounded-2xl border shadow-sm ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`;
  const input = `rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-gray-600 bg-gray-900 text-white placeholder:text-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'}`;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Layout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate} currentPage={currentPage} topBarCaption="👥 User Management">
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="mx-auto max-w-7xl px-6 py-8">

          {/* ── header ── */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Administration</p>
              <h1 className={`mt-1 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Management</h1>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>จัดการผู้ใช้งาน กำหนดสิทธิ์ และดูสถานะออนไลน์</p>
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา ชื่อ / อีเมล / สิทธิ์"
                  className={input}
                />
                <button type="button" onClick={openAdd}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  + Add User
                </button>
                <button type="button" onClick={() => void reloadUsers()}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${darkMode ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  ↺ Refresh
                </button>
              </div>
            )}
          </div>

          {/* ── summary cards ── */}
          {isAdmin && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {summary.map((s) => (
                <div key={s.label} className={`${card} p-4`}>
                  <p className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone(s.tone)}`}>users</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── error banner ── */}
          {error && (
            <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* ── access denied ── */}
          {!isAdmin && !isLoading && (
            <div className={`${card} p-8 text-center`}>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>เฉพาะผู้ใช้งานที่มีสิทธิ์ Admin เท่านั้นที่เข้าถึงได้</p>
            </div>
          )}

          {/* ── user table ── */}
          {isAdmin && (
            <div className={card}>
              {/* table header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>User Registry</p>
                  <h2 className={`mt-0.5 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>System Users</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </span>
              </div>

              {isLoading ? (
                <div className={`py-16 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>กำลังโหลด...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">Role</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Updated</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className={`py-16 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {search ? 'ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา' : 'ยังไม่มีผู้ใช้งานในระบบ'}
                          </td>
                        </tr>
                      )}
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{u.name}</div>
                            {u.id === currentUserId && (
                              <div className={`mt-0.5 text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Current account</div>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === 'admin' ? tone('green') : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                              {u.role === 'admin' ? 'Administrator' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${u.online ? tone('green') : tone('rose')}`}>
                              <span className={`h-2 w-2 rounded-full ${u.online ? 'bg-green-500' : 'bg-red-500'}`} />
                              {u.online ? 'Online' : 'Offline'}
                            </div>
                            <div className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatDateTime(u.lastSeenAt ?? undefined)}
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDateTime(u.updatedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => openEdit(u)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                Edit
                              </button>
                              <button type="button" onClick={() => void handleDelete(u)}
                                disabled={u.id === currentUserId}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── modal form ── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
          <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            {/* modal header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {editingUserId ? 'Edit User' : 'Add User'}
                </p>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingUserId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                </h2>
              </div>
              <button type="button" onClick={closeForm}
                className={`rounded-lg p-2 text-sm transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}>
                ✕
              </button>
            </div>

            {/* modal body */}
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name <span className="text-red-500">*</span></span>
                <input
                  value={formValues.name}
                  onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
                  className={input}
                  placeholder="ชื่อ-นามสกุล"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email <span className="text-red-500">*</span></span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(e) => setFormValues((p) => ({ ...p, email: e.target.value }))}
                  className={input}
                  placeholder="email@example.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password {!editingUserId && <span className="text-red-500">*</span>}
                </span>
                <input
                  type="password"
                  value={formValues.password}
                  onChange={(e) => setFormValues((p) => ({ ...p, password: e.target.value }))}
                  className={input}
                  placeholder={editingUserId ? 'เว้นว่างเพื่อคงรหัสเดิม' : 'อย่างน้อย 6 ตัวอักษร'}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Role</span>
                <select
                  value={formValues.role}
                  onChange={(e) => setFormValues((p) => ({ ...p, role: e.target.value as 'admin' | 'user' }))}
                  className={input}
                >
                  {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>

            {/* modal footer */}
            <div className={`flex items-center justify-end gap-3 border-t px-6 py-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button type="button" onClick={closeForm}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={isSaving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">
                {isSaving ? 'กำลังบันทึก...' : editingUserId ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
