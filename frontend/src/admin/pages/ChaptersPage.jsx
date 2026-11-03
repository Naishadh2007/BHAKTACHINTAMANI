import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import PermissionGate from '../components/PermissionGate';
import StatusBadge from '../components/StatusBadge';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconFileText
} from '../../components/Icons';

const API_BASE = import.meta.env.VITE_API_URL || '';
const CHAPTERS_API = `${API_BASE}/api_admin_chapters.php`;
const LIMIT = 30;

export default function ChaptersPage() {
  const { authAxios } = useAuth();
  const [searchParams] = useSearchParams();

  const [chapters, setChapters]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortCol, setSortCol]     = useState('order');
  const [sortDir, setSortDir]     = useState('asc');
  const [selected, setSelected]   = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const sentinelRef = useRef(null);
  const searchTimer = useRef(null);
  const loadingRef  = useRef(false);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Reset when filters change
  useEffect(() => {
    setChapters([]);
    setPage(1);
    setHasMore(true);
    setSelected(new Set());
    setInitialLoad(true);
  }, [debouncedSearch, statusFilter, sortCol, sortDir]);

  // Fetch chapters
  const fetchChapters = useCallback(async (pageNum) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const isHTML = (d) => typeof d === 'string' && d.trim().startsWith('<');
      const params = new URLSearchParams({
        page:  pageNum,
        limit: LIMIT,
        sort:  sortCol,
        dir:   sortDir,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter    && { status: statusFilter }),
      });
      let res = null;

      // 1. Direct PHP script — most reliable on InfinityFree shared hosting
      const r1 = await axios.get(`${CHAPTERS_API}?${params}`).catch(() => null);
      if (r1?.data && !isHTML(r1.data)) res = r1;

      // 2. Fallback: authAxios gateway
      if (!res) {
        const r2 = await authAxios().get(`/chapters?${params}`).catch(() => null);
        if (r2?.data && !isHTML(r2.data)) res = r2;
      }

      // 3. Fallback: public chapters API (no auth required)
      if (!res) {
        const r3 = await axios.get(`${API_BASE}/api_chapters.php`).catch(() => null);
        if (r3?.data && !isHTML(r3.data)) res = r3;
      }

      const data = res?.data;
      const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      if (pageNum === 1) {
        setChapters(rows);
      } else {
        setChapters(prev => [...prev, ...rows]);
      }
      setTotal(data?.total ?? rows.length);
      setHasMore(data?.has_more ?? false);
    } catch (e) {
      console.error(e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialLoad(false);
    }
  }, [debouncedSearch, statusFilter, sortCol, sortDir]);

  // Trigger fetch when page/filters change
  useEffect(() => {
    fetchChapters(page);
  }, [page, fetchChapters]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Selection
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selected.size === chapters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(chapters.map(c => c.id)));
    }
  };

  // Sort toggle
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  // Bulk actions
  const doBulk = async (action) => {
    if (!selected.size) return;
    setBulkLoading(true);
    try {
      await axios.post(`${CHAPTERS_API}?bulk=1`, {
        ids: [...selected],
        action,
      });
      setChapters([]);
      setPage(1);
      setHasMore(true);
      setSelected(new Set());
      setInitialLoad(true);
    } catch (e) {
      alert('Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete single
  const deleteChapter = async (id) => {
    if (!confirm('Delete this chapter permanently?')) return;
    try {
      await axios.delete(`${CHAPTERS_API}?id=${id}`);
      setChapters(prev => prev.filter(c => c.id !== id));
      setTotal(t => t - 1);
    } catch (e) {
      alert('Delete failed');
    }
  };

  const SortBtn = ({ col, label }) => (
    <button
      style={{ background: 'none', border: 'none', cursor: 'pointer',
               color: sortCol === col ? 'var(--accent)' : 'var(--text-muted)',
               fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase',
               letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortCol === col && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Chapters</h1>
          <p>{total} chapter{total !== 1 ? 's' : ''} total</p>
        </div>
        <PermissionGate perm="manage_chapters">
          <Link to="/admin/chapters/new" id="add-chapter-btn" className="btn btn-primary">
            <IconPlus size={16} /> New Chapter
          </Link>
        </PermissionGate>
      </div>

      {/* Sticky toolbar */}
      <div className="chapters-toolbar">
        <div className="toolbar-row">
          <div className="search-wrap">
            <span className="search-icon">
              <IconSearch size={16} color="var(--text-muted)" />
            </span>
            <input
              id="chapter-search"
              type="search"
              className="search-input"
              placeholder="Search chapters… or type #64 to jump"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search chapters"
            />
          </div>

          <select
            id="status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Header row */}
      <div className="chapter-list-header">
        <input
          type="checkbox"
          onChange={selectAll}
          checked={selected.size > 0 && selected.size === chapters.length}
          ref={el => el && (el.indeterminate = selected.size > 0 && selected.size < chapters.length)}
          aria-label="Select all visible chapters"
        />
        <SortBtn col="order" label="#" />
        <SortBtn col="title" label="Title" />
        <span>Status</span>
        <span>Actions</span>
      </div>

      {/* Chapter list */}
      {initialLoad ? (
        <div className="chapter-list">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="chapter-row" style={{ opacity: 0.6 }}>
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 32, height: 14 }} />
              <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 99 }} />
              <div />
            </div>
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty__icon">
            <IconSearch size={40} color="var(--text-muted)" />
          </div>
          <div className="admin-empty__text">
            {debouncedSearch ? `No chapters matching "${debouncedSearch}"` : 'No chapters found.'}
          </div>
        </div>
      ) : (
        <div className="chapter-list" role="list">
          {chapters.map(ch => (
            <div
              key={ch.id}
              className={`chapter-row${selected.has(ch.id) ? ' selected' : ''}`}
              role="listitem"
            >
              <input
                type="checkbox"
                className="chapter-row__check"
                checked={selected.has(ch.id)}
                onChange={() => toggleSelect(ch.id)}
                aria-label={`Select chapter ${ch.order}: ${ch.title_gu || ch.title}`}
              />
              <span className="chapter-row__order">#{ch.order}</span>
              <div className="chapter-row__title">
                {ch.title_gu || ch.title}
                {ch.title_en && ch.title_en !== ch.title_gu && (
                  <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                    En: {ch.title_en}
                  </small>
                )}
              </div>
              <StatusBadge status={ch.status} />
              <div className="chapter-row__actions">
                <PermissionGate perm="manage_chapters">
                  <Link
                    to={`/admin/chapters/${ch.id}/edit`}
                    id={`edit-chapter-${ch.id}`}
                    className="btn btn-ghost btn-sm btn-icon"
                    title="Edit"
                  >
                    <IconEdit size={16} />
                  </Link>
                </PermissionGate>
                <PermissionGate perm="delete_chapters">
                  <button
                    id={`delete-chapter-${ch.id}`}
                    className="btn btn-danger btn-sm btn-icon"
                    title="Delete"
                    onClick={() => deleteChapter(ch.id)}
                  >
                    <IconTrash size={16} />
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="scroll-sentinel">
        {loading && !initialLoad && <span className="scroll-loader" />}
        {!hasMore && chapters.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            All {total} chapters loaded
          </span>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-bar__info">{selected.size} selected</span>
          <div className="bulk-bar__actions">
            <PermissionGate perm="publish_chapters">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => doBulk('publish')}
                disabled={bulkLoading}
              >
                <IconCheck size={14} /> Publish
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => doBulk('draft')}
                disabled={bulkLoading}
              >
                <IconFileText size={14} /> Draft
              </button>
            </PermissionGate>
            <PermissionGate perm="delete_chapters">
              <button
                className="btn btn-danger btn-sm"
                onClick={() => doBulk('delete')}
                disabled={bulkLoading}
              >
                <IconTrash size={14} /> Delete
              </button>
            </PermissionGate>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(new Set())}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
