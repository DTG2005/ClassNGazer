'use client';
import { useState, useEffect, useRef } from 'react';

// ── Reusable LaTeX renderer ──
function LatexInline({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    import('katex').then(katex => {
      const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
      const segs = []; let last = 0, m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) segs.push({ t: 'text', c: text.slice(last, m.index) });
        const raw = m[1];
        const isBlk = raw.startsWith('$$') || raw.startsWith('\\[');
        const inner = raw.startsWith('$$') ? raw.slice(2,-2) : raw.startsWith('\\[') ? raw.slice(2,-2) : raw.startsWith('\\(') ? raw.slice(2,-2) : raw.slice(1,-1);
        segs.push({ t: isBlk ? 'block' : 'inline', c: inner.trim() });
        last = m.index + raw.length;
      }
      if (last < text.length) segs.push({ t: 'text', c: text.slice(last) });
      ref.current.innerHTML = segs.map(s => {
        if (s.t === 'text') return `<span>${s.c.replace(/\n/g,'<br/>')}</span>`;
        try { return katex.default.renderToString(s.c, { displayMode: s.t === 'block', throwOnError: false, strict: false }); }
        catch { return `<span style="color:#e53e3e">${s.c}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref}>{text}</span>;
}

// ── Image picker component ──
function ImageInput({ file, setFile }) {
  const isUrl    = typeof file === 'string';
  const preview  = file ? (isUrl ? file : URL.createObjectURL(file)) : null;
  const inputRef = useRef(null);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'4px' }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => {
          const f = e.target.files[0];
          if (!f) return;
          if (f.size > 5*1024*1024) { alert('Image must be under 5MB'); e.target.value=null; return; }
          setFile(f); e.target.value = null;
        }} />
      {!file ? (
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ padding:'5px 10px', fontSize:'11px', fontWeight:600, background:'var(--gray-100)', border:'1px dashed var(--gray-400)', borderRadius:'6px', color:'var(--gray-600)', cursor:'pointer' }}>
          📷 Add Image
        </button>
      ) : (
        <div style={{ position:'relative', display:'inline-flex' }}>
          <img src={preview} alt="preview" style={{ height:'38px', width:'auto', borderRadius:'6px', objectFit:'contain', border:'1px solid var(--gray-200)', cursor:'pointer' }}
            onClick={() => inputRef.current?.click()} title="Click to change" />
          <button type="button" onClick={() => setFile(null)}
            style={{ position:'absolute', top:'-6px', right:'-6px', background:'var(--red)', color:'white', border:'none', borderRadius:'50%', width:'16px', height:'16px', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Single Question Editor ──
function QuestionEditor({ q, idx, onChange, onClear, onRemove, canRemove, preview, negativeMarking }) {
  const getLabel = i => String.fromCharCode(65 + i);

  const setField = (field, val) => onChange({ ...q, [field]: val });

  const setOption = (i, key, val) => {
    const opts = [...q.options];
    opts[i] = { ...opts[i], [key]: val };
    onChange({ ...q, options: opts });
  };

  const addOption = () => {
    if (q.options.length >= 6) return;
    onChange({ ...q, options: [...q.options, { text:'', image:null }] });
  };

  const removeOption = (i) => {
    if (q.options.length <= 2) return;
    const opts = q.options.filter((_, j) => j !== i);
    const correct = q.correctOptions.filter(c => c !== i).map(c => c > i ? c-1 : c);
    onChange({ ...q, options: opts, correctOptions: correct });
  };

  const toggleCorrect = (i) => {
    const has = q.correctOptions.includes(i);
    setField('correctOptions', has ? q.correctOptions.filter(c => c !== i) : [...q.correctOptions, i]);
  };

  return (
    <div style={{ border:'2px solid var(--gray-100)', borderRadius:'var(--radius-md)', overflow:'hidden', background:'var(--white)' }}>
      {/* Question header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'var(--gray-50)', borderBottom:'1px solid var(--gray-100)' }}>
        <span style={{ fontSize:'12px', fontWeight:800, color:'var(--orange)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Question {idx + 1}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, color:'var(--gray-600)', display:'flex', alignItems:'center', gap:'4px' }}>
            Marks:
            <input type="number" min="0.5" step="0.5"
              value={q.marks}
              onChange={e => setField('marks', e.target.value)}
              onBlur={e => { if (e.target.value === '' || isNaN(Number(e.target.value))) setField('marks', '1'); }}
              style={{ width:'54px', padding:'4px 6px', border:`1px solid ${(q.marks === '' || q.marks == null) ? '#F87171' : 'var(--gray-200)'}`, borderRadius:'6px', fontSize:'12px', fontFamily:'DM Mono', textAlign:'center', background:'var(--white)' }} />
          </label>
          <button onClick={() => { if(confirm('Clear all fields for this question?')) onClear(); }} title="Clear question fields"
            style={{ background:'var(--gray-200)', color:'var(--gray-700)', border:'none', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
            🧹 Clear
          </button>
          {canRemove && (
            <button onClick={onRemove} title="Remove question"
              style={{ background:'var(--red-pale)', color:'var(--red)', border:'none', borderRadius:'6px', padding:'4px 8px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
              🗑 Remove
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {/* Question text */}
        <div>
          <label style={lbl}>Question Text <span style={{ fontWeight:400, color:'var(--gray-400)', textTransform:'none' }}>— LaTeX: $...$</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight:'50px', background:'var(--gray-50)' }}>
              {q.text ? <LatexInline text={q.text} /> : <span style={{ color:'var(--gray-400)' }}>Nothing to preview</span>}
              {q.questionImage && <img src={typeof q.questionImage==='string' ? q.questionImage : URL.createObjectURL(q.questionImage)} style={{ maxHeight:'80px', borderRadius:'6px', marginTop:'8px', display:'block' }} />}
            </div>
          ) : (
            <>
              <textarea value={q.text} onChange={e => setField('text', e.target.value)}
                placeholder="Enter question..." rows={2}
                style={{ ...inp, resize:'none', lineHeight:1.5, fontFamily:'DM Mono' }} />
              <ImageInput file={q.questionImage} setFile={v => setField('questionImage', v)} />
            </>
          )}
        </div>

        {/* Options */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
            <label style={lbl}>Options <span style={{ fontWeight:400, color:'var(--gray-400)', textTransform:'none' }}>— ✓ marks correct</span></label>
            {!preview && q.options.length < 6 && (
              <button onClick={addOption}
                style={{ fontSize:'11px', fontWeight:700, background:'var(--gray-100)', border:'none', borderRadius:'4px', padding:'2px 8px', cursor:'pointer', color:'var(--gray-600)' }}>
                + Add Option
              </button>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {q.options.map((o, i) => {
              const isCorrect = q.correctOptions.includes(i);
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', gap:'3px', padding:'8px 10px', border:`2px solid ${isCorrect ? '#86EFAC' : 'var(--gray-100)'}`, borderRadius:'var(--radius-sm)', background: isCorrect ? '#F0FDF4' : 'var(--gray-50)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ width:'22px', height:'22px', borderRadius:'5px', background: isCorrect ? '#DCFCE7' : 'var(--white)', border:`2px solid ${isCorrect ? '#4ADE80' : 'var(--gray-200)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color: isCorrect ? '#15803D' : 'var(--gray-600)', flexShrink:0 }}>
                      {getLabel(i)}
                    </span>
                    {preview ? (
                      <div style={{ flex:1, fontSize:'13px' }}>
                        {o.text ? <LatexInline text={o.text} /> : <span style={{ color:'var(--gray-400)' }}>option {getLabel(i)}</span>}
                        {o.image && <img src={typeof o.image==='string' ? o.image : URL.createObjectURL(o.image)} style={{ maxHeight:'40px', borderRadius:'4px', display:'block', marginTop:'4px' }} />}
                      </div>
                    ) : (
                      <input value={o.text} onChange={e => setOption(i, 'text', e.target.value)}
                        placeholder={`Option ${getLabel(i)}`}
                        style={{ flex:1, fontSize:'13px', background:'transparent', border:'none', outline:'none', fontFamily:'DM Mono' }} />
                    )}
                    {q.options.length > 2 && !preview && (
                      <button onClick={() => removeOption(i)} style={{ border:'none', background:'transparent', color:'var(--red)', cursor:'pointer', fontSize:'14px', padding:'0' }}>🗑</button>
                    )}
                    <button onClick={() => toggleCorrect(i)}
                      style={{ width:'24px', height:'24px', borderRadius:'5px', flexShrink:0, background: isCorrect ? '#4ADE80' : 'var(--gray-100)', color: isCorrect ? 'white' : 'var(--gray-400)', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
                      ✓
                    </button>
                  </div>
                  {!preview && <ImageInput file={o.image} setFile={v => setOption(i, 'image', v)} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Negative marks per question */}
        {negativeMarking && !preview && (
          <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'var(--radius-sm)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#B91C1C', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'2px' }}>Negative Marks for Wrong Answer</div>
              <div style={{ fontSize:'11px', color:'#9B1C1C', marginTop:'1px' }}>How many marks to deduct if a student answers this question incorrectly.</div>
            </div>
            <input
              type="number"
              min="0"
              step="0.25"
              placeholder="e.g. 0.25"
              value={q.negativeMarks === '' ? '' : (q.negativeMarks ?? '')}
              onChange={e => setField('negativeMarks', e.target.value)}
              style={{ width:'80px', padding:'8px 10px', border:`2px solid ${(q.negativeMarks === '' || q.negativeMarks == null) ? '#F87171' : '#FCA5A5'}`, borderRadius:'8px', fontSize:'15px', fontFamily:'DM Mono', textAlign:'center', background:'white', color:'#B91C1C', fontWeight:700, outline:'none' }}
            />
          </div>
        )}

        {/* Solution */}
        <div>
          <label style={lbl}>Solution <span style={{ fontWeight:400, color:'var(--gray-400)', textTransform:'none' }}>optional — shown after quiz ends</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight:'40px', background:'var(--gray-50)' }}>
              {q.solution ? <LatexInline text={q.solution} /> : <span style={{ color:'var(--gray-400)' }}>No solution</span>}
              {q.solutionImage && <img src={typeof q.solutionImage==='string' ? q.solutionImage : URL.createObjectURL(q.solutionImage)} style={{ maxHeight:'60px', borderRadius:'6px', marginTop:'6px', display:'block' }} />}
            </div>
          ) : (
            <>
              <textarea value={q.solution} onChange={e => setField('solution', e.target.value)}
                placeholder="Explain the correct answer..." rows={2}
                style={{ ...inp, resize:'none', lineHeight:1.5, fontFamily:'DM Mono' }} />
              <ImageInput file={q.solutionImage} setFile={v => setField('solutionImage', v)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Blank question template ──
const blankQuestion = () => ({
  text: '', questionImage: null,
  options: [{ text:'', image:null }, { text:'', image:null }, { text:'', image:null }, { text:'', image:null }],
  correctOptions: [],
  marks: '1',
  negativeMarks: '0',
  solution: '', solutionImage: null,
});

// ── Main Modal ──
export default function AddQuizModal({ onClose, onAdd, onEdit, initialData }) {
  const isEditing = !!initialData;
  const draft = (!isEditing && typeof localStorage !== 'undefined') ? (() => { try { return JSON.parse(localStorage.getItem('quiz_draft')) || {}; } catch(e){ return {}; } })() : {};

  const [title,           setTitle]           = useState(initialData?.title || draft.title || '');
  const [timer,           setTimer]           = useState(initialData?.timer || draft.timer || 600);
  const [timerMins, setTimerMins] = useState(String(Math.floor((initialData?.timer || draft.timer || 600) / 60)));
  const [timerSecs, setTimerSecs] = useState(String((initialData?.timer || draft.timer || 600) % 60));
  const [negativeMarking, setNegativeMarking] = useState(initialData?.negativeMarking ?? draft.negativeMarking ?? false);
  const [negativeValue,   setNegativeValue]   = useState(initialData?.negativeValue || 0.25);
  const [shuffleQ,        setShuffleQ]        = useState(initialData?.shuffleQuestions ?? draft.shuffleQ ?? false);
  const [shuffleOpts,     setShuffleOpts]     = useState(initialData?.shuffleOptions ?? draft.shuffleOpts ?? false);
  const [questions,       setQuestions]       = useState(() => {
    if (initialData?.questions?.length) {
      return initialData.questions.map(q => ({
        text: q.text || '', questionImage: q.questionImage || null,
        options: (q.options || []).map(o => ({ text: typeof o==='string'?o:(o.text||''), image: typeof o==='string'?null:(o.image||null) })),
        correctOptions: q.correctOptions || [],
        marks: q.marks != null ? String(q.marks) : '1',
        negativeMarks: q.negativeMarks != null ? q.negativeMarks : '',
        solution: q.solution || '', solutionImage: q.solutionImage || null,
      }));
    }
    if (draft.questions?.length) return draft.questions;
    return [blankQuestion()];
  });
  const [preview,     setPreview]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);



  // Save draft to localStorage
  useEffect(() => {
    if (isEditing) return;
    const draft = {
      title,
      timer,
      negativeMarking,
      shuffleQ,
      shuffleOpts,
      // Strip images from questions to avoid large local storage footprint
      questions: questions.map(q => ({
        ...q,
        questionImage: null,
        solutionImage: null,
        options: q.options.map(o => ({ ...o, image: null }))
      }))
    };
    localStorage.setItem('quiz_draft', JSON.stringify(draft));
  }, [title, timer, negativeMarking, shuffleQ, shuffleOpts, questions, isEditing]);

  // Sync timer mins/secs strings → total seconds
  useEffect(() => {
    const m = parseInt(timerMins, 10);
    const s = parseInt(timerSecs, 10);
    setTimer((isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s));
  }, [timerMins, timerSecs]);

  const updateQuestion = (i, updated) => {
    const qs = [...questions]; qs[i] = updated; setQuestions(qs);
  };

  const addQuestion = () => {
    setQuestions([...questions, blankQuestion()]);
    // Scroll to bottom after render
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  };

  const removeQuestion = (i) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, j) => j !== i));
  };

  const uploadFile = async (file) => {
    if (!file || typeof file === 'string') return file || null;
    const fd = new FormData();
    fd.append('file', file);
    const res  = await fetch('/api/upload', { method:'POST', body:fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.secure_url;
  };

  const handleSubmit = async () => {
    // Validate
    if (!title.trim()) { alert('Please enter a quiz title.'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim() && !q.questionImage) { alert(`Question ${i+1}: Please enter text or add an image.`); return; }
      if (q.options.some(o => !o.text.trim() && !o.image)) { alert(`Question ${i+1}: All options must have text or an image.`); return; }
      if (q.correctOptions.length === 0) { alert(`Question ${i+1}: Please mark at least one correct option.`); return; }
      if (q.marks === '' || isNaN(Number(q.marks)) || Number(q.marks) <= 0) {
        alert(`Question ${i+1}: Please enter a valid marks value.`); return;
      }
      if (negativeMarking && (q.negativeMarks === '' || q.negativeMarks == null || isNaN(Number(q.negativeMarks)))) {
        alert(`Question ${i+1}: Please enter the negative marks to deduct for a wrong answer.`); return;
      }
    }
    const totalSecs = (parseInt(timerMins, 10) || 0) * 60 + (parseInt(timerSecs, 10) || 0);
    if (totalSecs < 30) { alert('Minimum quiz duration is 30 seconds.'); return; }

    setSubmitting(true);
    try {
      // Upload all images
      const uploadedQuestions = await Promise.all(questions.map(async q => ({
        text:           q.text.trim(),
        questionImage:  await uploadFile(q.questionImage),
        options:        await Promise.all(q.options.map(async o => ({ text: o.text.trim(), image: await uploadFile(o.image) }))),
        correctOptions: q.correctOptions,
        marks:          Number(q.marks) || 1,
        negativeMarks:  negativeMarking ? (Number(q.negativeMarks) || 0) : 0,
        solution:       q.solution.trim(),
        solutionImage:  await uploadFile(q.solutionImage),
      })));

      const payload = {
        title: title.trim(),
        timer,
        negativeMarking,
        shuffleQuestions: shuffleQ,
        shuffleOptions:   shuffleOpts,
        questions:        uploadedQuestions,
        totalMarks:       uploadedQuestions.reduce((s, q) => s + q.marks, 0),
      };

      if (isEditing) {
        await onEdit(initialData.id, payload);
      } else {
        await onAdd(payload);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('quiz_draft');
      }
    } catch (e) {
      console.error(e);
      alert(`⚠️ Error: ${e.message || 'Failed to save quiz. Check console.'}`);
    }
    setSubmitting(false);
  };

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const _m = parseInt(timerMins, 10) || 0;
  const _s = parseInt(timerSecs, 10) || 0;
  const fmtTimer = `${String(_m).padStart(2,'0')}:${String(_s).padStart(2,'0')}`;

  const handleClearDraft = () => {
    if (!confirm('Are you sure you want to clear the entire quiz draft and start fresh?')) return;
    setTitle('');
    setTimer(600);
    setTimerMins('10');
    setTimerSecs('0');
    setNegativeMarking(false);
    setShuffleQ(false);
    setShuffleOpts(false);
    setQuestions([blankQuestion()]);
    if (typeof localStorage !== 'undefined') localStorage.removeItem('quiz_draft');
  };

  return (
    <div style={ov} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={hdr}>
          <div>
            <div style={hdrT}>{isEditing ? '✏️ Edit Quiz' : '📝 New Quiz'}</div>
            <div style={hdrS}>{questions.length} question{questions.length!==1?'s':''} · {totalMarks} total marks · {fmtTimer}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {!isEditing && (
              <button onClick={handleClearDraft}
                style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700, background:'var(--red-pale)', color:'var(--red)', border:'none', cursor:'pointer' }}
                title="Clear saved draft">
                🧹 Clear Draft
              </button>
            )}
            <button onClick={() => setPreview(p => !p)}
              style={{ padding:'4px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700, background: preview ? 'var(--orange)' : 'var(--gray-100)', color: preview ? 'white' : 'var(--gray-600)', border:'none' }}>
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button style={closeB} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={bdy}>

          {/* ── Quiz Settings ── */}
          <div style={{ background:'linear-gradient(135deg, #1a2744, #243561)', borderRadius:'var(--radius-md)', padding:'18px 20px', display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ fontSize:'11px', fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Quiz Settings</div>

            {/* Title */}
            <div>
              <label style={{ ...lbl, color:'rgba(255,255,255,0.7)' }}>Quiz Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Unit 2 – Thermodynamics Quiz"
                style={{ ...inp, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'white', width:'100%', marginTop:'6px' }} />
            </div>

            {/* Timer */}
            <div>
              <label style={{ ...lbl, color:'rgba(255,255,255,0.7)' }}>Quiz Duration</label>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'6px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'8px', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <input type="number" min="0" max="180"
                    value={timerMins}
                    onChange={e => setTimerMins(e.target.value)}
                    onBlur={e => { if (e.target.value === '' || isNaN(parseInt(e.target.value, 10))) setTimerMins('0'); }}
                    style={{ width:'40px', background:'transparent', border:'none', outline:'none', color:'white', fontSize:'22px', fontWeight:800, fontFamily:'DM Mono', textAlign:'center' }} />
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px' }}>min</span>
                </div>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'20px', fontWeight:700 }}>:</span>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'8px', padding:'6px 12px', border:'1px solid rgba(255,255,255,0.15)' }}>
                  <input type="number" min="0" max="59"
                    value={timerSecs}
                    onChange={e => setTimerSecs(e.target.value)}
                    onBlur={e => { if (e.target.value === '' || isNaN(parseInt(e.target.value, 10))) setTimerSecs('0'); }}
                    style={{ width:'40px', background:'transparent', border:'none', outline:'none', color:'white', fontSize:'22px', fontWeight:800, fontFamily:'DM Mono', textAlign:'center' }} />
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px' }}>sec</span>
                </div>
                <div style={{ flex:1, textAlign:'right', fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>
                  Total: {fmtTimer}
                </div>
              </div>
            </div>

            {/* Negative Marking — global toggle only; per-question deduction is set on each question */}
            <div style={{ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
                <div onClick={() => setNegativeMarking(n => !n)}
                  style={{ width:'38px', height:'20px', borderRadius:'99px', background: negativeMarking ? 'var(--orange)' : 'rgba(255,255,255,0.15)', transition:'background 0.2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:'2px', left: negativeMarking ? '20px' : '2px', width:'16px', height:'16px', borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.8)' }}>Negative Marking</span>
              </label>
              {negativeMarking && (
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>Set deduction per question below ↓</span>
              )}
            </div>

            {/* Shuffle toggles */}
            <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
              {[
                { label:'Shuffle Questions', val:shuffleQ, set:setShuffleQ },
                { label:'Shuffle Options',   val:shuffleOpts, set:setShuffleOpts },
              ].map(({ label, val, set: setter }) => (
                <label key={label} style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer' }}>
                  <div onClick={() => setter(v => !v)}
                    style={{ width:'32px', height:'17px', borderRadius:'99px', background: val ? '#4ADE80' : 'rgba(255,255,255,0.15)', transition:'background 0.2s', position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:'2px', left: val ? '16px' : '2px', width:'13px', height:'13px', borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Questions ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {questions.map((q, i) => (
              <QuestionEditor key={i} q={q} idx={i}
                onChange={updated => updateQuestion(i, updated)}
                onClear={() => updateQuestion(i, blankQuestion())}
                onRemove={() => removeQuestion(i)}
                canRemove={questions.length > 1}
                preview={preview}
                negativeMarking={negativeMarking} />
            ))}
          </div>

          {/* Add Question button */}
          {!preview && (
            <button onClick={addQuestion}
              style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'14px', borderRadius:'var(--radius-md)', border:'2px dashed var(--orange-dim)', background:'var(--orange-pale)', color:'var(--orange)', fontSize:'13px', fontWeight:700, justifyContent:'center', cursor:'pointer' }}>
              <span style={{ fontSize:'20px' }}>+</span> Add Question
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={ftr}>
          <div style={{ fontSize:'12px', color:'var(--gray-400)', fontWeight:600 }}>
            {questions.length} Q · {totalMarks} marks total
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button style={cancelS} onClick={onClose} disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ padding:'11px 28px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:700, border:'none', cursor: submitting ? 'not-allowed' : 'pointer',
                background:'var(--orange)', color:'white', boxShadow:'var(--shadow-orange)', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Saving...' : isEditing ? '💾 Save Changes' : '📝 Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ov      = { position:'fixed', inset:0, background:'rgba(26,25,23,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' };
const card    = { background:'var(--white)', borderRadius:'var(--radius-xl)', width:'100%', maxWidth:'640px', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--shadow-lg)' };
const hdr     = { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'22px 24px 14px', borderBottom:'1px solid var(--gray-100)', position:'sticky', top:0, background:'var(--white)', zIndex:10 };
const hdrT    = { fontSize:'17px', fontWeight:800, color:'var(--ink)' };
const hdrS    = { fontSize:'11px', color:'var(--gray-400)', marginTop:'2px' };
const closeB  = { width:'30px', height:'30px', borderRadius:'50%', background:'var(--gray-100)', color:'var(--gray-600)', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'none' };
const bdy     = { padding:'20px 24px', display:'flex', flexDirection:'column', gap:'20px' };
const ftr     = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px 22px', borderTop:'1px solid var(--gray-100)', position:'sticky', bottom:0, background:'var(--white)' };
const lbl     = { fontSize:'11px', fontWeight:700, color:'var(--gray-800)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block' };
const inp     = { padding:'9px 12px', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-sm)', fontSize:'13px', color:'var(--ink)', background:'var(--gray-50)', width:'100%', boxSizing:'border-box' };
const cancelS = { padding:'11px 18px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:600, background:'var(--gray-100)', color:'var(--gray-600)', border:'none', cursor:'pointer' };
