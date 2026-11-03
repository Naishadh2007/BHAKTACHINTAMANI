import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import { IconArrowLeft } from '../../components/Icons';

const API_BASE = import.meta.env.VITE_API_URL || '';
const CHAPTERS_API = `${API_BASE}/api_admin_chapters.php`;

const EMPTY = {
  title_gu: '', title_en: '',
  description_gu: '', description_en: '',
  content_gu: '', content_en: '',
  order: '', status: 'draft',
};

export default function ChapterEditPage() {
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const navigate = useNavigate();
  const { authAxios } = useAuth();

  const [form, setForm]         = useState(EMPTY);
  const [activeTab, setActiveTab] = useState('gu'); // 'gu' or 'en'
  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Load existing chapter for edit
  useEffect(() => {
    if (!isEdit) return;
    const loadChapter = async () => {
      try {
        const isHTML = (d) => typeof d === 'string' && d.trim().startsWith('<');
        let r = null;

        // 1. Direct PHP script (most reliable on InfinityFree)
        const r1 = await axios.get(`${CHAPTERS_API}?id=${id}`).catch(() => null);
        if (r1?.data && !isHTML(r1.data)) r = r1;

        // 2. Fallback: authAxios gateway
        if (!r) {
          const r2 = await authAxios().get(`/chapters/${id}`).catch(() => null);
          if (r2?.data && !isHTML(r2.data)) r = r2;
        }

        // 3. Fallback: public API
        if (!r) {
          const r3 = await axios.get(`${API_BASE}/api_chapters.php?id=${id}`).catch(() => null);
          if (r3?.data && !isHTML(r3.data)) r = r3;
        }

        const data = r?.data?.chapter || r?.data;
        if (!data) throw new Error('Not found');
        setForm({
          title_gu:       data.title_gu       || data.title || '',
          title_en:       data.title_en       || data.title || '',
          description_gu: data.description_gu || data.description || '',
          description_en: data.description_en || data.description || '',
          content_gu:     data.content_gu     || data.content || '',
          content_en:     data.content_en     || data.content || '',
          order:          data.order          || '',
          status:         data.status         || 'draft',
        });
      } catch {
        setError('Could not load chapter.');
      } finally {
        setLoading(false);
      }
    };
    loadChapter();
  }, [id, isEdit, authAxios]);

  const set = (key) => (valOrE) => {
    const value = valOrE?.target ? valOrE.target.value : valOrE;
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e, publishNow = false) => {
    e?.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      order: parseInt(form.order, 10) || 1,
      status: publishNow ? 'published' : form.status,
    };

    try {
      if (isEdit) {
        // PUT via direct PHP script first, fallback to authAxios
        try {
          await axios.put(`${CHAPTERS_API}?id=${id}`, payload);
        } catch {
          await authAxios().put(`/chapters/${id}`, payload);
        }
      } else {
        // POST via direct PHP script first, fallback to authAxios
        try {
          await axios.post(CHAPTERS_API, payload);
        } catch {
          await authAxios().post('/chapters', payload);
        }
      }
      navigate('/admin/chapters');
    } catch (err) {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
        <span className="scroll-loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? `Edit Chapter #${form.order}` : 'New Chapter'}</h1>
          <p>{isEdit ? (form.title_gu || form.title_en) : 'Fill in Gujarati & English details below'}</p>
        </div>
        <Link to="/admin/chapters" className="btn btn-ghost">
          <IconArrowLeft size={16} /> Back
        </Link>
      </div>

      {error && (
        <div className="form-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          ⚠️ {error}
        </div>
      )}

      <form className="edit-form" onSubmit={handleSubmit}>
        {/* Row: order + status */}
        <div className="edit-form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="chap-order">Chapter Number</label>
            <input
              id="chap-order"
              type="number"
              min="1"
              className="form-input"
              placeholder="e.g. 1"
              value={form.order}
              onChange={set('order')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="chap-status">Status</label>
            <select
              id="chap-status"
              className="form-input filter-select"
              value={form.status}
              onChange={set('status')}
              style={{ background: 'var(--bg-surface)' }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="lang-switcher" style={{ alignSelf: 'flex-start', margin: '0.5rem 0' }}>
          <button
            type="button"
            className={`lang-btn ${activeTab === 'gu' ? 'active' : ''}`}
            onClick={() => setActiveTab('gu')}
          >
            ગુજરાતી Content
          </button>
          <button
            type="button"
            className={`lang-btn ${activeTab === 'en' ? 'active' : ''}`}
            onClick={() => setActiveTab('en')}
          >
            English Content
          </button>
        </div>

        {/* Gujarati Fields */}
        {activeTab === 'gu' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="chap-title-gu">Title (ગુજરાતી)</label>
              <input
                id="chap-title-gu"
                type="text"
                className="form-input font-rasa"
                placeholder="પ્રકરણનું શિર્ષક"
                value={form.title_gu}
                onChange={set('title_gu')}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="chap-desc-gu">Description (ગુજરાતી)</label>
              <input
                id="chap-desc-gu"
                type="text"
                className="form-input font-rasa"
                placeholder="ટૂંકમાં વર્ણન"
                value={form.description_gu}
                onChange={set('description_gu')}
              />
            </div>

            {/* Rich Editor for Gujarati */}
            <RichTextEditor
              label="Content (ગુજરાતી)"
              value={form.content_gu}
              onChange={set('content_gu')}
              placeholder="અહીં પ્રકરણનું લખાણ લખો..."
            />
          </>
        )}

        {/* English Fields */}
        {activeTab === 'en' && (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="chap-title-en">Title (English)</label>
              <input
                id="chap-title-en"
                type="text"
                className="form-input"
                placeholder="Chapter title"
                value={form.title_en}
                onChange={set('title_en')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="chap-desc-en">Description (English)</label>
              <input
                id="chap-desc-en"
                type="text"
                className="form-input"
                placeholder="Short summary"
                value={form.description_en}
                onChange={set('description_en')}
              />
            </div>

            {/* Rich Editor for English */}
            <RichTextEditor
              label="Content (English)"
              value={form.content_en}
              onChange={set('content_en')}
              placeholder="Write English chapter content here..."
            />
          </>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button
            id="save-draft-btn"
            type="submit"
            className="btn btn-secondary"
            disabled={saving}
            onClick={() => setForm(f => ({ ...f, status: 'draft' }))}
          >
            {saving ? '…' : 'Save Draft'}
          </button>
          <button
            id="save-publish-btn"
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={(e) => handleSubmit(e, true)}
          >
            {saving ? '…' : 'Save & Publish'}
          </button>
          <Link to="/admin/chapters" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
