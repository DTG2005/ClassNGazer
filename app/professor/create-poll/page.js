'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';

export default function CreatePollPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ question: '', options: ['', '', '', ''], correctOptions: [0], timer: 60, courseId: 'CS310', courseName: 'Software Engineering', imageUrls: [] });
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleOptionChange = (i, v) => { const o = [...formData.options]; o[i] = v; setFormData({ ...formData, options: o }); };
  const addOption = () => { if (formData.options.length < 6) setFormData({ ...formData, options: [...formData.options, ''] }); };
  const removeOption = (i) => {
    if (formData.options.length <= 2) return;
    const o = formData.options.filter((_, j) => j !== i);
    const c = formData.correctOptions.filter(x => x !== i).map(x => x > i ? x - 1 : x);
    setFormData({ ...formData, options: o, correctOptions: c.length ? c : [0] });
  };
  const toggleCorrect = (i) => {
    const c = formData.correctOptions.includes(i) ? formData.correctOptions.filter(x => x !== i) : [...formData.correctOptions, i];
    setFormData({ ...formData, correctOptions: c.length ? c : [0] });
  };
  const addImage = () => { if (imageUrl.trim()) { setFormData({ ...formData, imageUrls: [...formData.imageUrls, imageUrl.trim()] }); setImageUrl(''); } };
  const removeImage = (i) => setFormData({ ...formData, imageUrls: formData.imageUrls.filter((_, j) => j !== i) });

  const validate = () => { if (!formData.question.trim()) { alert('Enter a question'); return false; } if (formData.options.some(o => !o.trim())) { alert('Fill all options'); return false; } return true; };
  const buildData = () => ({ question: formData.question.trim(), options: formData.options.map(o => o.trim()), correctOption: formData.correctOptions[0], correctOptions: formData.correctOptions, imageUrls: formData.imageUrls, timer: formData.timer, courseId: formData.courseId, courseName: formData.courseName, professorId: 'demo-professor-123', professorName: 'Demo Professor' });

  const handleCreateAndStart = async (e) => { e.preventDefault(); if (!validate()) return; setLoading(true); try { const id = await pollDatabase.createPoll(buildData()); await pollDatabase.updatePollStatus(id, 'active'); alert('✅ Poll is LIVE!'); router.push('/professor/view-polls'); } catch (err) { alert('❌ ' + err.message); } finally { setLoading(false); } };
  const handleSaveDraft = async () => { if (!validate()) return; setLoading(true); try { await pollDatabase.createPoll(buildData()); alert('📝 Saved as draft.'); setFormData({ ...formData, question: '', options: ['', '', '', ''], correctOptions: [0], imageUrls: [] }); } catch (err) { alert('❌ ' + err.message); } finally { setLoading(false); } };

  return (
    <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-2xl mx-auto px-4">
      <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Create Poll</h1><p className="text-gray-600 mt-2">Type question, add options, launch to class</p></div>
      <div className="bg-white rounded-xl shadow-lg p-6"><form onSubmit={handleCreateAndStart} className="space-y-6">
        <div><label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
          <textarea value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} placeholder="Type your question..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-28 text-lg" required disabled={loading} autoFocus /></div>

        {/* Image URLs — Class Diagram: Polls.imageUrls */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Images (optional)</label>
          <div className="flex space-x-2">
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm" disabled={loading} />
            <button type="button" onClick={addImage} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium" disabled={loading}>Add</button>
          </div>
          {formData.imageUrls.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{formData.imageUrls.map((url, i) => (
            <div key={i} className="relative group"><img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border" /><button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">×</button></div>
          ))}</div>}
        </div>

        {/* Options with multiple correct support */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Options * <span className="text-gray-400 font-normal">(tap letter to toggle correct — supports multiple)</span></label>
          <div className="space-y-3">{formData.options.map((opt, i) => (
            <div key={i} className="flex items-center space-x-3">
              <button type="button" onClick={() => toggleCorrect(i)} disabled={loading}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${formData.correctOptions.includes(i) ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'}`}>{String.fromCharCode(65 + i)}</button>
              <input type="text" value={opt} onChange={(e) => handleOptionChange(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.correctOptions.includes(i) ? 'border-green-300 bg-green-50' : 'border-gray-300'}`} required disabled={loading} />
              {formData.options.length > 2 && <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 text-xl shrink-0">×</button>}
            </div>
          ))}</div>
          {formData.options.length < 6 && <button type="button" onClick={addOption} className="mt-3 text-sm text-blue-600 font-medium" disabled={loading}>+ Add Option</button>}
          <p className="mt-2 text-xs text-green-600">✓ Correct: {formData.correctOptions.map(i => String.fromCharCode(65 + i)).join(', ')}</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2"><label className="text-sm font-medium text-gray-700">Timer</label>
            <div className="flex space-x-2">{[30, 60, 90, 120].map(t => (<button key={t} type="button" onClick={() => setFormData({ ...formData, timer: t })} className={`px-3 py-1 rounded-full text-xs font-medium ${formData.timer === t ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{t}s</button>))}</div></div>
          <input type="range" min="10" max="300" value={formData.timer} onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10s</span><span className="text-base font-semibold text-blue-600">{formData.timer}s</span><span>300s</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Course ID</label><input type="text" value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label><input type="text" value={formData.courseName} onChange={(e) => setFormData({ ...formData, courseName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" /></div>
        </div>

        <div className="pt-4 space-y-3">
          <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-lg font-semibold text-white text-lg ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{loading ? 'Launching...' : '🚀 Create & Go Live'}</button>
          <button type="button" onClick={handleSaveDraft} disabled={loading} className="w-full py-2.5 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50">📝 Save as Draft</button>
        </div>
      </form></div>
    </div></div>
  );
}