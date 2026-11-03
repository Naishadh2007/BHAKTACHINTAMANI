import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useReading } from '../context/ReadingContext';
import {
  IconAlert, IconBookmarkFilled, IconBook,
  IconFilter, IconX, IconChevronRight
} from '../components/Icons';
import './HomePage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
const ITEM_HEIGHT = 56;

export const toGujaratiDigits = (num) => {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (digit) => GUJARATI_DIGITS[Number(digit)]);
};

export const parseApiResponse = (data) => {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
  return data;
};

function SkeletonCard() {
  return (
    <div className="chapter-card-skeleton" aria-hidden="true">
      <div className="chapter-card-skeleton__header">
        <div className="chapter-card-skeleton__badge skeleton" />
      </div>
      <div className="chapter-card-skeleton__title skeleton" />
    </div>
  );
}

export default function HomePage() {
  const [chapters, setChapters]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeRange, setActiveRange]   = useState('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Wheel Scrolling & Distance Focus States (Reading Screen Style)
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollFocusIndex, setScrollFocusIndex] = useState(0);
  const sidebarRef = useRef(null);
  const isScrollingRef = useRef(false);

  const { lang }     = useLanguage();
  const { bookmark } = useReading();

  const fetchChapters = async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      try {
        res = await axios.get(`${API_BASE}/api/chapters`, {
          headers: { Accept: 'application/json' }
        });
      } catch (e) {
        res = await axios.get(`${API_BASE}/api_chapters.php`, {
          headers: { Accept: 'application/json' }
        });
      }

      let data = parseApiResponse(res?.data);
      if (!Array.isArray(data)) {
        try {
          const fallbackRes = await axios.get(`${API_BASE}/api_chapters.php`, {
            headers: { Accept: 'application/json' }
          });
          data = parseApiResponse(fallbackRes.data);
        } catch (e) {}
      }

      if (Array.isArray(data) && data.length > 0) {
        setChapters(data);
      } else if (data && Array.isArray(data.chapters) && data.chapters.length > 0) {
        setChapters(data.chapters);
      } else {
        setError(lang === 'gu' ? 'પ્રકરણો મળ્યા નથી.' : 'No chapters found.');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(lang === 'gu' ? 'પ્રકરણો લોડ થઈ શક્યા નથી. કૃપા કરીને ફરી પ્રયાસ કરો.' : 'Could not load chapters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  const getTitle = (chapter) => {
    if (!chapter) return '';
    if (lang === 'gu') return chapter.title_gu || chapter.title || `પ્રકરણ ${toGujaratiDigits(chapter.order)}`;
    return chapter.title_en || chapter.title || `Chapter ${chapter.order}`;
  };

  // Generate dynamic range options (1-20, 21-40, 41-60... up to max 164)
  const rangeOptions = useMemo(() => {
    const total = Math.max(chapters.length || 0, 164);
    const chunkSize = 20;
    const ranges = [{ label: lang === 'gu' ? 'બધા' : 'All', value: 'all' }];

    for (let start = 1; start <= total; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, total);
      const label = lang === 'gu'
        ? `${toGujaratiDigits(start)}-${toGujaratiDigits(end)}`
        : `${start}-${end}`;
      ranges.push({ label, value: `${start}-${end}`, start, end });
    }
    return ranges;
  }, [chapters.length, lang]);

  // Filter chapters based on active range
  const filteredChapters = useMemo(() => {
    if (!Array.isArray(chapters)) return [];

    return chapters.filter((chapter) => {
      if (!chapter) return false;
      const order = Number(chapter.order || chapter.id || 0);

      if (activeRange !== 'all') {
        const [start, end] = activeRange.split('-').map(Number);
        if (order < start || order > end) return false;
      }
      return true;
    });
  }, [chapters, activeRange]);

  // Fast isolated mouse wheel listener for sidebar (Reading Screen Style)
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaMode === 1 ? 40 : (Math.abs(e.deltaY) < 40 ? 2.5 : 1.2);
      el.scrollTop += e.deltaY * factor;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [rangeOptions]);

  // Calculate wheel focus index during scroll
  const handleSidebarScroll = () => {
    if (!sidebarRef.current || isScrollingRef.current) return;
    isScrollingRef.current = true;
    window.requestAnimationFrame(() => {
      if (sidebarRef.current) {
        const top = sidebarRef.current.scrollTop;
        const currentIdx = Math.round(top / ITEM_HEIGHT);
        if (currentIdx >= 0 && currentIdx < rangeOptions.length) {
          setScrollFocusIndex(currentIdx);
        }
      }
      isScrollingRef.current = false;
    });
  };

  const activeFocusIdx = hoveredIndex !== null ? hoveredIndex : scrollFocusIndex;

  return (
    <main id="main-content" className="home">
      <div className="page-container">
        {/* Mobile Filter Toggle Button */}
        <div className="home__mobile-filter-bar">
          <button
            id="mobile-filter-btn"
            className="navbar-button home__mobile-filter-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open range sidebar"
          >
            <IconFilter size={18} color="var(--accent)" />
            <span>{lang === 'gu' ? 'પ્રકરણ શ્રેણી' : 'Chapter Ranges'}</span>
            {activeRange !== 'all' && (
              <span className="home__filter-badge">{activeRange}</span>
            )}
          </button>
        </div>

        {/* Home Main Layout (Sidebar + Grid) */}
        <div className="home__layout">
          {/* ── Left Sidebar (Frameless Reading Screen Wheel List for Ranges) ── */}
          <aside className={`home__sidebar ${mobileSidebarOpen ? 'home__sidebar--open' : ''}`}>
            {/* Mobile close button only */}
            <button
              className="navbar-icon-button home__sidebar-close"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <IconX size={18} />
            </button>

            {/* Reading Screen 7-Row Wheel Scroll List of Ranges */}
            <div
              className="sidebar__wheel-container"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                ref={sidebarRef}
                className="sidebar__inner"
                onScroll={handleSidebarScroll}
              >
                <div className="sidebar__spacer" style={{ height: `${3 * ITEM_HEIGHT}px` }} />

                <div className="sidebar__list" role="list">
                  {rangeOptions.map((range, idx) => {
                    const dist = Math.abs(idx - activeFocusIdx);
                    const distClass = dist <= 3 ? `sidebar__item--dist-${dist}` : 'sidebar__item--dist-far';
                    const isSelected = activeRange === range.value;

                    return (
                      <div
                        key={range.value}
                        role="button"
                        tabIndex={0}
                        style={{ height: `${ITEM_HEIGHT}px` }}
                        className={`sidebar__item ${distClass} ${isSelected ? 'sidebar__item--active' : ''}`}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onClick={() => {
                          setActiveRange(range.value);
                          setMobileSidebarOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveRange(range.value);
                            setMobileSidebarOpen(false);
                          }
                        }}
                      >
                        <span className="sidebar__item-num font-ui">
                          {idx === 0 ? '★' : (lang === 'gu' ? toGujaratiDigits(idx) : idx)}
                        </span>
                        <span className="sidebar__item-title font-rasa">
                          {range.value === 'all'
                            ? (lang === 'gu' ? 'બધા પ્રકરણો' : 'All Chapters')
                            : (lang === 'gu' ? `પ્રકરણ ${range.label}` : `Chapters ${range.label}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="sidebar__spacer" style={{ height: `${3 * ITEM_HEIGHT}px` }} />
              </div>
            </div>
          </aside>

          {/* Backdrop for Mobile Sidebar Drawer */}
          {mobileSidebarOpen && (
            <div
              className="home__sidebar-backdrop"
              onClick={() => setMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* ── Main Content Area ── */}
          <div className="home__main">
            {/* Hero */}
            <section className="home__hero" aria-labelledby="home-heading">
              <div className="home__hero-mini-title font-rasa">
                {lang === 'gu'
                  ? 'વૈરાગ્યમૂર્તિ શ્રી નિષ્કુળાનંદ મુનિ વિરચિત'
                  : 'Composed by Vairagyamurti Shri Nishkulanand Muni'}
              </div>
              <h1 id="home-heading" className="home__hero-title">
                {lang === 'gu' ? 'ભક્ત-ચિંતામણિ' : 'Bhakta-Chintamani'}
              </h1>
            </section>

            {/* Clear Filter button when range is active */}
            {!loading && !error && activeRange !== 'all' && (
              <div className="home__filter-status-bar" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="navbar-button home__reset-filter-btn"
                  onClick={() => {
                    setActiveRange('all');
                    setScrollFocusIndex(0);
                    if (sidebarRef.current) sidebarRef.current.scrollTop = 0;
                  }}
                >
                  <IconX size={14} color="var(--accent)" />
                  <span>{lang === 'gu' ? 'ફિલ્ટર સાફ કરો' : 'Clear Filters'}</span>
                </button>
              </div>
            )}

            {/* Modern Content Grid */}
            {loading ? (
              <div
                className="home__grid"
                role="status"
                aria-label="Loading chapters…"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
                <span className="sr-only">Loading chapters…</span>
              </div>
            ) : error ? (
              <div className="home__error" role="alert">
                <div className="home__error-icon">
                  <IconAlert size={36} color="var(--accent)" />
                </div>
                <h2>{lang === 'gu' ? 'કંઈક ખોટું થયું' : 'Something went wrong'}</h2>
                <p>{error}</p>
                <button id="retry-btn" className="btn btn-primary" onClick={fetchChapters}>
                  {lang === 'gu' ? 'ફરી પ્રયાસ કરો' : 'Try Again'}
                </button>
              </div>
            ) : (
              <div className="home__grid" role="list">
                {filteredChapters.length === 0 ? (
                  <div className="home__empty-box">
                    <p className="home__empty">
                      {lang === 'gu' ? 'પસંદ કરેલ ફિલ્ટરમાં કોઈ પ્રકરણો મળ્યા નથી.' : 'No chapters match the selected filter.'}
                    </p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setActiveRange('all'); setScrollFocusIndex(0); }}
                    >
                      {lang === 'gu' ? 'બધા પ્રકરણો જુઓ' : 'Show All Chapters'}
                    </button>
                  </div>
                ) : (
                  filteredChapters.map((chapter) => {
                    if (!chapter) return null;
                    const isBookmarked = bookmark && bookmark.chapterId === chapter.id;
                    const orderNum = chapter.order || chapter.id || 1;
                    const formattedNum = lang === 'gu'
                      ? toGujaratiDigits(orderNum < 10 ? `0${orderNum}` : orderNum)
                      : (orderNum < 10 ? `0${orderNum}` : orderNum);

                    return (
                      <Link
                        key={chapter.id}
                        to={`/chapter/${chapter.id}`}
                        id={`chapter-card-${chapter.id}`}
                        className={`chapter-card ${isBookmarked ? 'chapter-card--bookmarked' : ''}`}
                        role="listitem"
                        aria-label={`Chapter ${orderNum}: ${getTitle(chapter)}`}
                      >
                        {/* Watermark Background Number */}
                        <span className="chapter-card__bg-num font-rasa" aria-hidden="true">
                          {formattedNum}
                        </span>

                        {/* Top Metadata Row */}
                        <div className="chapter-card__top">
                          <div className="chapter-card__badge-wrapper">
                            <span className="chapter-card__order-badge font-rasa">
                              <span className="chapter-card__badge-dot" />
                              {lang === 'gu' ? `પ્રકરણ ${toGujaratiDigits(orderNum)}` : `Chapter ${orderNum}`}
                            </span>
                          </div>

                          <div className="chapter-card__actions">
                            {isBookmarked && (
                              <span className="chapter-card__bookmark-pill" title={lang === 'gu' ? 'બુકમાર્ક' : 'Bookmarked'}>
                                <IconBookmarkFilled size={13} color="var(--accent)" />
                              </span>
                            )}
                            <span className="chapter-card__read-arrow" aria-hidden="true">
                              <IconChevronRight size={15} />
                            </span>
                          </div>
                        </div>

                        {/* Card Title */}
                        <div className="chapter-card__body">
                          <h2 className="chapter-card__title font-rasa">{getTitle(chapter)}</h2>
                        </div>

                        {/* Left Glow Bar & Bottom Glow Line */}
                        <div className="chapter-card__accent-bar" aria-hidden="true" />
                        <div className="chapter-card__shimmer" aria-hidden="true" />
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Bookmark FAB ── */}
      {bookmark && (
        <Link
          to={`/chapter/${bookmark.chapterId}`}
          className="home__bookmark-fab font-rasa"
          aria-label={lang === 'gu' ? `બુકમાર્ક: પ્રકરણ ${toGujaratiDigits(bookmark.order)}` : `Bookmark: Chapter ${bookmark.order}`}
          title={bookmark.title}
        >
          <IconBookmarkFilled size={20} color="var(--bg-main)" />
          <span className="home__bookmark-fab-label">
            {lang === 'gu' ? `પ્રકરણ ${toGujaratiDigits(bookmark.order)}` : `Ch. ${bookmark.order}`}
          </span>
        </Link>
      )}
    </main>
  );
}




