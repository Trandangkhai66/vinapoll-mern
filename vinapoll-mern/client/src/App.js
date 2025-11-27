import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  BarChart3, Share2, Heart, Plus, X, 
  CheckCircle2, Image as ImageIcon, FileText, 
  ArrowLeft, Link as LinkIcon, AlertCircle, Copy 
} from 'lucide-react';

// Use REACT_APP_API_URL in production (Netlify) and fall back to localhost for dev
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

// --- UTILITIES (Download Logic) ---
const downloadCSV = (poll) => {
  const csvHeader = "Option,Votes,Percentage\n";
  const csvRows = poll.options.map(opt => {
    const percentage = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes * 100).toFixed(2) : 0;
    return `"${opt.text}",${opt.votes},${percentage}%`;
  }).join("\n");
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURI(csvHeader + csvRows);
  link.download = `vinapoll_data_${poll._id}.csv`;
  link.click();
};

const downloadChartAsImage = (poll) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = 800;
  const height = 120 + (poll.options.length * 80) + 60;
  canvas.width = width; canvas.height = height;
  
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#4f46e5'; ctx.fillRect(0, 0, width, 12);
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 26px Arial'; ctx.fillText(poll.question, 40, 65);
  ctx.fillStyle = '#64748b'; ctx.font = '16px Arial'; ctx.fillText(`Tổng số phiếu: ${poll.totalVotes}`, 40, 95);

  poll.options.forEach((opt, index) => {
    const y = 120 + index * 80;
    const percentage = poll.totalVotes === 0 ? 0 : (opt.votes / poll.totalVotes);
    const barWidth = (width - 250) * percentage;
    ctx.fillStyle = '#334155'; ctx.font = 'bold 16px Arial'; ctx.fillText(opt.text, 40, y + 25);
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(40, y + 35, width - 80, 24);
    ctx.fillStyle = '#4f46e5'; ctx.fillRect(40, y + 35, Math.max(barWidth, 6), 24);
    ctx.fillStyle = '#475569'; ctx.textAlign = 'right'; ctx.fillText(`${opt.votes} (${(percentage * 100).toFixed(1)}%)`, width - 40, y + 52);
    ctx.textAlign = 'left';
  });
  
  const link = document.createElement('a');
  link.download = `vinapoll_chart_${poll._id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// --- COMPONENTS ---
const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-3/4 mb-6"></div>
    <div className="space-y-3"><div className="h-10 bg-slate-100 rounded w-full"></div><div className="h-10 bg-slate-100 rounded w-full"></div></div>
  </div>
);

const ShareModal = ({ poll, onClose }) => {
  const shareUrl = `${window.location.origin}${window.location.pathname}#poll/${poll._id}`;
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const openSocial = (platform) => {
    let url = '';
    if (platform === 'fb') url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (platform === 'tw') url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(poll.question)}&url=${encodeURIComponent(shareUrl)}`;
    if (platform === 'in') url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=450');
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-bold flex gap-2"><Share2 size={18}/> Chia sẻ</h3><button onClick={onClose}><X size={20}/></button></div>
        <div className="flex gap-2"><div className="flex-1 bg-slate-100 border p-2 text-sm truncate rounded">{shareUrl}</div><button onClick={handleCopy} className="bg-slate-800 text-white px-3 rounded flex items-center gap-1">{copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>}</button></div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={()=>openSocial('fb')} className="border p-2 rounded hover:bg-blue-50 text-sm font-medium">Facebook</button>
          <button onClick={()=>openSocial('tw')} className="border p-2 rounded hover:bg-sky-50 text-sm font-medium">Twitter</button>
          <button onClick={()=>openSocial('in')} className="border p-2 rounded hover:bg-blue-50 text-sm font-medium">LinkedIn</button>
        </div>
      </div>
    </div>
  );
};

const PollCard = ({ poll, userId, onVote, onLike, onViewDetail, isDetail = false }) => {
  const hasVoted = poll.votedBy.includes(userId);
  const isLiked = poll.likedBy.includes(userId);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className={`bg-white border-slate-200 shadow-sm flex flex-col h-full ${isDetail ? 'rounded-2xl border shadow-lg' : 'rounded-xl border hover:shadow-md transition-shadow'}`}>
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4 gap-4">
          <h3 className={`font-bold text-slate-800 ${!isDetail ? 'cursor-pointer hover:text-indigo-600' : 'text-2xl'}`} onClick={() => !isDetail && onViewDetail(poll._id)}>
            {poll.question}
          </h3>
          {hasVoted && <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold flex gap-1 items-center shrink-0"><CheckCircle2 size={12} /> Đã bầu</span>}
        </div>
        <div className="space-y-3">
          {poll.options.map((opt) => {
            const percentage = poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100);
            return hasVoted ? (
              <div key={opt._id} className="relative group animate-in fade-in">
                <div className="flex justify-between text-sm mb-1 text-slate-600 font-medium"><span>{opt.text}</span><span className="font-bold">{percentage}%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${percentage}%` }} /></div>
                <div className="text-xs text-slate-400 mt-1 text-right">{opt.votes} phiếu</div>
              </div>
            ) : (
              <button key={opt._id} onClick={() => onVote(poll._id, opt._id)} className="w-full text-left p-3.5 rounded-lg border hover:border-indigo-500 hover:bg-indigo-50 transition-all flex justify-between group">
                <span className="font-medium text-slate-700">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between rounded-b-xl">
        <button onClick={() => onLike(poll._id)} className={`flex items-center gap-1.5 text-sm font-bold px-2 py-1 rounded transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}>
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} /> {poll.likes}
        </button>
        <div className="flex items-center gap-2">
          {!isDetail && <button onClick={() => onViewDetail(poll._id)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"><LinkIcon size={18}/></button>}
          <button onClick={() => setShowShare(true)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"><Share2 size={18}/></button>
          {hasVoted && (
            <div className="flex gap-1 border-l pl-2 ml-1">
              <button onClick={() => downloadCSV(poll)} className="p-2 text-slate-400 hover:text-green-600 rounded-full"><FileText size={18}/></button>
              <button onClick={() => downloadChartAsImage(poll)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full"><ImageIcon size={18}/></button>
            </div>
          )}
        </div>
      </div>
      {showShare && <ShareModal poll={poll} onClose={() => setShowShare(false)} />}
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [userId, setUserId] = useState('');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('HOME');
  const [currentPollId, setCurrentPollId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);

  useEffect(() => {
    let storedId = localStorage.getItem('poll_user_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('poll_user_id', storedId);
    }
    setUserId(storedId);
  }, []);

  useEffect(() => {
    axios.get(`${API_URL}/api/polls`).then(res => {
      setPolls(res.data);
      setLoading(false);
    });
    socket.on('poll_created', (newPoll) => setPolls(prev => [newPoll, ...prev]));
    socket.on('poll_updated', (updatedPoll) => setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p)));
    return () => { socket.off('poll_created'); socket.off('poll_updated'); };
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#poll/')) {
        setCurrentPollId(hash.replace('#poll/', ''));
        setView('DETAIL');
      } else {
        setView('HOME');
        setCurrentPollId(null);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const options = newOptions.filter(o => o.trim()).map(text => ({ text }));
    await axios.post(`${API_URL}/api/polls`, { question: newQuestion, options, createdBy: userId });
    setIsModalOpen(false); setNewQuestion(''); setNewOptions(['', '']);
  };

  const handleVote = (pollId, optionId) => axios.post(`${API_URL}/api/polls/${pollId}/vote`, { userId, optionId });
  const handleLike = (pollId) => axios.post(`${API_URL}/api/polls/${pollId}/like`, { userId });
  const currentPoll = polls.find(p => p._id === currentPollId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.hash = ''}>
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><BarChart3 size={24} /></div>
            <span className="text-xl font-bold">Vina<span className="text-indigo-600">Poll</span></span>
          </div>
          {view === 'HOME' && <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plus size={18}/> Tạo Thăm Dò</button>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'HOME' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-8"><h1 className="text-3xl font-extrabold text-slate-900 mb-2">Khám phá & Bình chọn</h1><p className="text-slate-500">Tham gia các cuộc thăm dò ý kiến thời gian thực.</p></div>
            {loading ? <div className="grid md:grid-cols-2 gap-6"><SkeletonCard/><SkeletonCard/></div> : (
              <div className="grid md:grid-cols-2 gap-6">
                {polls.map(poll => <PollCard key={poll._id} poll={poll} userId={userId} onVote={handleVote} onLike={handleLike} onViewDetail={(id) => window.location.hash = `poll/${id}`} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-8 fade-in">
            <button onClick={() => window.location.hash = ''} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium group"><ArrowLeft size={20} className="group-hover:-translate-x-1 transition"/> Quay lại danh sách</button>
            {currentPoll ? <PollCard poll={currentPoll} userId={userId} onVote={handleVote} onLike={handleLike} isDetail={true} /> : 
            <div className="text-center py-20 bg-white rounded-xl border"><AlertCircle className="mx-auto text-red-500 mb-4" size={32}/>Không tìm thấy Poll</div>}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold text-lg text-slate-800">Tạo thăm dò mới</h3><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-red-500"/></button></div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div><label className="block text-sm font-semibold mb-1.5">Câu hỏi</label><input autoFocus value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ví dụ: Ăn trưa món gì?" /></div>
              <div><label className="block text-sm font-semibold mb-1.5">Lựa chọn</label>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2"><input value={opt} onChange={e => {const n=[...newOptions];n[i]=e.target.value;setNewOptions(n)}} className="flex-1 px-4 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500" placeholder={`Lựa chọn ${i+1}`} />{newOptions.length > 2 && <button type="button" onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={20}/></button>}</div>
                  ))}
                </div>
                {newOptions.length < 5 && <button type="button" onClick={() => setNewOptions([...newOptions, ''])} className="mt-3 text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"><Plus size={18}/> Thêm lựa chọn</button>}
              </div>
              <div className="flex justify-end pt-3 gap-3 border-t mt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Đăng Poll</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
