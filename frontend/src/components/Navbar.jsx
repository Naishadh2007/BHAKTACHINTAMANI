import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useReading } from '../context/ReadingContext';
import {
  IconBook, IconSun, IconMoon,
  IconTranslate, IconDotsThree,
  IconBookmark, IconBookmarkFilled,
  IconMessage,
} from './Icons';
import FeedbackModal from './FeedbackModal';
import './Navbar.css';

const FONT_SIZES = [20, 22, 24, 26, 28, 30];

export default function Navbar() {
  const { theme, toggleTheme }   = useTheme();
  const { lang, toggleLanguage } = useLanguage();
  const location = useLocation();

  const { fontSize, setFontSize, bookmark, toggleBookmark, isBookmarked, currentChapterId } = useReading();

  const isChapterPage   = location.pathname.startsWith('/chapter/');
  const chapterBookmark = currentChapterId ? isBookmarked(Number(currentChapterId)) : false;

  // 3-dot popup & feedback modal state
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const menuRef  = useRef(null);
  const dotsBtnRef = useRef(null);

  // Close popup on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        dotsBtnRef.current && !dotsBtnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close popup on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const fontIdx    = FONT_SIZES.indexOf(fontSize);
  const canDecrease = fontIdx > 0;
  const canIncrease = fontIdx < FONT_SIZES.length - 1;

  return (
    <header className="navbar" role="banner">
      <div className="navbar__inner">

        {/* ── Brand ── */}
        <Link to="/" className="navbar__brand" aria-label="Bhakta-Chintamani — Go to home">
          <span className="navbar__brand-icon" aria-hidden="true">
            <IconBook size={22} color="var(--accent)" />
          </span>
          <span className="navbar__brand-name">Bhakta-Chintamani</span>
        </Link>

        {/* ── Right actions ── */}
        <div className="navbar__actions">

          {/* ── Language Toggle (icon button) ── */}
          <button
            id="lang-toggle-btn"
            className="navbar-icon-button navbar-icon-button--lang"
            onClick={toggleLanguage}
            aria-label={lang === 'gu' ? 'Switch to English' : 'ગુજરાતીમાં બદલો'}
            title={lang === 'gu' ? 'Switch to English' : 'Switch to Gujarati'}
          >
            <IconTranslate size={18} color="currentColor" />
            <span className="navbar-lang-badge">{lang === 'gu' ? 'GU' : 'EN'}</span>
          </button>

          {/* ── Theme Toggle ── */}
          <button
            id="theme-toggle"
            className="navbar-icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark'
              ? <IconSun  size={19} color="var(--accent)" />
              : <IconMoon size={19} color="currentColor" />}
          </button>

          {/* ── 3-dot Menu ── */}
          <div className="navbar__menu-wrap" style={{ position: 'relative' }}>
            <button
              id="more-menu-btn"
              ref={dotsBtnRef}
              className={`navbar-icon-button ${menuOpen ? 'navbar-icon-button--active' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="More options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              title="More options"
            >
              <IconDotsThree size={18} color="currentColor" />
            </button>

            {/* ── Popup / Dropdown ── */}
            {menuOpen && (
              <div
                ref={menuRef}
                className="navbar-dropdown navbar__popup"
                role="dialog"
                aria-label="Reading options"
              >
                {/* Arrow */}
                <div className="navbar__popup-arrow" aria-hidden="true" />

                {/* ── Font Size Section ── */}
                <div className="popup-section">
                  <div className="popup-section__label">
                    {lang === 'gu' ? 'ટેક્સ્ટ સાઇઝ' : 'Text Size'}
                  </div>
                  <div className="popup-fontsize">
                    <button
                      id="popup-font-dec"
                      className="navbar-icon-button popup-fontsize__btn"
                      onClick={() => canDecrease && setFontSize(FONT_SIZES[fontIdx - 1])}
                      disabled={!canDecrease}
                      aria-label="Decrease font size"
                    >
                      <span className="popup-fontsize__a popup-fontsize__a--sm">A</span>
                    </button>

                    <div className="popup-fontsize__track" aria-hidden="true">
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s}
                          className={`popup-fontsize__dot ${fontSize === s ? 'popup-fontsize__dot--active' : ''}`}
                          onClick={() => setFontSize(s)}
                          aria-label={`Font size ${s}px`}
                          title={`${s}px`}
                        />
                      ))}
                    </div>

                    <button
                      id="popup-font-inc"
                      className="navbar-icon-button popup-fontsize__btn"
                      onClick={() => canIncrease && setFontSize(FONT_SIZES[fontIdx + 1])}
                      disabled={!canIncrease}
                      aria-label="Increase font size"
                    >
                      <span className="popup-fontsize__a popup-fontsize__a--lg">A</span>
                    </button>
                  </div>
                  <div className="popup-fontsize__value" aria-live="polite">
                    {fontSize}px
                  </div>
                </div>

                {/* ── Bookmark Section (only on chapter page) ── */}
                {isChapterPage && (
                  <>
                    <div className="popup-divider" aria-hidden="true" />
                    <div className="popup-section">
                      <div className="popup-section__label">
                        {lang === 'gu' ? 'બુકમાર્ક' : 'Bookmark'}
                      </div>
                      <button
                        id="popup-bookmark-btn"
                        className={`navbar-dropdown-item popup-bookmark-btn ${chapterBookmark ? 'popup-bookmark-btn--active' : ''}`}
                        onClick={() => currentChapterId && toggleBookmark(Number(currentChapterId), '', Number(currentChapterId))}
                        aria-label={chapterBookmark ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        {chapterBookmark
                          ? <IconBookmarkFilled size={16} color="var(--accent)" />
                          : <IconBookmark size={16} color="var(--accent)" />}
                        <span>
                          {chapterBookmark
                            ? (lang === 'gu' ? 'સેવ થઈ ગઈ' : 'Bookmarked')
                            : (lang === 'gu' ? 'બુકમાર્ક ઉમેરો' : 'Add Bookmark')}
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* ── Feedback Section ── */}
                <div className="popup-divider" aria-hidden="true" />
                <div className="popup-section" style={{ paddingBottom: 0 }}>
                  <button
                    id="popup-feedback-btn"
                    className="navbar-dropdown-item popup-feedback-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      setFeedbackOpen(true);
                    }}
                    aria-label={lang === 'gu' ? 'પ્રતિભાવ આપો' : 'Give feedback'}
                  >
                    <IconMessage size={16} color="var(--accent)" />
                    <span>
                      {lang === 'gu' ? 'પ્રતિભાવ / સુચન' : 'Feedback'}
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </header>
  );
}
