import { useRef, useEffect, useState } from 'react';
import {
  IconBold,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustify,
  IconHelp
} from '../../components/Icons';
import './RichTextEditor.css';

export default function RichTextEditor({ value, onChange, label, placeholder }) {
  const editorRef = useRef(null);
  const [showHTML, setShowHTML] = useState(false);

  // Abbr / Word Meaning Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [meaningText, setMeaningText] = useState('');
  const [savedRange, setSavedRange] = useState(null);
  const [existingAbbrNode, setExistingAbbrNode] = useState(null);

  // Sync value to editor content if external change
  useEffect(() => {
    if (!showHTML && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, showHTML]);

  const exec = (command, val = null) => {
    if (showHTML) return;
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Strip inline color/background styles before saving so content is theme-neutral
  const cleanHTML = (html) => html
    .replace(/\bcolor\s*:\s*[^;\"]+;?/gi, '')
    .replace(/background(-color)?\s*:\s*[^;\"]+;?/gi, '')
    .replace(/font-size\s*:\s*[^;\"]+;?/gi, '');

  const handleInput = () => {
    if (editorRef.current) {
      onChange(cleanHTML(editorRef.current.innerHTML));
    }
  };

  /**
   * Open Modal to Add/Edit Word Meaning (<abbr title="...">)
   */
  const handleOpenAbbrModal = () => {
    const sel = window.getSelection();

    // Check if cursor is currently inside an existing <abbr> element
    let node = sel && sel.anchorNode ? sel.anchorNode : null;
    let abbrNode = null;
    while (node && editorRef.current && node !== editorRef.current) {
      if (node.nodeType === 1 && node.tagName === 'ABBR') {
        abbrNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (abbrNode && editorRef.current.contains(abbrNode)) {
      setExistingAbbrNode(abbrNode);
      setSelectedText(abbrNode.textContent);
      setMeaningText(abbrNode.getAttribute('data-meaning') || abbrNode.getAttribute('title') || '');
      setSavedRange(null);
      setModalOpen(true);
      return;
    }

    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      alert('કૃપા કરીને પહેલા એડિટરમાંથી કોઈ શબ્દ સિલેક્ટ કરો.\n(Please select a word in the editor first to add a word meaning.)');
      return;
    }

    const range = sel.getRangeAt(0);

    // Ensure selection is inside editor
    if (editorRef.current && !editorRef.current.contains(range.commonAncestorContainer)) {
      alert('કૃપા કરીને એડિટરની અંદરથી શબ્દ સિલેક્ટ કરો.');
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      alert('કૃપા કરીને શબ્દ સિલેક્ટ કરો.');
      return;
    }

    setSelectedText(text);
    setMeaningText('');
    setExistingAbbrNode(null);
    setSavedRange(range.cloneRange());
    setModalOpen(true);
  };

  /**
   * Save Word Meaning (<abbr title="...">)
   */
  const handleSaveAbbr = () => {
    if (!meaningText.trim()) return;
    const titleVal = meaningText.trim();

    if (existingAbbrNode) {
      existingAbbrNode.setAttribute('data-meaning', titleVal);
      // Remove old title to suppress browser tooltip
      existingAbbrNode.removeAttribute('title');
    } else if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);

      const abbrEl = document.createElement('abbr');
      // Use data-meaning instead of title to avoid browser native tooltip
      abbrEl.setAttribute('data-meaning', titleVal);
      abbrEl.textContent = selectedText;

      savedRange.deleteContents();
      savedRange.insertNode(abbrEl);

      // Place cursor after inserted abbr
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(abbrEl);
      newRange.collapse(true);
      sel.addRange(newRange);
    }

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }

    closeModal();
  };

  /**
   * Remove Word Meaning (Unwrap <abbr>)
   */
  const handleRemoveAbbr = () => {
    if (existingAbbrNode) {
      // Keep any bold/other formatting nested inside the word.
      existingAbbrNode.replaceWith(...existingAbbrNode.childNodes);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
    closeModal();
  };

  const closeModal = () => {
    setModalOpen(false);
    setMeaningText('');
    setSelectedText('');
    setSavedRange(null);
    setExistingAbbrNode(null);
  };

  /**
   * Fix Copy-Paste Glitch:
   * Intercepts paste, strips out inline font colors, font-sizes, and font-families,
   * preserving text paragraphs and formatting so it strictly uses the Rasa font & theme color.
   */
  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    let pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');

    if (!pastedData) return;

    // If pasted HTML exists, clean out inline color, font-size, background, and font-family style declarations
    let cleaned = pastedData
      .replace(/style="[^"]*"/gi, (match) => {
        return match
          .replace(/color\s*:\s*[^;"]+;?/gi, '')
          .replace(/font-size\s*:\s*[^;"]+;?/gi, '')
          .replace(/font-family\s*:\s*[^;"]+;?/gi, '')
          .replace(/background(-color)?\s*:\s*[^;"]+;?/gi, '');
      })
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '');

    // If html failed or empty, fallback to plain text lines
    if (!cleaned || !clipboardData.getData('text/html')) {
      const text = clipboardData.getData('text/plain');
      const formattedLines = text
        .split('\n')
        .map(line => line.trim() ? `<p>${line.trim()}</p>` : '<br>')
        .join('');
      cleaned = formattedLines;
    }

    document.execCommand('insertHTML', false, cleaned);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="rich-editor">
      {label && <label className="form-label">{label}</label>}

      {/* Editor Toolbar with Bold, Alignments & Word Meaning (<abbr>) */}
      <div className="rich-editor__toolbar">
        <span className="rich-editor__font-badge">Gopika / Title Two</span>

        <div className="rich-editor__divider" />

        {/* Bold */}
        <button
          type="button"
          className="btn btn-secondary btn-sm rich-editor__btn"
          onClick={() => exec('bold')}
          disabled={showHTML}
          title="Bold (Bharati Title Two)"
        >
          <IconBold size={16} />
          <span>Bold</span>
        </button>

        {/* Word Meaning (<abbr>) Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm rich-editor__btn"
          onClick={handleOpenAbbrModal}
          disabled={showHTML}
          title="Add Word Meaning / Glossary (<abbr>)"
        >
          <IconHelp size={16} />
          <span>શબ્દાર્થ (Abbr)</span>
        </button>

        <div className="rich-editor__divider" />

        {/* Alignment Buttons */}
        <button
          type="button"
          className="btn btn-ghost btn-sm rich-editor__btn"
          onClick={() => exec('justifyLeft')}
          disabled={showHTML}
          title="Align Left"
        >
          <IconAlignLeft size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm rich-editor__btn"
          onClick={() => exec('justifyCenter')}
          disabled={showHTML}
          title="Align Center"
        >
          <IconAlignCenter size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm rich-editor__btn"
          onClick={() => exec('justifyRight')}
          disabled={showHTML}
          title="Align Right"
        >
          <IconAlignRight size={16} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm rich-editor__btn"
          onClick={() => exec('justifyFull')}
          disabled={showHTML}
          title="Justify Text"
        >
          <IconAlignJustify size={16} />
        </button>
        <div className="rich-editor__divider" />
        <button
          type="button"
          className={`btn btn-sm rich-editor__btn ${showHTML ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowHTML(current => !current)}
          aria-pressed={showHTML}
          title="View and edit the stored HTML"
        >
          {showHTML ? 'Visual' : 'HTML'}
        </button>
      </div>

      {/* Editable Container */}
      {showHTML ? (
        <textarea
          className="rich-editor__source"
          aria-label={`${label || 'Content'} HTML source`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
      <div
        ref={editorRef}
        className="rich-editor__content font-rasa"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder || 'Write chapter content here…'}
        onClick={(e) => {
          // Click on an abbr in editor → open Edit/Remove modal
          const abbr = e.target.closest('abbr');
          if (abbr && editorRef.current && editorRef.current.contains(abbr)) {
            e.preventDefault();
            setExistingAbbrNode(abbr);
            setSelectedText(abbr.textContent);
            setMeaningText(abbr.getAttribute('data-meaning') || abbr.getAttribute('title') || '');
            setSavedRange(null);
            setModalOpen(true);
          }
        }}
      />
      )}

      {/* Word Meaning Input Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
              {existingAbbrNode ? 'શબ્દાર્થ એડિટ કરો / Edit Word Meaning' : 'શબ્દાર્થ ઉમેરો / Add Word Meaning'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.1rem', fontSize: '0.88rem' }}>
              Selected Word: <strong style={{ color: 'var(--accent)', fontSize: '1rem' }}>"{selectedText}"</strong>
            </p>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">અર્થ / Meaning (Popup Text)</label>
              <input
                type="text"
                className="form-input"
                value={meaningText}
                onChange={(e) => setMeaningText(e.target.value)}
                placeholder="ઉદા. ભગવાનની દિવ્ય લીલા / Divine pastime"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveAbbr();
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {existingAbbrNode && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleRemoveAbbr}
                >
                  અર્થ દૂર કરો / Remove
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveAbbr}
                disabled={!meaningText.trim()}
              >
                Save Meaning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
