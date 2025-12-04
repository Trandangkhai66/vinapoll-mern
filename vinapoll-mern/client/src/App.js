import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  BarChart3, Share2, Heart, Plus, X, 
  CheckCircle2, Image as ImageIcon, FileText, 
  ArrowLeft, Link as LinkIcon, AlertCircle, Copy 
} from 'lucide-react';

// Use REACT_APP_API_URL in production (Netlify) and fall back to localhost for dev
const API_URL = 'https://vinapoll-mern.onrender.com';
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
  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md animate-pulse">
    <div className="h-7 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg w-3/4 mb-6"></div>
    <div className="space-y-3"><div className="h-11 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg w-full"></div><div className="h-11 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg w-full"></div></div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 space-y-5 border border-slate-100">
        <div className="flex justify-between items-center"><h3 className="font-bold text-lg flex gap-2 text-slate-800"><Share2 size={18}/> Chia sẻ</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
        <div className="flex gap-2"><div className="flex-1 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 p-3 text-sm truncate rounded-lg font-mono text-slate-600">{shareUrl}</div><button onClick={handleCopy} className="bg-gradient-to-br from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:shadow-lg transition-shadow font-medium">{copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>}</button></div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={()=>openSocial('fb')} className="border border-slate-200 p-3 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-sm font-medium transition-all text-slate-700">Facebook</button>
          <button onClick={()=>openSocial('tw')} className="border border-slate-200 p-3 rounded-lg hover:bg-sky-50 hover:border-sky-300 text-sm font-medium transition-all text-slate-700">Twitter</button>
          <button onClick={()=>openSocial('in')} className="border border-slate-200 p-3 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-sm font-medium transition-all text-slate-700">LinkedIn</button>
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
    <div className={`bg-white border border-slate-200 shadow-md flex flex-col h-full transition-all hover:shadow-xl ${isDetail ? 'rounded-3xl' : 'rounded-2xl hover:border-purple-300'}`}>
      <div className="p-7 flex-1">
        <div className="flex justify-between items-start mb-5 gap-4">
          <h3 className={`font-bold text-slate-900 ${!isDetail ? 'cursor-pointer hover:text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text transition-all' : 'text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'}`} onClick={() => !isDetail && onViewDetail(poll._id)}>
            {poll.question}
          </h3>
          {hasVoted && <span className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-bold flex gap-1.5 items-center shrink-0"><CheckCircle2 size={12} /> Đã bầu</span>}
        </div>
        <div className="space-y-3">
          {poll.options.map((opt) => {
            const percentage = poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100);
            return hasVoted ? (
              <div key={opt._id} className="relative group animate-in fade-in">
                <div className="flex justify-between text-sm mb-2 text-slate-700 font-semibold"><span className="text-slate-800">{opt.text}</span><span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">{percentage}%</span></div>
                <div className="w-full bg-gradient-to-r from-slate-100 to-slate-50 rounded-full h-3 overflow-hidden border border-slate-200"><div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-full transition-all duration-1000" style={{ width: `${percentage}%` }} /></div>
                <div className="text-xs text-slate-500 mt-1.5 text-right font-medium">{opt.votes} phiếu</div>
              </div>
            ) : (
              <button key={opt._id} onClick={() => onVote(poll._id, opt._id)} className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 to-pink-50 transition-all flex justify-between group shadow-sm hover:shadow-md">
                <span className="font-medium text-slate-800 group-hover:text-purple-700">{opt.text}</span>
                <div className="text-purple-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
        <button onClick={() => onLike(poll._id)} className={`flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg transition-all ${isLiked ? 'text-pink-600 bg-pink-100' : 'text-slate-600 hover:text-pink-600 hover:bg-pink-100'}`}>
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} /> {poll.likes}
        </button>
        <div className="flex items-center gap-2">
          {!isDetail && <button onClick={() => onViewDetail(poll._id)} className="p-2.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-100 transition-all"><LinkIcon size={18}/></button>}
          <button onClick={() => setShowShare(true)} className="p-2.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-100 transition-all"><Share2 size={18}/></button>
          {hasVoted && (
            <div className="flex gap-1 border-l border-slate-200 pl-3 ml-1">
              <button onClick={() => downloadCSV(poll)} className="p-2.5 text-slate-500 hover:text-green-600 rounded-lg hover:bg-green-100 transition-all"><FileText size={18}/></button>
              <button onClick={() => downloadChartAsImage(poll)} className="p-2.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-100 transition-all"><ImageIcon size={18}/></button>
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
  const [showShare, setShowShare] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 font-sans text-slate-900 pb-20">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 transition-all shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.hash = ''}>
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-xl text-white shadow-lg"><BarChart3 size={24} /></div>
            <span className="text-2xl font-bold tracking-tight">Vina<span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Poll</span></span>
          </div>
          {view === 'HOME' && <button onClick={() => setIsModalOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-shadow"><Plus size={18}/> Tạo Thăm Dò</button>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {view === 'HOME' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-12">
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-900 via-slate-900 to-pink-900 bg-clip-text text-transparent mb-3">Khám phá Thăm Dò</h1>
              <p className="text-lg text-slate-600">Tham gia các cuộc thăm dò ý kiến thời gian thực, chia sẻ ý kiến của bạn</p>
            </div>
            {loading ? (
              <div className="space-y-4">
                <SkeletonCard/><SkeletonCard/><SkeletonCard/>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.length > 0 ? (
                  polls.map(poll => {
                    const hasVoted = poll.votedBy.includes(userId);
                    return (
                      <div key={poll._id} className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 hover:shadow-xl transition-all">
                        <div className="flex flex-col lg:flex-row gap-8">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-5">
                              <h3 className="text-2xl font-bold text-slate-900 cursor-pointer hover:text-transparent bg-gradient-to-r from-purple-600 to-pink-600 hover:bg-clip-text transition-all" onClick={() => window.location.hash = `poll/${poll._id}`}>
                                {poll.question}
                              </h3>
                              {hasVoted && <span className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-bold flex gap-1.5 items-center whitespace-nowrap"><CheckCircle2 size={12} /> Đã bầu</span>}
                            </div>
                            <div className="space-y-3">
                              {poll.options.map(opt => {
                                const percentage = poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100);
                                return hasVoted ? (
                                  <div key={opt._id} className="relative">
                                    <div className="flex justify-between text-sm mb-2">
                                      <span className="font-semibold text-slate-800">{opt.text}</span>
                                      <span className="font-bold text-purple-600">{percentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200"><div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-full transition-all duration-1000" style={{ width: `${percentage}%` }} /></div>
                                    <div className="text-xs text-slate-500 mt-1 text-right">{opt.votes} phiếu</div>
                                  </div>
                                ) : (
                                  <button key={opt._id} onClick={() => handleVote(poll._id, opt._id)} className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all font-medium text-slate-800 group flex justify-between items-center">
                                    <span>{opt.text}</span>
                                    <span className="text-purple-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-between lg:border-l lg:border-slate-200 lg:pl-8 min-w-fit">
                            <div className="text-center mb-6 lg:mb-0">
                              <div className="text-5xl font-bold text-purple-600 mb-2">{poll.totalVotes}</div>
                              <div className="text-sm text-slate-500 font-medium">Tổng phiếu</div>
                            </div>
                            <div className="flex gap-2 w-full lg:flex-col">
                              <button onClick={() => handleLike(poll._id)} className={`flex-1 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg transition-all ${poll.likedBy.includes(userId) ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-600 hover:bg-pink-100 hover:text-pink-600'}`}>
                                <Heart size={20} fill={poll.likedBy.includes(userId) ? "currentColor" : "none"} />
                              </button>
                              <button onClick={() => window.location.hash = `poll/${poll._id}`} className="flex-1 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-600 transition-all"><LinkIcon size={20}/></button>
                              <button onClick={() => setShowShare(true)} className="flex-1 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition-all"><Share2 size={20}/></button>
                              {hasVoted && (
                                <>
                                  <button onClick={() => downloadCSV(poll)} className="flex-1 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 transition-all"><FileText size={20}/></button>
                                  <button onClick={() => downloadChartAsImage(poll)} className="flex-1 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-all"><ImageIcon size={20}/></button>
                                </>
                              )}
                            </div>
                            <div className="text-sm text-slate-400 mt-6 lg:mt-4 text-center">{poll.likes} ❤️</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border-2 border-slate-100 shadow-md">
                    <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Chưa có thăm dò nào, hãy tạo một thăm dò mới!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-8 fade-in">
            <button onClick={() => window.location.hash = ''} className="mb-8 flex items-center gap-2 text-slate-600 hover:text-purple-600 font-semibold group transition-colors"><ArrowLeft size={20} className="group-hover:-translate-x-1 transition"/> Quay lại danh sách</button>
            {currentPoll ? <PollCard poll={currentPoll} userId={userId} onVote={handleVote} onLike={handleLike} isDetail={true} /> : 
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-slate-100 shadow-md"><AlertCircle className="mx-auto text-red-500 mb-4" size={32}/>Không tìm thấy Poll</div>}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in zoom-in-95">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50"><h3 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Tạo thăm dò mới</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition"><X size={20}/></button></div>
            <form onSubmit={handleCreate} className="p-7 space-y-6">
              <div><label className="block text-sm font-bold text-slate-800 mb-2.5">Câu hỏi</label><input autoFocus value={newQuestion} onChange={e => setNewQuestion(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gradient-to-r from-slate-50 to-white" placeholder="Ví dụ: Ăn trưa món gì?" /></div>
              <div><label className="block text-sm font-bold text-slate-800 mb-2.5">Lựa chọn</label>
                <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                  {newOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2.5"><input value={opt} onChange={e => {const n=[...newOptions];n[i]=e.target.value;setNewOptions(n)}} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-r from-slate-50 to-white" placeholder={`Lựa chọn ${i+1}`} />{newOptions.length > 2 && <button type="button" onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"><X size={20}/></button>}</div>
                  ))}
                </div>
                {newOptions.length < 5 && <button type="button" onClick={() => setNewOptions([...newOptions, ''])} className="mt-4 text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold flex items-center gap-1.5 hover:opacity-80 transition"><Plus size={18}/> Thêm lựa chọn</button>}
              </div>
              <div className="flex justify-end pt-4 gap-3 border-t border-slate-100 mt-6"><button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-700 font-semibold hover:bg-slate-100 rounded-lg transition">Hủy</button><button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg font-bold transition-shadow">Đăng Poll</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
