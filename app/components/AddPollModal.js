'use client';
import { useState, useEffect, useRef } from 'react';


// ── Inline LaTeX renderer (reusable) ──
function LatexInline({ text, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    import('katex').then(katex => {
      const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
      const segments = [];
      let last = 0, match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > last) segments.push({ type: 'text', content: text.slice(last, match.index) });
        const raw = match[1];
        const isBlock = raw.startsWith('$$') || raw.startsWith('\\[');
        const inner = raw.startsWith('$$') ? raw.slice(2, -2) : raw.startsWith('\\[') ? raw.slice(2, -2) : raw.startsWith('\\(') ? raw.slice(2, -2) : raw.slice(1, -1);
        segments.push({ type: isBlock ? 'block' : 'inline', content: inner.trim() });
        last = match.index + raw.length;
      }
      if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });
      ref.current.innerHTML = segments.map(seg => {
        if (seg.type === 'text') return `<span>${seg.content.replace(/\n/g, '<br/>')}</span>`;
        try { return katex.default.renderToString(seg.content, { displayMode: seg.type === 'block', throwOnError: false, strict: false }); }
        catch { return `<span style="color:#e53e3e">${seg.content}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref} className={className}>{text}</span>;
}

export default function AddPollModal({ onClose, onAdd, onEdit, initialData }) {
  const isEditing = !!initialData;

  const [question, setQuestion] = useState(initialData?.question || '');
  const [questionImage, setQuestionImage] = useState(initialData?.questionImage || null);
  const [topic, setTopic] = useState(initialData?.topic || '');
  
  // Format options with dynamic length and image support
  const [options, setOptions] = useState(() => {
    if (initialData?.options) {
      return initialData.options.map(o => ({ text: typeof o === 'string' ? o : (o.text || ''), image: typeof o === 'string' ? null : (o.image || null) }));
    }
    return [{ text: '', image: null }, { text: '', image: null }, { text: '', image: null }, { text: '', image: null }];
  });

  const [correctIndices, setCorrectIndices] = useState(() => {
    if (initialData?.correctOptions && initialData.correctOptions.length > 0) return initialData.correctOptions;
    if (initialData?.correctOption !== undefined && initialData?.correctOption !== -1 && initialData?.correctOption !== null) return [initialData.correctOption];
    if (initialData?.options) {
      const idxs = initialData.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0);
      return idxs.length > 0 ? idxs : [];
    }
    return [];
  });

  const [timer, setTimer] = useState(initialData?.timeLimit || 60);
  const [solution, setSolution] = useState(initialData?.solution || '');
  const [solutionImage, setSolutionImage] = useState(initialData?.solutionImage || null);
  const [mode, setMode] = useState('live');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getLabel = (i) => String.fromCharCode(65 + i);

  const toggleCorrect = (i) => {
    setCorrectIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleAddOption = () => setOptions([...options, { text: '', image: null }]);
  const handleRemoveOption = (indexToRemove) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== indexToRemove));
    setCorrectIndices(prev => prev.filter(i => i !== indexToRemove).map(i => i > indexToRemove ? i - 1 : i));
  };

  const uploadFile = async (file) => {
    if (!file || typeof file === 'string') return file; // If string, it's already a URL

    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`/api/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server upload failed');
    
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!question.trim() && !questionImage) return;
    if (correctIndices.length === 0) return;
    if (options.some(o => !o.text.trim() && !o.image)) return;

    setSubmitting(true);
    try {
      const qImgUrl = await uploadFile(questionImage);
      const sImgUrl = await uploadFile(solutionImage);
      const optsWithImg = await Promise.all(options.map(async (o) => ({ ...o, image: await uploadFile(o.image) })));

      const pollData = {
        question: question.trim(), 
        questionImage: qImgUrl,
        topic: topic || 'General', 
        timer, 
        mode, 
        solution: solution.trim(),
        solutionImage: sImgUrl,
        correctOptions: correctIndices,
        correctOption: correctIndices[0] ?? -1, // Keep legacy fallback
        options: optsWithImg.map((o, i) => ({ 
          id: getLabel(i).toLowerCase(), 
          label: getLabel(i), 
          text: o.text.trim(), 
          image: o.image,
          votes: 0, 
          isCorrect: correctIndices.includes(i) 
        })),
      };

      if (isEditing) {
        await onEdit(initialData.id, pollData);
        return; // onClose is called by parent
      }

      if (mode === 'schedule') {
        if (!scheduleDate || !scheduleTime) { alert('Please select date and time'); setSubmitting(false); return; }
        const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
        if (scheduledFor <= new Date()) { alert('Scheduled time must be in the future'); setSubmitting(false); return; }
        pollData.scheduledFor = scheduledFor.toISOString();
      }
      await onAdd(pollData);
    } catch (e) {
      console.error(e);
      alert(`⚠️ Error: ${e.message || 'Error uploading images or saving poll. Check console.'}`);
    }
    setSubmitting(false);
  };

  const isValid = (question.trim() || questionImage) && correctIndices.length > 0 && options.every(o => o.text.trim() || o.image);
  const today = new Date().toISOString().split('T')[0];

  const ImageInput = ({ file, setFile }) => {
    const isUrl = typeof file === 'string';
    const previewUrl = file ? (isUrl ? file : URL.createObjectURL(file)) : null;
    const fileInputRef = useRef(null);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={(e) => { 
            const selected = e.target.files[0];
            if (selected) {
              // Enforce 5MB limit before trusting the payload to the internet
              if (selected.size > 5 * 1024 * 1024) {
                alert("⚠️ Image size is too large! Please select an image smaller than 5MB.");
                e.target.value = null;
                return;
              }
              setFile(selected); 
            }
            e.target.value = null; 
          }} 
          style={{ display: 'none' }} 
        />
        {!file ? (
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            style={{ background: 'var(--gray-100)', border: '1px dashed var(--gray-400)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-200)'; e.currentTarget.style.borderColor = 'var(--gray-500)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.borderColor = 'var(--gray-400)'; }}
          >
            <span style={{ fontSize: '14px' }}>📷</span> Add Image
          </button>
        ) : (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <img src={previewUrl} alt="preview" style={{ height: '40px', width: 'auto', borderRadius: '6px', border: '1px solid var(--gray-300)', cursor: 'pointer', objectFit: 'contain', background: 'var(--gray-50)' }} onClick={() => fileInputRef.current?.click()} title="Click to change image" />
            <button type="button" onClick={() => setFile(null)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Remove image">✕</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={hdr}>
        <div><div style={hdrT}>{isEditing ? 'Edit Poll' : 'New Poll'}</div><div style={hdrS}>{isEditing ? 'Update question, options, or timer' : 'Create, schedule, or save as draft'}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => setPreview(p => !p)}
            style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
              background: preview ? 'var(--orange)' : 'var(--gray-100)',
              color: preview ? 'white' : 'var(--gray-600)', border: 'none' }}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button style={closeB} onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={bdy}>
        <div style={fld}><label style={lbl}>Topic <span style={opt}>optional</span></label>
          <input style={inp} placeholder="e.g. Algorithms, Data Structures..." value={topic} onChange={e => setTopic(e.target.value)} /></div>

        <div style={fld}><label style={lbl}>Question <span style={opt}>— LaTeX: $...$  $$...$$</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight: '72px', background: 'var(--gray-50)' }}>
              {question ? <LatexInline text={question} /> : null}
              {questionImage && <div style={{ marginTop: '8px' }}><img src={typeof questionImage === 'string' ? questionImage : URL.createObjectURL(questionImage)} style={{ maxHeight: '100px', borderRadius: '6px' }} /></div>}
              {!question && !questionImage && <span style={{ color: 'var(--gray-400)' }}>Nothing to preview</span>}
            </div>
          ) : (
            <>
              <textarea style={{ ...inp, resize: 'none', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }} placeholder="Enter your poll question..." value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
              <ImageInput file={questionImage} setFile={setQuestionImage} />
            </>
          )}
        </div>

        <div style={fld}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={lbl}>Answer Options <span style={opt}>— click ✓ to mark correct.</span></label>
            <button onClick={handleAddOption} style={{ fontSize: '11px', background: 'var(--gray-200)', border: 'none', borderRadius: '4px', padding: '2px 6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Option</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{options.map((o, i) => {
            const isCorrect = correctIndices.includes(i);
            return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', border: `2px solid ${isCorrect ? '#86EFAC' : 'var(--gray-100)'}`, borderRadius: 'var(--radius-md)', background: isCorrect ? '#F0FDF4' : 'var(--gray-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: isCorrect ? '#DCFCE7' : 'var(--white)', border: `2px solid ${isCorrect ? '#4ADE80' : 'var(--gray-200)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: isCorrect ? '#15803D' : 'var(--gray-600)', flexShrink: 0 }}>{getLabel(i)}</span>
                {preview ? (
                  <div style={{ flex: 1, fontSize: '13px', color: 'var(--ink)' }}>
                    {o.text ? <LatexInline text={o.text} /> : null}
                    {o.image && <div style={{ marginTop: '4px' }}><img src={typeof o.image === 'string' ? o.image : URL.createObjectURL(o.image)} style={{ maxHeight: '60px', borderRadius: '4px' }} /></div>}
                    {!o.text && !o.image && <span style={{ color: 'var(--gray-400)' }}>Option {getLabel(i)}</span>}
                  </div>
                ) : (
                  <input style={{ flex: 1, fontSize: '13px', color: 'var(--ink)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Mono, monospace' }} placeholder={`Option ${getLabel(i)} — LaTeX ok`} value={o.text} onChange={e => { const n = [...options]; n[i].text = e.target.value; setOptions(n); }} />
                )}
                {options.length > 2 && !preview && <button style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }} onClick={() => handleRemoveOption(i)}>🗑</button>}
                <button style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, background: isCorrect ? '#4ADE80' : 'var(--gray-100)', color: isCorrect ? 'white' : 'var(--gray-400)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }} onClick={() => toggleCorrect(i)}>✓</button>
              </div>
              {!preview && <ImageInput file={o.image} setFile={(file) => { const n = [...options]; n[i].image = file; setOptions(n); }} />}
            </div>
          )})}</div>
        </div>

        <div style={fld}><label style={lbl}>Solution <span style={opt}>optional — shown after poll ends.</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight: '60px', background: 'var(--gray-50)' }}>
              {solution ? <LatexInline text={solution} /> : null}
              {solutionImage && <div style={{ marginTop: '8px' }}><img src={typeof solutionImage === 'string' ? solutionImage : URL.createObjectURL(solutionImage)} style={{ maxHeight: '100px', borderRadius: '6px' }} /></div>}
              {!solution && !solutionImage && <span style={{ color: 'var(--gray-400)' }}>No solution</span>}
            </div>
          ) : (
            <>
              <textarea style={{ ...inp, resize: 'none', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }} placeholder="Explain the correct answer, add context, formula, or reference..." value={solution} onChange={e => setSolution(e.target.value)} rows={3} />
              <ImageInput file={solutionImage} setFile={setSolutionImage} />
            </>
          )}
        </div>

        <div style={fld}><label style={lbl}>Time Limit</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {[30, 60, 90, 120, 180].map(t => (<button key={t} onClick={() => setTimer(t)} style={{ padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: timer === t ? 'var(--orange)' : 'var(--gray-100)', color: timer === t ? 'white' : 'var(--gray-600)', border: 'none' }}>{t}s</button>))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="range" min={10} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--orange)' }} />
            <div style={{ minWidth: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: 'var(--orange)', fontFamily: 'DM Mono' }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</div>
          </div>
        </div>

        {!isEditing && (
        <div style={fld}>
          <label style={lbl}>Launch Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'live', icon: '🚀', label: 'Go Live Now', desc: 'Starts immediately' },
              { key: 'schedule', icon: '📅', label: 'Schedule', desc: 'Auto-starts at set time' },
              { key: 'draft', icon: '📝', label: 'Save Draft', desc: 'Start manually later' },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                style={{ flex: 1, padding: '12px 8px', borderRadius: 'var(--radius-md)', border: `2px solid ${mode === m.key ? 'var(--orange)' : 'var(--gray-100)'}`, background: mode === m.key ? 'var(--orange-pale)' : 'var(--gray-50)', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: mode === m.key ? 'var(--orange)' : 'var(--gray-600)' }}>{m.label}</div>
                <div style={{ fontSize: '9px', color: 'var(--gray-400)', marginTop: '2px' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
        )}

        {!isEditing && mode === 'schedule' && (
          <div style={{ ...fld, background: 'var(--blue-pale)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #93C5FD' }}>
            <label style={{ ...lbl, color: '#1D4ED8' }}>Schedule For</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#3B82F6', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={scheduleDate} min={today} onChange={e => setScheduleDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #93C5FD', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--ink)', background: 'white', fontFamily: 'DM Mono' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#3B82F6', display: 'block', marginBottom: '4px' }}>Time</label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #93C5FD', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--ink)', background: 'white', fontFamily: 'DM Mono' }} />
              </div>
            </div>
            {scheduleDate && scheduleTime && (
              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: '#1D4ED8' }}>
                Will go live: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={ftr}>
        <button style={cancelS} onClick={onClose} disabled={submitting}>Cancel</button>
        <button disabled={!isValid || submitting} onClick={handleSubmit}
          style={{ padding: '11px 24px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none', cursor: (!isValid || submitting) ? 'not-allowed' : 'pointer',
            background: isValid ? (isEditing ? 'var(--gray-600)' : mode === 'schedule' ? 'var(--blue)' : mode === 'draft' ? 'var(--gray-600)' : 'var(--orange)') : 'var(--gray-200)',
            color: isValid ? 'white' : 'var(--gray-400)',
            boxShadow: isValid ? (isEditing ? 'none' : mode === 'schedule' ? '0 8px 24px rgba(59,130,246,0.2)' : mode === 'draft' ? 'none' : 'var(--shadow-orange)') : 'none',
          }}>
          {submitting ? 'Uploading...' : isEditing ? '💾 Save Changes' : mode === 'live' ? '🚀 Launch Poll' : mode === 'schedule' ? '📅 Schedule Poll' : '📝 Save Draft'}
        </button>
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' };
const hdr = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' };
const hdrT = { fontSize: '18px', fontWeight: 800, color: 'var(--ink)' };
const hdrS = { fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' };
const closeB = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' };
const bdy = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' };
const fld = { display: 'flex', flexDirection: 'column', gap: '8px' };
const lbl = { fontSize: '12px', fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const opt = { fontWeight: 400, color: 'var(--gray-400)', textTransform: 'none' };
const inp = { padding: '11px 14px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--ink)', background: 'var(--gray-50)' };
const ftr = { display: 'flex', gap: '10px', padding: '16px 24px 24px', justifyContent: 'flex-end', borderTop: '1px solid var(--gray-100)' };
const cancelS = { padding: '11px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, background: 'var(--gray-100)', color: 'var(--gray-600)', border: 'none', cursor: 'pointer' };
