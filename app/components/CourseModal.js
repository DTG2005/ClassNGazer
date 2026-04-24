'use client';
import { useState, useEffect } from 'react';
import { courseDatabase } from '../services/userDatabase';

export default function CourseModal({ onClose, user, onCourseChange }) {
  const [tab, setTab] = useState('create');
  const [courses, setCourses] = useState([]);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [taEmail, setTaEmail] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const c = user?.role === 'professor'
        ? await courseDatabase.getCoursesByProfessor(user.uid)
        : await courseDatabase.getCoursesByStudent(user.uid);
      setCourses(c);
      if (c.length > 0 && !selectedCourse) setSelectedCourse(c[0]);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!courseName.trim() || !courseCode.trim()) return;
    setLoading(true); setMsg('');
    try {
      await courseDatabase.createCourse({ courseName: courseName.trim(), courseCode: courseCode.trim(), professorId: user.uid });
      setMsg('✅ Course created!'); setCourseName(''); setCourseCode('');
      await loadCourses(); if (onCourseChange) onCourseChange();
    } catch (e) { setMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const handleAddStudent = async () => {
    if (!selectedCourse || !studentEmail.trim()) return;
    setLoading(true); setMsg('');
    try {
      await courseDatabase.enrollStudent(selectedCourse.id, studentEmail.trim());
      setMsg('✅ Student added!'); setStudentEmail(''); await loadCourses();
    } catch (e) { setMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const handleRemoveStudent = async (sid) => {
    if (!selectedCourse) return;
    try {
      await courseDatabase.removeStudent(selectedCourse.id, sid);
      setMsg('✅ Removed'); await loadCourses();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const handleAddTa = async () => {
    if (!selectedCourse || !taEmail.trim()) return;
    setLoading(true); setMsg('');
    try {
      await courseDatabase.addTa(selectedCourse.id, taEmail.trim());
      setMsg('✅ TA added!'); setTaEmail(''); await loadCourses();
    } catch (e) { setMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course?')) return;
    try {
      await courseDatabase.deleteCourse(id);
      setMsg('✅ Deleted'); setSelectedCourse(null); await loadCourses();
      if (onCourseChange) onCourseChange();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const handleJoinCourse = async () => {
    if (!courseCode.trim()) return;
    setLoading(true); setMsg('');
    try {
      await courseDatabase.joinCourse(courseCode.trim(), user.uid);
      setMsg('✅ Joined!'); setCourseCode(''); await loadCourses();
      if (onCourseChange) onCourseChange();
    } catch (e) { setMsg('❌ ' + e.message); }
    setLoading(false);
  };

  const isProfessor = user?.role === 'professor';
  const tabs = isProfessor ? ['create', 'manage', 'students', 'TAs'] : ['join', 'my courses'];

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={hdr}>
        <div><div style={hdrT}>Course Management</div><div style={hdrS}>{isProfessor ? 'Create and manage your courses' : 'Join and view courses'}</div></div>
        <button style={closeB} onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '0 24px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: tab === t ? 'var(--orange)' : 'var(--gray-400)', borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent', background: 'transparent', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={body}>
        {msg && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: msg.startsWith('✅') ? 'var(--green-pale)' : 'var(--red-pale)', color: msg.startsWith('✅') ? '#15803D' : '#B91C1C', marginBottom: '12px' }}>{msg}</div>}

        {/* Professor: Create */}
        {tab === 'create' && isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input style={inp} placeholder="Course name (e.g. Software Engineering)" value={courseName} onChange={e => setCourseName(e.target.value)} />
            <input style={inp} placeholder="Course code (e.g. CS310)" value={courseCode} onChange={e => setCourseCode(e.target.value)} />
            <button onClick={handleCreate} disabled={loading} style={btn}>{loading ? 'Creating...' : 'Create Course'}</button>
          </div>
        )}

        {/* Professor: Manage */}
        {tab === 'manage' && isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {courses.length === 0 ? <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No courses yet.</p> :
              courses.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: selectedCourse?.id === c.id ? 'var(--orange-pale)' : 'var(--gray-50)', border: `2px solid ${selectedCourse?.id === c.id ? 'var(--orange-dim)' : 'var(--gray-100)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  onClick={() => setSelectedCourse(c)}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{c.courseName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'DM Mono' }}>{c.courseCode} · {c.enrolledStudentIds?.length || 0} students</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(c.id); }} style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-pale)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>Delete</button>
                </div>
              ))
            }
          </div>
        )}

        {/* Professor: Students */}
        {tab === 'students' && isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!selectedCourse ? <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Select a course in Manage tab first.</p> : <>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)' }}>Add student to {selectedCourse.courseCode}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Student ID or email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
                <button onClick={handleAddStudent} disabled={loading} style={{ ...btn, width: 'auto', padding: '10px 20px' }}>Add</button>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', marginTop: '8px' }}>Enrolled ({selectedCourse.enrolledStudentIds?.length || 0})</div>
              {(selectedCourse.enrolledStudentIds || []).map(sid => (
                <div key={sid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                  <span>{sid}</span>
                  <button onClick={() => handleRemoveStudent(sid)} style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>Remove</button>
                </div>
              ))}
            </>}
          </div>
        )}

        {/* Professor: TAs */}
        {tab === 'TAs' && isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!selectedCourse ? <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Select a course in Manage tab first.</p> : <>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)' }}>Add TA to {selectedCourse.courseCode}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Student ID (must be enrolled)" value={taEmail} onChange={e => setTaEmail(e.target.value)} />
                <button onClick={handleAddTa} disabled={loading} style={{ ...btn, width: 'auto', padding: '10px 20px' }}>Add TA</button>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', marginTop: '8px' }}>Current TAs ({selectedCourse.ta?.length || 0})</div>
              {(selectedCourse.ta || []).map(tid => (
                <div key={tid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--blue-pale)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                  <span>{tid}</span>
                  <button onClick={async () => { await courseDatabase.removeTa(selectedCourse.id, tid); setMsg('✅ TA removed'); loadCourses(); }} style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>Remove</button>
                </div>
              ))}
            </>}
          </div>
        )}

        {/* Student: Join */}
        {tab === 'join' && !isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Enter your course code to join</p>
            <input style={inp} placeholder="Course code (e.g. CS310)" value={courseCode} onChange={e => setCourseCode(e.target.value)} />
            <button onClick={handleJoinCourse} disabled={loading} style={btn}>{loading ? 'Joining...' : 'Join Course'}</button>
          </div>
        )}

        {/* Student: My courses */}
        {tab === 'my courses' && !isProfessor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {courses.length === 0 ? <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No courses. Join one above.</p> :
              courses.map(c => (
                <div key={c.id} style={{ padding: '12px 14px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{c.courseName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'DM Mono' }}>{c.courseCode}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '540px', maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' };
const hdr = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px' };
const hdrT = { fontSize: '18px', fontWeight: 800, color: 'var(--ink)' };
const hdrS = { fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' };
const closeB = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const body = { padding: '20px 24px 24px' };
const inp = { width: '100%', padding: '11px 14px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--ink)', background: 'var(--gray-50)' };
const btn = { width: '100%', padding: '12px', background: 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)' };
