import { useEffect, useMemo, useState } from 'react';
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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

export default function UserManagement({ onNavigate = () => {}, currentPage = 'user-management' }: any) {
  const [darkMode, setDarkMode] = useThemePreference();
  const [users, setUsers] = useState<DocKeyUser[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const applyCurrentUserPresence = (items: DocKeyUser[], activeUserId?: string) => {
    if (!activeUserId) {
      return items;
    }

    return items.map((user) =>
      user.id === activeUserId
        ? {
            ...user,
            online: true,
            lastSeenAt: new Date().toISOString(),
          }
        : user
    );
  };

  const loadCurrentUser = async () => {
    const response = await axios.get('/api/auth/me');
    const profile = response.data?.user;
    const admin = String(profile?.role || '').toLowerCase() === 'admin';
    setIsAdmin(admin);
    setCurrentUserId(profile?.id || '');
    if (!admin) {
      setError('Only administrators can manage users.');
    }

    return profile;
  };

  const loadUsers = async (options?: { silent?: boolean; activeUserId?: string }) => {
    const silent = Boolean(options?.silent);

    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError('');
      const response = await userService.getAll();
      setUsers(applyCurrentUserPresence(response.data?.data || [], options?.activeUserId || currentUserId));
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load users');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const profile = await loadCurrentUser();
        await loadUsers({ activeUserId: profile?.id || '' });
      } catch (loadError: any) {
        setError(loadError?.response?.data?.message || loadError.message || 'Failed to load user management data');
      }
    };

    void run();

    const intervalId = window.setInterval(() => {
      void loadUsers({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [users, search]);

  const summary = useMemo(() => {
    const adminCount = users.filter((user) => user.role === 'admin').length;
    const onlineCount = users.filter((user) => Boolean(user.online)).length;
    const offlineCount = users.length - onlineCount;

    return [
      { label: 'Total Users', value: users.length, tone: 'blue' },
      { label: 'Administrators', value: adminCount, tone: 'green' },
      { label: 'Standard Users', value: users.length - adminCount, tone: 'amber' },
      { label: 'Online Users', value: onlineCount, tone: 'green' },
      { label: 'Offline Users', value: offlineCount, tone: 'rose' },
    ];
  }, [users]);

  const resetForm = () => {
    setEditingUserId(null);
    setFormValues({ name: '', email: '', password: '', role: 'user' });
    setFormOpen(false);
  };

  const openCreateForm = () => {
    setError('');
    setEditingUserId(null);
    setFormValues({ name: '', email: '', password: '', role: 'user' });
    setFormOpen(true);
  };

  const openEditForm = (user: DocKeyUser) => {
    setError('');
    setEditingUserId(user.id);
    setFormValues({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formValues.name.trim() || !formValues.email.trim()) {
      setError('Name and email are required');
      return;
    }

    if (!editingUserId && !formValues.password) {
      setError('Password is required when creating a user');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

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

      await loadUsers();
      resetForm();
    } catch (saveError: any) {
      setError(saveError?.response?.data?.message || saveError.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: DocKeyUser) => {
    const confirmed = await showAppConfirm({
      title: 'Delete User',
      message: `Delete ${user.name} (${user.email})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      await userService.delete(user.id);
      await loadUsers();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || deleteError.message || 'Failed to delete user');
    }
  };

  return (
    <Layout
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onNavigate={onNavigate}
      currentPage={currentPage}
      topBarCaption="👥 User Management"
    >
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Administration</p>
              <h1 className={`mt-2 text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>User Management</h1>
              <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                เพิ่มผู้ใช้งานใหม่ กำหนดสิทธิ์ และดูรายการผู้ใช้งานทั้งหมดได้จากหน้าเดียว
              </p>
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user name, email, or role"
                  className={`rounded-lg border px-4 py-2 text-sm ${
                    darkMode
                      ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summary.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.tone === 'green'
                      ? darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700'
                      : item.tone === 'rose'
                      ? darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700'
                      : item.tone === 'amber'
                      ? darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'
                      : darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    👤 Users
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {!isAdmin ? (
            <div className={`rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-white text-gray-700'} shadow-sm`}>
              เฉพาะผู้ใช้งานที่มีสิทธิ์ admin เท่านั้นที่สามารถเข้าถึงเมนูจัดการผู้ใช้งานได้
            </div>
          ) : (
            <>
              {formOpen && (
                <div className={`mb-6 rounded-2xl border p-6 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>User Form</p>
                      <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {editingUserId ? 'Edit User' : 'Add User'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Name</span>
                      <input
                        value={formValues.name}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                        className={`rounded-lg border px-4 py-2 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Email</span>
                      <input
                        type="email"
                        value={formValues.email}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                        className={`rounded-lg border px-4 py-2 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{editingUserId ? 'New Password (optional)' : 'Password'}</span>
                      <input
                        type="password"
                        value={formValues.password}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
                        className={`rounded-lg border px-4 py-2 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                        placeholder={editingUserId ? 'Leave blank to keep current password' : 'At least 6 characters'}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Role</span>
                      <select
                        value={formValues.role}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value as 'admin' | 'user' }))}
                        className={`rounded-lg border px-4 py-2 ${darkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create User'}
                    </button>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                <div className={`flex items-center justify-between border-b px-6 py-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>User Registry</p>
                    <h2 className={`mt-1 text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>System Users</h2>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
                  </div>
                </div>

                {isLoading ? (
                  <div className={`px-6 py-14 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className={`${darkMode ? 'bg-gray-900 text-gray-400 divide-gray-700' : 'bg-gray-50 text-gray-500 divide-gray-200'} text-left text-xs font-semibold uppercase tracking-wide`}>
                        <tr>
                          <th className="px-6 py-4">Name</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Presence</th>
                          <th className="px-6 py-4">Updated</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'divide-y divide-gray-700 bg-gray-800 text-gray-300' : 'divide-y divide-gray-200 bg-white text-gray-700'}`}>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="align-top">
                            <td className="px-6 py-5">
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</div>
                              {user.id === currentUserId && (
                                <div className={`mt-1 text-xs font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Current account</div>
                              )}
                            </td>
                            <td className="px-6 py-5">{user.email}</td>
                            <td className="px-6 py-5">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                user.role === 'admin'
                                  ? darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700'
                                  : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {user.role === 'admin' ? 'Administrator' : 'User'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                user.online
                                  ? darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-700'
                                  : darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700'
                              }`}>
                                <span className={`h-2.5 w-2.5 rounded-full ${user.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {user.online ? 'Online' : 'Offline'}
                              </div>
                              <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Last seen: {formatDateTime(user.lastSeenAt || undefined)}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-xs">{formatDateTime(user.updatedAt)}</td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditForm(user)}
                                  className={`rounded-lg px-3 py-2 text-xs font-medium ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(user)}
                                  disabled={user.id === currentUserId}
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}