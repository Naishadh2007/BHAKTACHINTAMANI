import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useReading } from '../context/ReadingContext';
import { IconX, IconCheck, IconMessage } from './Icons';
import './FeedbackModal.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FEEDBACK_API = `${API_BASE}/api_feedbacks.php`;

const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
const toGujaratiDigits = (num) => {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (digit) => GUJARATI_DIGITS[Number(digit)]);
};

export default function FeedbackModal({ isOpen, onClose }) {
  const { lang } = useLanguage();
  const { currentChapterId, currentChapterInfo } = useReading();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]       = useState('');

  // Chapter locking details
  const hasActiveChapter = Boolean(currentChapterId || currentChapterInfo);
  const chapterOrder = currentChapterInfo?.order || currentChapterId || '';
  const chapterTitle = lang === 'gu'
    ? (currentChapterInfo?.title_gu || currentChapterInfo?.title || `પ્રકરણ ${toGujaratiDigits(chapterOrder)}`)
    : (currentChapterInfo?.title_en || currentChapterInfo?.title || `Chapter ${chapterOrder}`);

  const lockedChapterText = hasActiveChapter
    ? (lang === 'gu' ? `પ્રકરણ ${toGujaratiDigits(chapterOrder)}: ${chapterTitle}` : `Chapter ${chapterOrder}: ${chapterTitle}`)
    : (lang === 'gu' ? 'સામાન્ય વેબસાઇટ પ્રતિભાવ (General)' : 'General Platform Feedback');

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(lang === 'gu' ? 'કૃપા કરીને નામ, ઈમેઈલ અને સંદેશ ત્રણેય વિગતો ભરો.' : 'Please fill in Name, Email, and Message.');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      chapter_id: hasActiveChapter ? Number(currentChapterId || currentChapterInfo?.id) : null,
      chapter_title: hasActiveChapter ? lockedChapterText : 'General',
    };

    try {
      // 1. Try Laravel API /api/feedback
      let res = await axios.post(`${API_BASE}/api/feedback`, payload).catch(() => null);

      // 2. Fallback to direct standalone PHP script
      if (!res?.data?.success && !res?.data?.id) {
        res = await axios.post(FEEDBACK_API, payload).catch(() => null);
      }

      setSubmitting(false);
      setSubmitted(true);
      setMessage('');

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(lang === 'gu' ? 'પ્રતિભાવ મોકલવામાં ભૂલ આવી. ફરી પ્રયાસ કરો.' : 'Failed to submit feedback. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="feedback-close-btn"
          onClick={onClose}
          aria-label={lang === 'gu' ? 'બંધ કરો' : 'Close'}
        >
          <IconX size={18} />
        </button>

        {submitted ? (
          <div className="feedback-success">
            <div className="feedback-success__icon">
              <IconCheck size={36} color="#ffffff" />
            </div>
            <h2 className="feedback-success__title font-rasa" style={{ margin: 0 }}>
              {lang === 'gu' ? 'આભાર' : 'Thank You'}
            </h2>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            {/* Header */}
            <div className="feedback-header">
              <div className="feedback-header__icon">
                <IconMessage size={22} color="var(--accent)" />
              </div>
              <div>
                <h2 className="feedback-title font-rasa">
                  {lang === 'gu' ? 'પ્રતિભાવ / સુધારો મોકલો' : 'Submit Feedback / Correction'}
                </h2>
              </div>
            </div>

            {error && (
              <div className="feedback-error-banner" role="alert">
                {error}
              </div>
            )}

            {/* Name Input (Required) */}
            <div className="feedback-group">
              <label className="feedback-label" htmlFor="feedback-name">
                {lang === 'gu' ? 'તમારું નામ (Name) *' : 'Your Name *'}
              </label>
              <input
                id="feedback-name"
                type="text"
                required
                className="feedback-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'gu' ? 'તમારું પૂરું નામ લખો...' : 'Enter your full name...'}
              />
            </div>

            {/* Email Input (Required) */}
            <div className="feedback-group">
              <label className="feedback-label" htmlFor="feedback-email">
                {lang === 'gu' ? 'ઈમેઈલ એડ્રેસ (Email) *' : 'Email Address *'}
              </label>
              <input
                id="feedback-email"
                type="email"
                required
                className="feedback-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'gu' ? 'તમારું ઈમેઈલ લખો (e.g. name@example.com)...' : 'Enter your email...'}
              />
            </div>

            {/* Message Textarea (Required) */}
            <div className="feedback-group">
              <label className="feedback-label" htmlFor="feedback-msg">
                {lang === 'gu' ? 'પ્રતિભાવ / સુધારો સંદેશ (Message) *' : 'Message / Correction Details *'}
              </label>
              <textarea
                id="feedback-msg"
                className="feedback-textarea font-reading"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  lang === 'gu'
                    ? 'પ્રકરણમાં કઈ પંક્તિ કે શબ્દમાં ભૂલ છે અથવા તમારો સુધારો અહીં વિગતવાર લખો...'
                    : 'Describe the typo, correction, or feedback in detail...'
                }
              />
            </div>

            {/* Actions */}
            <div className="feedback-actions">
              <button
                type="button"
                className="btn btn-secondary feedback-cancel-btn"
                onClick={onClose}
              >
                {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-primary feedback-submit-btn"
                disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
              >
                {submitting
                  ? (lang === 'gu' ? 'મોકલી રહ્યું છે...' : 'Sending...')
                  : (lang === 'gu' ? 'પ્રતિભાવ મોકલો' : 'Submit Feedback')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
