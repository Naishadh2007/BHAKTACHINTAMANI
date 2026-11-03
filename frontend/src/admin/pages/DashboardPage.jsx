import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../components/PermissionGate';
import { IconBook, IconCheck, IconFileText, IconUsers, IconPlus, IconGlobe, IconMessage } from '../../components/Icons';

const API_BASE = import.meta.env.VITE_API_URL || '';
const CHAPTERS_API = `${API_BASE}/api_admin_chapters.php`;
const FEEDBACK_API = `${API_BASE}/api_feedbacks.php`;
const USERS_API = `${API_BASE}/api_admin_users.php`;

export default function DashboardPage() {
  const { authAxios, token } = useAuth();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isHTML = (d) => typeof d === 'string' && d.trim().startsWith('<');
    const fetchStats = async () => {
      try {
        let data = null;

        // 1. Direct PHP script (most reliable on InfinityFree)
        const r1 = await axios.get(`${CHAPTERS_API}?page=1&limit=1`).catch(() => null);
        if (r1?.data && !isHTML(r1.data)) {
          data = r1.data;
        }

        // 2. Fallback: authAxios gateway
        if (!data) {
          const r2 = await authAxios().get('/chapters').catch(() => null);
          if (r2?.data && !isHTML(r2.data)) data = r2.data;
        }

        // 3. Fallback: public chapters API
        if (!data) {
          const r3 = await axios.get(`${API_BASE}/api_chapters.php`).catch(() => null);
          if (r3?.data && !isHTML(r3.data)) data = r3.data;
        }

        // Feedbacks count
        let fbCount = 0;
        const headers = { Authorization: `Bearer ${token}` };
        const fbRes = await axios.get(`${FEEDBACK_API}?limit=1`, { headers }).catch(() => null);
        if (fbRes?.data && !isHTML(fbRes.data)) {
          fbCount = fbRes.data.total ?? 0;
        }

        const usersRes = await axios.get(USERS_API, { headers }).catch(() => null);
        const usersCount = Array.isArray(usersRes?.data) ? usersRes.data.length : 0;

        const total  = data?.total ?? (Array.isArray(data) ? data.length : (Array.isArray(data?.data) ? data.data.length : 0));
        const drafts = Array.isArray(data?.data)
          ? data.data.filter(c => c.status === 'draft').length
          : 0;

        setStats({ published: total - drafts, draft: drafts, total, users: usersCount, feedbacks: fbCount });
      } catch {
        setStats({ published: 0, draft: 0, total: 0, users: 0, feedbacks: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [authAxios, token]);

  const STAT_CARDS = [
    { icon: IconBook,     label: 'Total Chapters', key: 'total',     link: '/admin/chapters' },
    { icon: IconCheck,    label: 'Published',      key: 'published', link: '/admin/chapters?status=published' },
    { icon: IconFileText, label: 'Drafts',         key: 'draft',     link: '/admin/chapters?status=draft' },
    { icon: IconMessage,  label: 'Feedbacks',      key: 'feedbacks', link: '/admin/feedbacks' },
    { icon: IconUsers,    label: 'Admin Users',    key: 'users',     link: '/admin/users' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your reading platform</p>
        </div>
        <PermissionGate perm="manage_chapters">
          <Link to="/admin/chapters/new" className="btn btn-primary" id="new-chapter-btn">
            <IconPlus size={16} /> New Chapter
          </Link>
        </PermissionGate>
      </div>

      <div className="dashboard-stats">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <Link
              to={card.link}
              key={card.key}
              className="stat-card"
              id={`stat-${card.key}`}
              style={{ textDecoration: 'none' }}
            >
              <span className="stat-icon"><Icon size={28} color="var(--accent)" /></span>
              <span className="stat-value">
                {loading ? '—' : (stats?.[card.key] ?? 0)}
              </span>
              <span className="stat-label">{card.label}</span>
            </Link>
          );
        })}
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginTop: 'var(--space-xl)',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <PermissionGate perm="manage_chapters">
            <Link to="/admin/chapters/new" className="btn btn-primary">
              <IconPlus size={16} /> New Chapter
            </Link>
            <Link to="/admin/chapters" className="btn btn-secondary">
              <IconBook size={16} /> Manage Chapters
            </Link>
          </PermissionGate>
          <PermissionGate perm="manage_users">
            <Link to="/admin/users" className="btn btn-secondary">
              <IconUsers size={16} /> Manage Users
            </Link>
          </PermissionGate>
          <a href="https://bhaktachintamani.gt.tc" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            <IconGlobe size={16} /> View Public Site
          </a>
        </div>
      </div>
    </div>
  );
}
