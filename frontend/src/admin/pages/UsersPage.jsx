import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import PermissionToggle from '../components/PermissionToggle';
import { IconPlus, IconEdit, IconTrash, IconCheck, IconAlert } from '../../components/Icons';

const API_BASE = import.meta.env.VITE_API_URL || '';
const USERS_API = `${API_BASE}/api_admin_users.php`;

const ALL_PERMS = [
  { key: 'view_dashboard',   label: 'View Dashboard' },
  { key: 'manage_chapters',  label: 'Manage Chapters' },
  { key: 'delete_chapters',  label: 'Delete Chapters' },
  { key: 'publish_chapters', label: 'Publish Chapters' },
  { key: 'manage_users',     label: 'Manage Users' },
];

const EMPTY_FORM = { name: '', email: '', password: '' };
const EMPTY_PERMS = Object.fromEntries(ALL_PERMS.map(p => [p.key, false]));

export default function UsersPage() {
  const { authAxios }             = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [perms, setPerms]         = useState(EMPTY_PERMS);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    authAxios().get('/users')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.data) ? r.data.data : []);
        setUsers(list);
      })
      .catch(() => {
        axios.get(USERS_API)
          .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
          .catch(() => setUsers([]));
      })
      .finally(() => setLoading(false));
  }, [authAxios]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setPerms(EMPTY_PERMS);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '' });
    setPerms({ ...EMPTY_PERMS, ...user.permissions });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...(form.name     && { name: form.name }),
        ...(form.email    && { email: form.email }),
        ...(form.password && { password: form.password }),
        permissions: perms,
      };
      if (editUser) {
        await axios.put(`${USERS_API}?id=${editUser.id}`, payload);
      } else {
        if (!form.name || !form.email || !form.password) {
          setError('Name, email, and password are required.');
          setSaving(false);
          return;
        }
        await axios.post(USERS_API, payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this admin user?')) return;
    try {
      await axios.delete(`${USERS_API}?id=${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const setF = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const setPerm = (key, val) => setPerms(p => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Users</h1>
          <p>Manage who has access to this panel</p>
        </div>
        <button id="add-user-btn" className="btn btn-primary" onClick={openCreate}>
          <IconPlus size={16} /> Add User
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <span className="scroll-loader" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : (
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-card">
              {/* Avatar */}
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="user-info">
                <div className="user-name">
                  {user.name}
                  {user.is_super_admin && (
                    <span className="topbar-admin-badge" style={{ marginLeft: '0.5rem' }}>
                      Super Admin
                    </span>
                  )}
                </div>
                <div className="user-email">{user.email}</div>

                {!user.is_super_admin && (
                  <div className="user-permissions">
                    {ALL_PERMS.map(p => (
                      <span
                        key={p.key}
                        className={`perm-chip ${user.permissions?.[p.key] ? 'perm-chip--on' : 'perm-chip--off'}`}
                      >
                        {user.permissions?.[p.key] ? '✓' : '✕'} {p.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!user.is_super_admin && (
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    id={`edit-user-${user.id}`}
                    className="btn btn-ghost btn-sm"
                    onClick={() => openEdit(user)}
                  >
                    <IconEdit size={14} /> Edit
                  </button>
                  <button
                    id={`delete-user-${user.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">{editUser ? `Edit: ${editUser.name}` : 'Add New Admin User'}</h2>

            {error && (
              <div className="form-error" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconAlert size={16} /> <span>{error}</span>
              </div>
            )}

            <div className="login-form" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-name">Name</label>
                <input id="modal-name" type="text" className="form-input" placeholder="Full name"
                  value={form.name} onChange={setF('name')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-email">Email</label>
                <input id="modal-email" type="email" className="form-input" placeholder="email@example.com"
                  value={form.email} onChange={setF('email')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="modal-password">
                  Password {editUser && <span style={{ fontWeight: 400 }}>(leave blank to keep current)</span>}
                </label>
                <input id="modal-password" type="password" className="form-input" placeholder="Min 8 characters"
                  value={form.password} onChange={setF('password')} />
              </div>

              {/* Permissions */}
              <div>
                <div className="form-label" style={{ marginBottom: 'var(--space-sm)' }}>Permissions</div>
                <div className="perm-grid">
                  {ALL_PERMS.map(p => (
                    <PermissionToggle
                      key={p.key}
                      id={`perm-${p.key}`}
                      label={p.label}
                      checked={!!perms[p.key]}
                      onChange={val => setPerm(p.key, val)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
              <button id="modal-save-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '…' : (editUser ? 'Save Changes' : 'Create User')}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
