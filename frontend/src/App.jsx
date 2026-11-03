import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ReadingProvider } from './context/ReadingContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ChapterPage from './pages/ChapterPage';
import AdminApp from './admin/AdminApp';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ReadingProvider>
          <AuthProvider>
            <BrowserRouter>
            <a
              href="#main-content"
              style={{
                position: 'absolute', top: '-40px', left: 0,
                padding: '0.5rem 1rem', background: 'var(--accent)',
                color: '#1C1813', fontWeight: 700, zIndex: 9999,
                borderRadius: '0 0 8px 0', transition: 'top 0.2s',
              }}
              onFocus={e => (e.target.style.top = '0')}
              onBlur={e  => (e.target.style.top = '-40px')}
              id="skip-link"
            >
              Skip to main content
            </a>

            <Routes>
              {/* Public routes */}
              <Route path="/" element={<><Navbar /><HomePage /></>} />
              <Route path="/chapter/:id" element={<><Navbar /><ChapterPage /></>} />

              {/* Admin panel — separate layout */}
              <Route path="/admin/*" element={import.meta.env.DEV ? <Navigate to="/" replace /> : <AdminApp />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ReadingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
