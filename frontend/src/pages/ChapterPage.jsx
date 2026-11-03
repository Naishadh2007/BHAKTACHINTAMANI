import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useReading } from '../context/ReadingContext';
import { IconArrowLeft, IconAlert, IconChevronLeft, IconChevronRight, IconBook, IconX } from '../components/Icons';
import './ChapterPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
const toGujaratiDigits = (num) => {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (digit) => GUJARATI_DIGITS[Number(digit)]);
};

const parseApiResponse = (data) => {
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

function LoadingSkeleton() {
  return (
    <div className="chapter__loading" role="status" aria-label="Loading chapter…">
      <div className="chapter-skeleton__badge skeleton" />
      <div className="chapter-skeleton__title skeleton" />
      <div className="chapter-skeleton__content">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="chapter-skeleton__line skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function ChapterPage() {
  const { id }                          = useParams();
  const navigate                        = useNavigate();
  const [chapterData, setChapterData]   = useState(null);
  const [allChapters, setAllChapters]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [progress, setProgress]         = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [scrollFocusIndex, setScrollFocusIndex] = useState(0);
  const [activeWordMeaning, setActiveWordMeaning] = useState(null);
  const { lang }                        = useLanguage();
  const { fontSize, setCurrentChapterId, setCurrentChapterInfo } = useReading();
  const sidebarRef                      = useRef(null);

  const ITEM_HEIGHT = 56;

  // Tell Navbar which chapter is open (for bookmark btn & feedback locking)
  useEffect(() => {
    setCurrentChapterId(id ? Number(id) : null);
    return () => {
      setCurrentChapterId(null);
      setCurrentChapterInfo(null);
    };
  }, [id, setCurrentChapterId, setCurrentChapterInfo]);

  // Fetch all chapters for sidebar
  useEffect(() => {
    const loadSidebar = async () => {
      try {
        let res = await axios.get(`${API_BASE}/api/chapters`, { headers: { Accept: 'application/json' } }).catch(() => null);
        let data = res ? parseApiResponse(res.data) : null;
        if (!Array.isArray(data)) {
          const fb = await axios.get(`${API_BASE}/api_chapters.php`, { headers: { Accept: 'application/json' } }).catch(() => null);
          data = fb ? parseApiResponse(fb.data) : null;
        }
        if (Array.isArray(data)) {
          setAllChapters(data);
          const activeIdx = data.findIndex(c => c.id === Number(id));
          if (activeIdx >= 0) setScrollFocusIndex(activeIdx);
        }
      } catch (e) {}
    };
    loadSidebar();
  }, [id]);

  const fetchChapter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      try {
        res = await axios.get(`${API_BASE}/api/chapters/${id}`, {
          headers: { Accept: 'application/json' }
        });
      } catch (e) {
        res = await axios.get(`${API_BASE}/api_chapters.php?id=${id}`, {
          headers: { Accept: 'application/json' }
        }).catch(() => null);
      }
      let data = res ? parseApiResponse(res.data) : null;
      if (!data || (!data.chapter && !data.id)) {
        try {
          const fb = await axios.get(`${API_BASE}/api_chapters.php?id=${id}`, {
            headers: { Accept: 'application/json' }
          });
          data = parseApiResponse(fb.data);
        } catch (e) {}
      }

      if (data && data.chapter) {
        setChapterData(data);
        setCurrentChapterInfo(data.chapter);
      } else if (data && data.id) {
        setChapterData({ chapter: data, prev_chapter: null, next_chapter: null });
        setCurrentChapterInfo(data);
      } else {
        setError(lang === 'gu' ? 'પ્રકરણ મળ્યું નથી.' : 'Chapter not found.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError(lang === 'gu' ? 'પ્રકરણ મળ્યું નથી.' : 'Chapter not found.');
      } else {
        setError(lang === 'gu' ? 'પ્રકરણ લોડ થઈ શક્યું નથી.' : 'Could not load chapter. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, lang]);

  useEffect(() => {
    fetchChapter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchChapter]);

  // Auto-scroll sidebar to active chapter on load/change
  useEffect(() => {
    if (!sidebarRef.current || !id || allChapters.length === 0) return;
    const activeIdx = allChapters.findIndex(c => c.id === Number(id));
    if (activeIdx >= 0) {
      setScrollFocusIndex(activeIdx);
      sidebarRef.current.scrollTop = activeIdx * ITEM_HEIGHT;
    }
  }, [id, allChapters]);

  // Fast, responsive mouse wheel scrolling on sidebar (isolated from page scroll)
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Multiply delta for responsive, snappy scrolling
      const factor = e.deltaMode === 1 ? 40 : (Math.abs(e.deltaY) < 40 ? 2.5 : 1.2);
      el.scrollTop += e.deltaY * factor;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Throttled focus index calculation during scroll using requestAnimationFrame
  const isScrollingRef = useRef(false);
  const handleSidebarScroll = () => {
    if (!sidebarRef.current || isScrollingRef.current) return;
    isScrollingRef.current = true;
    window.requestAnimationFrame(() => {
      if (sidebarRef.current) {
        const top = sidebarRef.current.scrollTop;
        const currentIdx = Math.round(top / ITEM_HEIGHT);
        if (currentIdx >= 0 && currentIdx < allChapters.length) {
          setScrollFocusIndex(currentIdx);
        }
      }
      isScrollingRef.current = false;
    });
  };

  // Reading progress bar
  useEffect(() => {
    const updateProgress = () => {
      const el = document.documentElement;
      const scrollTop  = el.scrollTop || document.body.scrollTop;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable > 0) {
        setProgress(Math.min(100, (scrollTop / scrollable) * 100));
      }
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  const chapter     = chapterData?.chapter;
  const prevChapter = chapterData?.prev_chapter;
  const nextChapter = chapterData?.next_chapter;

  const getTitle = (ch) => {
    if (!ch) return '';
    if (lang === 'gu') return ch.title_gu || ch.title || `પ્રકરણ ${ch.order}`;
    return ch.title_en || ch.title || `Chapter ${ch.order}`;
  };

  const getContent = () => {
    if (!chapter) return '';
    if (lang === 'gu') return chapter.content_gu || chapter.content || '';
    return chapter.content_en || chapter.content || '';
  };

  const rawContent = getContent();

  // Sanitize content: strip hardcoded font-size, colors, backgrounds, font tags
  // This prevents content saved with one theme bleeding into another theme
  const sanitizedContent = rawContent
    .replace(/font-size\s*:\s*[^;\"]+;?/gi, '')
    .replace(/background(-color)?\s*:\s*[^;\"]+;?/gi, '')
    .replace(/\bcolor\s*:\s*[^;\"]+;?/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '');

  const activeFocusIdx = hoveredIndex !== null ? hoveredIndex : scrollFocusIndex;

  const handleContentClick = (e) => {
    const abbr = e.target.closest('abbr');
    if (abbr) {
      e.preventDefault();
      // Use data-meaning (new) or fallback to title (legacy)
      const meaning = abbr.getAttribute('data-meaning') || abbr.getAttribute('title');
      const text = abbr.textContent;
      if (meaning) {
        setActiveWordMeaning({ word: text, meaning });
      }
    }
  };

  return (
    <>
      {/* Reading Progress Bar */}
      <div
        className="chapter__progress"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />

      <main id="main-content" className="chapter">
        {/* Screen-Wide Far-Left Aligned Back Button */}
        <div className="chapter__top-bar">
          <Link
            to="/"
            id="back-to-home"
            className="chapter__icon-back-btn"
            aria-label={lang === 'gu' ? 'મુખ્ય પૃષ્ઠ' : 'Back to Chapters'}
            title={lang === 'gu' ? 'મુખ્ય પૃષ્ઠ' : 'Back to Chapters'}
          >
            <IconArrowLeft size={20} />
          </Link>
        </div>

        <div className="chapter__layout">

          {/* ── LEFT SIDEBAR — 7-Row Dynamic Optical Focus Chapter List ── */}
          <aside className="sidebar" aria-label="Chapter list">
            <div
              className="sidebar__wheel-container"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="sidebar__inner"
                ref={sidebarRef}
                onScroll={handleSidebarScroll}
              >
                {/* 3 items spacer on top so 1st item can be centered in 7 rows */}
                <div className="sidebar__spacer" style={{ height: `${ITEM_HEIGHT * 3}px` }} />
                <nav className="sidebar__list">
                  {allChapters.map((ch, idx) => {
                    const diff = Math.abs(idx - activeFocusIdx);
                    const isFocus = diff === 0;
                    const isCurrent = ch.id === Number(id);

                    return (
                      <Link
                        key={ch.id}
                        to={`/chapter/${ch.id}`}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseMove={() => { if (hoveredIndex !== idx) setHoveredIndex(idx); }}
                        className={`sidebar__item sidebar__item--dist-${Math.min(diff, 4)} ${isFocus ? 'sidebar__item--focus' : ''} ${isCurrent ? 'sidebar__item--active' : ''}`}
                        style={{ height: `${ITEM_HEIGHT}px` }}
                      >
                        <span className="sidebar__item-num">{lang === 'gu' ? toGujaratiDigits(ch.order) : ch.order}</span>
                        <span className="sidebar__item-title">{getTitle(ch)}</span>
                      </Link>
                    );
                  })}
                </nav>
                {/* 3 items spacer on bottom so last item can be centered in 7 rows */}
                <div className="sidebar__spacer" style={{ height: `${ITEM_HEIGHT * 3}px` }} />
              </div>
            </div>
          </aside>

          {/* ── RIGHT — Reading Content ── */}
          <div className="chapter__main">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="chapter__error" role="alert">
                <IconAlert size={36} color="var(--accent)" />
                <h1>{lang === 'gu' ? 'પ્રકરણ મળ્યું નથી' : 'Chapter Not Found'}</h1>
                <p>{error}</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  {lang === 'gu' ? 'મુખ્ય પૃષ્ઠ પર પાછા જાઓ' : 'Return Home'}
                </Link>
              </div>
            ) : (
              <article className="chapter__article">
                {/* Chapter Header */}
                <header className="chapter__header">
                  <span className="chapter__order-badge font-rasa">
                    {lang === 'gu' ? `પ્રકરણ ${chapter.order}` : `Chapter ${chapter.order}`}
                  </span>
                  <h1 className="chapter__title font-rasa">{getTitle(chapter)}</h1>
                </header>

                <div className="chapter__divider" aria-hidden="true" />

                {/* Reading content — font size from context with forced justify default */}
                <div
                  className="chapter__reading-container font-rasa"
                  style={{ fontSize: `${fontSize}px` }}
                  onClick={handleContentClick}
                >
                  {/<\/?(?:p|div|br|span|b|strong|abbr|h[1-6]|center)\b/i.test(sanitizedContent) ? (
                    <div
                      className="chapter__html-content"
                      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />
                  ) : (
                    <div className="chapter__text-content">
                      {sanitizedContent.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Previous & Next — Glass buttons ── */}
                <nav className="chapter__footer-nav" aria-label="Chapter navigation">
                  {prevChapter ? (
                    <Link
                      to={`/chapter/${prevChapter.id}`}
                      id={`prev-chapter-${prevChapter.id}`}
                      className="chapter__nav-glass chapter__nav-glass--prev"
                      aria-label={lang === 'gu' ? `અગાઉનું: ${getTitle(prevChapter)}` : `Previous: ${getTitle(prevChapter)}`}
                      title={getTitle(prevChapter)}
                    >
                      <IconChevronLeft size={22} color="currentColor" />
                    </Link>
                  ) : (
                    <div className="chapter__nav-glass chapter__nav-glass--disabled" aria-hidden="true">
                      <IconChevronLeft size={22} color="currentColor" />
                    </div>
                  )}

                  <div className="chapter__nav-center">
                    <span className="chapter__nav-current font-rasa">
                      {lang === 'gu' ? `પ્રકરણ ${chapter.order}` : `Chapter ${chapter.order}`}
                    </span>
                    <span className="chapter__nav-dots" aria-hidden="true">
                      {[prevChapter, chapter, nextChapter].map((ch, i) => (
                        <span
                          key={i}
                          className={`chapter__nav-dot ${ch?.id === chapter?.id ? 'chapter__nav-dot--active' : ''} ${!ch ? 'chapter__nav-dot--empty' : ''}`}
                        />
                      ))}
                    </span>
                  </div>

                  {nextChapter ? (
                    <Link
                      to={`/chapter/${nextChapter.id}`}
                      id={`next-chapter-${nextChapter.id}`}
                      className="chapter__nav-glass chapter__nav-glass--next"
                      aria-label={lang === 'gu' ? `આગળ: ${getTitle(nextChapter)}` : `Next: ${getTitle(nextChapter)}`}
                      title={getTitle(nextChapter)}
                    >
                      <IconChevronRight size={22} color="currentColor" />
                    </Link>
                  ) : (
                    <div className="chapter__nav-glass chapter__nav-glass--disabled" aria-hidden="true">
                      <IconChevronRight size={22} color="currentColor" />
                    </div>
                  )}
                </nav>
              </article>
            )}
          </div>
        </div>
      </main>

      {/* Word Meaning Touch/Click Popup Modal */}
      {activeWordMeaning && (
        <div
          className="word-meaning-overlay"
          onClick={() => setActiveWordMeaning(null)}
        >
          <div
            className="word-meaning-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="word-meaning-card__header">
              <span className="word-meaning-card__tag font-rasa">
                {lang === 'gu' ? 'શબ્દાર્થ' : 'Word Meaning'}
              </span>
              <button
                type="button"
                className="word-meaning-card__close"
                onClick={() => setActiveWordMeaning(null)}
                aria-label="Close"
              >
                <IconX size={16} />
              </button>
            </div>
            <h3 className="word-meaning-card__word font-rasa">{activeWordMeaning.word}</h3>
            <p className="word-meaning-card__meaning font-rasa">{activeWordMeaning.meaning}</p>
          </div>
        </div>
      )}
    </>
  );
}

