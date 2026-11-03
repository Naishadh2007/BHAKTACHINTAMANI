import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  IconMessage, IconCheck, IconTrash,
  IconAlert, IconEdit, IconBook
} from '../../components/Icons';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FEEDBACK_API = `${API_BASE}/api_feedbacks.php`;

export default function FeedbacksPage() {
  const { authAxios, token } = useAuth();
  const authHeaders = { 'X-Admin-Token': token };
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'chapters'

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isHTML = (d) => typeof d === 'string' && d.trim().startsWith('<');
      let res = null;

      // 1. Direct standalone PHP script
      const r1 = await axios.get(`${FEEDBACK_API}?limit=50`, { headers: authHeaders }).catch(() => null);
      if (r1?.data && !isHTML(r1.data)) res = r1;

      // 2. Laravel API endpoint via authAxios
      if (!res) {
        const r2 = await authAxios().get('/feedbacks?limit=50').catch(() => null);
        if (r2?.data && !isHTML(r2.data)) res = r2;
      }

      const rows = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setFeedbacks(rows);
    } catch (err) {
      console.error(err);
      setError('Could not load feedbacks.');
    } finally {
      setLoading(false);
    }
  }, [authAxios, token]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Mark as read
  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${FEEDBACK_API}?id=${id}`, {}, { headers: authHeaders }).catch(() => {
        return authAxios().put(`/feedbacks/${id}/read`);
      });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_read: 1 } : f));
    } catch (err) {
      console.error('Mark as read failed', err);
    }
  };

  // Delete feedback
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await axios.delete(`${FEEDBACK_API}?id=${id}`, { headers: authHeaders }).catch(() => {
        return authAxios().delete(`/feedbacks/${id}`);
      });
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Delete feedback failed', err);
    }
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (filter === 'unread') return !fb.is_read;
    if (filter === 'chapters') return Boolean(fb.chapter_id);
    return true;
  });

  const totalCount   = feedbacks.length;
  const unreadCount  = feedbacks.filter(f => !f.is_read).length;
  const chapterCount = feedbacks.filter(f => f.chapter_id).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>User Feedbacks & Corrections</h1>
          <p>Review reader suggestions, typos, and chapter correction reports</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div
          className={`stat-card ${filter === 'all' ? 'stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFilter('all')}
        >
          <span className="stat-icon"><IconMessage size={24} color="var(--accent)" /></span>
          <span className="stat-value">{totalCount}</span>
          <span className="stat-label">Total Feedbacks</span>
        </div>

        <div
          className={`stat-card ${filter === 'unread' ? 'stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFilter('unread')}
        >
          <span className="stat-icon"><IconAlert size={24} color="var(--gold, #d3b276)" /></span>
          <span className="stat-value">{unreadCount}</span>
          <span className="stat-label">Unread / New</span>
        </div>

        <div
          className={`stat-card ${filter === 'chapters' ? 'stat-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setFilter('chapters')}
        >
          <span className="stat-icon"><IconBook size={24} color="var(--accent)" /></span>
          <span className="stat-value">{chapterCount}</span>
          <span className="stat-label">Chapter Corrections</span>
        </div>
      </div>

      {/* Feedbacks List Container */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        marginTop: 'var(--space-xl)',
      }}>
        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`btn ${filter === 'chapters' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setFilter('chapters')}
          >
            Chapter Corrections ({chapterCount})
          </button>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <span className="scroll-loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <IconMessage size={36} color="var(--border)" style={{ marginBottom: '0.75rem' }} />
            <p>No feedback entries found in this view.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredFeedbacks.map((fb) => {
              const isUnread = !fb.is_read;
              const dateStr = fb.created_at ? new Date(fb.created_at).toLocaleString('gu-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }) : 'Recent';

              return (
                <div
                  key={fb.id}
                  style={{
                    background: isUnread ? 'var(--accent-subtle)' : 'var(--bg-hover)',
                    border: `1px solid ${isUnread ? 'var(--border-accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Bar: Chapter Tag & Date & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {fb.chapter_id ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'var(--accent)',
                          color: '#ffffff',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}>
                          🔒 {fb.chapter_title || `Chapter #${fb.chapter_id}`}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          🌐 General Feedback
                        </span>
                      )}

                      {isUnread && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'var(--gold, #d3b276)',
                          color: '#090F1A',
                          textTransform: 'uppercase',
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {dateStr}
                    </span>
                  </div>

                  {/* Sender Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{fb.name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <a href={`mailto:${fb.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {fb.email}
                    </a>
                  </div>

                  {/* Feedback Message */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.96rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {fb.message}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {fb.chapter_id && (
                      <Link
                        to={`/admin/chapters/${fb.chapter_id}/edit`}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                        title="Open Chapter Editor"
                      >
                        <IconEdit size={14} /> Edit Chapter #{fb.chapter_id}
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                        onClick={() => handleMarkAsRead(fb.id)}
                        title="Mark as Read"
                      >
                        <IconCheck size={14} color="var(--accent)" /> Mark as Read
                      </button>
                    )}

                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', color: '#ff6b6b' }}
                      onClick={() => handleDelete(fb.id)}
                      title="Delete feedback"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
