'use client';
import { useState, useEffect, useRef } from 'react';
import { quizDatabase } from '../../services/quizDatabase';

// ── LaTeX renderer ──
function LatexInline({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    import('katex').then(katex => {
      const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
      const segs = []; let last = 0, m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) segs.push({ t:'text', c:text.slice(last, m.index) });
        const raw = m[1];
        const isBlk = raw.startsWith('$$') || raw.startsWith('\\[');
        const inner = raw.startsWith('$$')?raw.slice(2,-2):raw.startsWith('\\[')?raw.slice(2,-2):raw.startsWith('\\(')?raw.slice(2,-2):raw.slice(1,-1);
        segs.push({ t:isBlk?'block':'inline', c:inner.trim() });
        last = m.index + raw.length;
      }
      if (last < text.length) segs.push({ t:'text', c:text.slice(last) });
      if (ref.current) ref.current.innerHTML = segs.map(s => {
        if (s.t==='text') return `<span>${s.c.replace(/\n/g,'<br/>')}</span>`;
        try { return katex.default.renderToString(s.c, { displayMode:s.t==='block', throwOnError:false, strict:false }); }
        catch { return `<span>${s.c}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref}>{text}</span>;
}

// ── Medal colours for leaderboard ──
const MEDALS = ['🥇','🥈','🥉'];
const ACCENTS = ['#F5A623','#1D9E75','#378ADD','#7F77DD','#D85A30','#D4537E'];

export default function QuizResultsModal({ quiz, onClose }) {
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [exporting,setExporting]= useState(false);
  const [tab,      setTab]      = useState('leaderboard'); // leaderboard | perquestion

  const totalMarks = quiz.totalMarks || quiz.questions.reduce((s,q) => s+(q.marks||0), 0);

  useEffect(() => {
    (async () => {
      const res = await quizDatabase.getQuizResults(quiz.id);
      setResults(res);
      setLoading(false);
    })();
  }, [quiz.id]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await quizDatabase.downloadQuizCSV(quiz.id, quiz.title);
    } catch (e) { alert(e.message); }
    setExporting(false);
  };

  // ── Summary stats ──
  const n         = results.length;
  const scores    = results.map(r => r.score || 0);
  const avg       = n > 0 ? Math.round((scores.reduce((a,b) => a+b, 0) / n) * 10) / 10 : 0;
  const highest   = n > 0 ? Math.max(...scores) : 0;
  const lowest    = n > 0 ? Math.min(...scores) : 0;
  const avgPct    = totalMarks > 0 ? Math.round((avg / totalMarks) * 100) : 0;

  // ── Per-question accuracy ──
  const qAccuracy = quiz.questions.map((_, qi) => {
    const answered = results.filter(r => (r.perQuestion?.[qi]?.answered?.length || 0) > 0).length;
    const correct  = results.filter(r => r.perQuestion?.[qi]?.isCorrect).length;
    return { answered, correct, pct: answered > 0 ? Math.round((correct/answered)*100) : 0 };
  });

  return (
    <div style={S.ov} onClick={onClose}>
      <div style={S.card} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ background:'linear-gradient(135deg, #1a2744, #243561)', padding:'22px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'3px' }}>Quiz Results</div>
              <div style={{ fontSize:'18px', fontWeight:800, color:'white' }}>{quiz.title}</div>
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button onClick={handleExport} disabled={exporting}
                style={{ padding:'8px 16px', borderRadius:'var(--radius-sm)', background:'rgba(245,166,35,0.15)', border:'1px solid rgba(245,166,35,0.4)', color:'#F5A623', fontSize:'12px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
              </button>
              <button style={{ ...S.close, background:'rgba(255,255,255,0.1)', color:'white' }} onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginTop:'18px' }}>
            {[
              { label:'Submissions', value:n,       color:'white' },
              { label:'Avg Score',   value:`${avg}/${totalMarks}`, color:'#4ADE80' },
              { label:'Highest',     value:highest, color:'#FCD34D' },
              { label:'Avg %',       value:`${avgPct}%`, color:'#60A5FA' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'10px 14px' }}>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', fontWeight:600 }}>{label}</div>
                <div style={{ fontSize:'20px', fontWeight:800, color, fontFamily:'DM Mono', marginTop:'2px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', borderBottom:'2px solid var(--gray-100)', background:'var(--gray-50)' }}>
          {[
            { key:'leaderboard', label:'🏆 Leaderboard' },
            { key:'perquestion', label:'📊 Per Question' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, padding:'12px', fontSize:'12px', fontWeight:700, border:'none', background:'transparent', cursor:'pointer', transition:'all 0.15s',
                color:   tab===t.key ? 'var(--orange)' : 'var(--gray-400)',
                borderBottom: tab===t.key ? '2px solid var(--orange)' : '2px solid transparent',
                marginBottom:'-2px',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ overflowY:'auto', flex:1 }}>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px' }}>
              <div style={{ width:'32px', height:'32px', border:'3px solid var(--gray-200)', borderTopColor:'var(--orange)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'var(--gray-400)' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>📭</div>
              <div style={{ fontSize:'14px', fontWeight:600 }}>No submissions yet</div>
            </div>
          ) : tab === 'leaderboard' ? (

            /* ── Leaderboard tab ── */
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:'8px' }}>
              {results.map((r, idx) => {
                const pct   = totalMarks > 0 ? Math.round((r.score / totalMarks) * 100) : 0;
                const color = ACCENTS[idx % ACCENTS.length];
                const isTop = idx < 3;

                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'var(--radius-md)', background: isTop ? 'var(--off-white)' : 'var(--white)', border:`1px solid ${isTop ? 'var(--gray-200)' : 'var(--gray-100)'}`, position:'relative', overflow:'hidden' }}>
                    {isTop && (
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background:color }} />
                    )}
                    {/* Rank */}
                    <div style={{ width:'28px', textAlign:'center', flexShrink:0 }}>
                      {isTop
                        ? <span style={{ fontSize:'18px' }}>{MEDALS[idx]}</span>
                        : <span style={{ fontSize:'13px', fontWeight:800, color:'var(--gray-400)', fontFamily:'DM Mono' }}>#{idx+1}</span>
                      }
                    </div>
                    {/* Avatar */}
                    <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:800, color:'white', flexShrink:0 }}>
                      {(r.studentName || 'A')[0].toUpperCase()}
                    </div>
                    {/* Name */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.studentName || 'Anonymous'}</div>
                      <div style={{ fontSize:'10px', color:'var(--gray-400)', fontFamily:'DM Mono' }}>
                        {(r.perQuestion||[]).filter(p=>p.isCorrect).length}/{quiz.questions.length} correct
                      </div>
                    </div>
                    {/* Score bar */}
                    <div style={{ width:'100px', flexShrink:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--gray-400)', marginBottom:'3px' }}>
                        <span style={{ fontWeight:700, color:pct>=70?'#15803D':pct>=40?'#92400E':'var(--red)', fontFamily:'DM Mono' }}>{r.score}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ width:'100%', height:'5px', background:'var(--gray-100)', borderRadius:'99px', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:'99px', width:`${pct}%`, background: pct>=70?'#4ADE80':pct>=40?'#FCD34D':'#F87171', transition:'width 0.6s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (

            /* ── Per-question tab ── */
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:'10px' }}>
              {quiz.questions.map((q, qi) => {
                const acc = qAccuracy[qi];
                const pct = acc.pct;
                const barColor = pct >= 70 ? '#4ADE80' : pct >= 40 ? '#FCD34D' : '#F87171';

                return (
                  <div key={qi} style={{ border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 16px', background:'var(--gray-50)', borderBottom:'1px solid var(--gray-100)' }}>
                      <div style={{ flex:1, marginRight:'16px' }}>
                        <div style={{ fontSize:'10px', fontWeight:700, color:'var(--orange)', textTransform:'uppercase', marginBottom:'3px' }}>
                          Q{qi+1} · {q.marks} mark{q.marks!==1?'s':''}
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--ink)' }}>
                          <LatexInline text={q.text} />
                        </div>
                        {/* Correct options */}
                        <div style={{ marginTop:'6px', display:'flex', gap:'4px', flexWrap:'wrap' }}>
                          {(q.correctOptions||[]).map(ci => (
                            <span key={ci} style={{ fontSize:'10px', fontWeight:700, color:'#15803D', background:'#DCFCE7', padding:'2px 8px', borderRadius:'99px' }}>
                              ✓ {String.fromCharCode(65+ci)}: {q.options[ci]?.text || '(image)'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'22px', fontWeight:800, color:barColor, fontFamily:'DM Mono' }}>{pct}%</div>
                        <div style={{ fontSize:'10px', color:'var(--gray-400)' }}>{acc.correct}/{acc.answered} correct</div>
                        <div style={{ width:'70px', height:'5px', background:'var(--gray-100)', borderRadius:'99px', overflow:'hidden', marginTop:'5px', float:'right' }}>
                          <div style={{ height:'100%', borderRadius:'99px', width:`${pct}%`, background:barColor, transition:'width 0.6s' }} />
                        </div>
                      </div>
                    </div>
                    {/* Option breakdown */}
                    <div style={{ padding:'10px 16px', display:'flex', flexDirection:'column', gap:'4px' }}>
                      {q.options.map((o, oi) => {
                        const isCorrect = (q.correctOptions||[]).includes(oi);
                        const chosenCount = results.filter(r => (r.perQuestion?.[qi]?.answered||[]).includes(oi)).length;
                        const chosenPct  = n > 0 ? Math.round((chosenCount/n)*100) : 0;
                        return (
                          <div key={oi} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0' }}>
                            <span style={{ width:'20px', height:'20px', borderRadius:'4px', background:isCorrect?'#DCFCE7':'var(--gray-100)', border:`1px solid ${isCorrect?'#4ADE80':'var(--gray-200)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700, color:isCorrect?'#15803D':'var(--gray-500)', flexShrink:0 }}>
                              {String.fromCharCode(65+oi)}
                            </span>
                            <span style={{ width:'100px', fontSize:'12px', color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                              <LatexInline text={o.text || '(image)'} />
                            </span>
                            <div style={{ width:'80px', height:'5px', background:'var(--gray-100)', borderRadius:'99px', overflow:'hidden', flexShrink:0 }}>
                              <div style={{ height:'100%', borderRadius:'99px', width:`${chosenPct}%`, background:isCorrect?'#4ADE80':'var(--gray-300)' }} />
                            </div>
                            <span style={{ fontSize:'11px', fontWeight:700, color:isCorrect?'#15803D':'var(--gray-500)', minWidth:'36px', textAlign:'right', fontFamily:'DM Mono' }}>{chosenPct}%</span>
                            <span style={{ fontSize:'10px', color:'var(--gray-400)', minWidth:'30px' }}>({chosenCount})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--gray-100)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--gray-50)', flexShrink:0 }}>
          <span style={{ fontSize:'11px', color:'var(--gray-400)', fontWeight:600 }}>
            {quiz.questions.length} questions · {totalMarks} total marks
            {quiz.negativeMarking && ` · −${quiz.negativeValue} per wrong`}
          </span>
          <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:'var(--radius-sm)', background:'var(--gray-100)', color:'var(--gray-700)', fontSize:'13px', fontWeight:600, border:'none', cursor:'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  ov:    { position:'fixed', inset:0, background:'rgba(26,25,23,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' },
  card:  { background:'var(--white)', borderRadius:'var(--radius-xl)', width:'100%', maxWidth:'700px', maxHeight:'92vh', boxShadow:'var(--shadow-lg)', overflow:'hidden', display:'flex', flexDirection:'column' },
  close: { width:'30px', height:'30px', borderRadius:'50%', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', flexShrink:0 },
};
