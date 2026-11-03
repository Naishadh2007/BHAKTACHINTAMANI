import { createContext, useContext, useState, useEffect } from 'react';

const ReadingContext = createContext(null);

// Exact padding for each font size (reduces padding as font increases for wider reading space)
const PADDING_MAP = {
  30: '0.25rem',
  32: '0.25rem',
  34: '0.25rem',
  36: '0.25rem',
  38: '0.25rem',
  40: '0.25rem',
  42: '0.25rem',
};

export function ReadingProvider({ children }) {
  // ── Font size (persisted) ──
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = parseInt(localStorage.getItem('bc-font-size'), 10);
    return saved && saved >= 30 && saved <= 42 && saved % 2 === 0 ? saved : 30;
  });

  const setFontSize = (size) => {
    setFontSizeState(size);
    localStorage.setItem('bc-font-size', String(size));
  };

  // Apply font size + matching padding to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--reading-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--reading-padding', PADDING_MAP[fontSize] || '0.25rem');
  }, [fontSize]);

  // ── Single Bookmark (only ONE chapter at a time, persisted) ──
  const [bookmark, setBookmarkState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bc-bookmark'));
      return saved && saved.chapterId ? saved : null;
    } catch {
      return null;
    }
  });

  // Set bookmark — replaces any existing bookmark
  const setBookmark = (chapterId, title, order) => {
    const bm = { chapterId, title, order };
    setBookmarkState(bm);
    localStorage.setItem('bc-bookmark', JSON.stringify(bm));
  };

  // Remove bookmark
  const removeBookmark = () => {
    setBookmarkState(null);
    localStorage.removeItem('bc-bookmark');
  };

  // Toggle: if same chapter → remove, otherwise → set new
  const toggleBookmark = (chapterId, title, order) => {
    if (bookmark && bookmark.chapterId === chapterId) {
      removeBookmark();
    } else {
      setBookmark(chapterId, title, order);
    }
  };

  const isBookmarked = (chapterId) => bookmark?.chapterId === chapterId;

  // ── Current chapter ID & Info (set by ChapterPage) ──
  const [currentChapterId, setCurrentChapterId]     = useState(null);
  const [currentChapterInfo, setCurrentChapterInfo] = useState(null);

  return (
    <ReadingContext.Provider value={{
      fontSize, setFontSize,
      bookmark, toggleBookmark, isBookmarked,
      currentChapterId, setCurrentChapterId,
      currentChapterInfo, setCurrentChapterInfo,
    }}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error('useReading must be used within ReadingProvider');
  return ctx;
}

