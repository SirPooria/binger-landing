"use client";

import React, { useEffect, useState } from 'react';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
import { supabase } from '@/lib/supabaseClient';
import { X, Loader2, CheckCircle, MessageSquare, Send, Heart, AlertTriangle, MonitorPlay, Download, Reply, Calendar } from 'lucide-react';

const EMOTIONS = [
  { id: 'wow', icon: '🤯', label: 'پشمام!' },
  { id: 'funny', icon: '😂', label: 'خندیدم' },
  { id: 'sad', icon: '😭', label: 'گریه کردم' },
  { id: 'love', icon: '😍', label: 'عاشقش شدم' },
  { id: 'angry', icon: '🤬', label: 'عصبی شدم' },
  { id: 'boring', icon: '😴', label: 'حوصلم سر رفت' },
];

const SOURCES = [
  { id: 'download', label: 'دانلود', icon: <Download size={14} /> },
  { id: 'filimo', label: 'فیلیمو', icon: <MonitorPlay size={14} /> },
  { id: 'namava', label: 'نماوا', icon: <MonitorPlay size={14} /> },
];

export default function EpisodeModal({ showId, seasonNum, episodeNum, onClose, onWatchedChange }: any) {
  const [loading, setLoading] = useState(true);
  const [ep, setEp] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isWatched, setIsWatched] = useState(false);
  const [isReleased, setIsReleased] = useState(true); // وضعیت پخش
  
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [mySource, setMySource] = useState<string | null>(null);

  const [stats, setStats] = useState({
    reactions: {} as any,
    totalReactions: 0,
    votes: {} as any,
    totalVotes: 0,
    sources: {} as any,
    totalSources: 0
  });
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<number[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const data = await getEpisodeDetails(showId, seasonNum, episodeNum);
      setEp(data);

      if (user && data) {
        // 1. چک کردن تاریخ پخش
        const released = new Date(data.air_date) <= new Date();
        setIsReleased(released);

        const { data: w } = await supabase.from('watched').select('*').eq('user_id', user.id).eq('episode_id', data.id);
        setIsWatched(w && w.length > 0 ? true : false);

        const p1 = supabase.from('episode_reactions').select('reaction').eq('user_id', user.id).eq('episode_id', data.id);
        const p2 = supabase.from('episode_votes').select('actor_id').eq('user_id', user.id).eq('episode_id', data.id);
        const p3 = supabase.from('episode_sources').select('source').eq('user_id', user.id).eq('episode_id', data.id);
        
        const allReactions = supabase.from('episode_reactions').select('reaction').eq('episode_id', data.id);
        const allVotes = supabase.from('episode_votes').select('actor_id').eq('episode_id', data.id);
        const allSources = supabase.from('episode_sources').select('source').eq('episode_id', data.id);

        const coms = supabase.from('comments').select('*, comment_likes(count)').eq('episode_id', data.id).order('created_at', { ascending: true });
        const myLikes = supabase.from('comment_likes').select('comment_id').eq('user_id', user.id);

        const [r1, r2, r3, ar, av, as, rc, ml] = await Promise.all([p1, p2, p3, allReactions, allVotes, allSources, coms, myLikes]);

        if (r1.data) setMyReactions(r1.data.map((r:any) => r.reaction));
        if (r2.data?.[0]) setMyVote(r2.data[0].actor_id);
        if (r3.data?.[0]) setMySource(r3.data[0].source);
        if (ml.data) setLikedComments(ml.data.map((l:any) => l.comment_id));

        if (ar.data) processStats(ar.data, 'reactions', 'reaction');
        if (av.data) processStats(av.data, 'votes', 'actor_id');
        if (as.data) processStats(as.data, 'sources', 'source');

        if (rc.data) {
            const formattedComments = rc.data.map((c: any) => ({
                ...c,
                likes_count: c.comment_likes?.[0]?.count || 0
            }));
            setComments(formattedComments);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const processStats = (data: any[], key: string, field: string) => {
    const counts: any = {};
    data.forEach(item => {
        const val = item[field];
        counts[val] = (counts[val] || 0) + 1;
    });
    setStats(prev => ({
        ...prev,
        [key]: counts,
        [`total${key.charAt(0).toUpperCase() + key.slice(1)}`]: data.length
    }));
  };

  const getPercent = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const getCountdown = (dateString: string) => {
      const diff = new Date(dateString).getTime() - new Date().getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days} روز و ${hours} ساعت مانده`;
  };

  const handleToggleWatched = async () => {
    if (!isReleased) return; // امنیت اضافه
    if (isWatched) {
      await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', ep.id);
      setIsWatched(false);
    } else {
      await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: ep.id }]);
      setIsWatched(true);
    }
    onWatchedChange(); 
  };

  // ... (handleReaction, handleVote, handleSource, toggleLike, sendComment مثل قبل) ...
  const handleReaction = async (reaction: string) => {
    const isSelected = myReactions.includes(reaction);
    let newReactions;
    let newStats = { ...stats.reactions };
    let newTotal = stats.totalReactions;
    if (isSelected) {
        newReactions = myReactions.filter(r => r !== reaction);
        await supabase.from('episode_reactions').delete().eq('user_id', user.id).eq('episode_id', ep.id).eq('reaction', reaction);
        newStats[reaction] = Math.max(0, (newStats[reaction] || 1) - 1);
        newTotal--;
    } else {
        newReactions = [...myReactions, reaction];
        await supabase.from('episode_reactions').insert({ user_id: user.id, episode_id: ep.id, reaction });
        newStats[reaction] = (newStats[reaction] || 0) + 1;
        newTotal++;
    }
    setMyReactions(newReactions);
    setStats(prev => ({ ...prev, reactions: newStats, totalReactions: newTotal }));
  };

  const handleVote = async (actor: any) => {
    const oldVote = myVote;
    setMyVote(actor.id);
    await supabase.from('episode_votes').upsert({ user_id: user.id, episode_id: ep.id, actor_id: actor.id, actor_name: actor.name, actor_image: actor.profile_path }, { onConflict: 'user_id, episode_id' });
    const newVotes = { ...stats.votes };
    if (oldVote) newVotes[oldVote] = Math.max(0, (newVotes[oldVote] || 1) - 1);
    newVotes[actor.id] = (newVotes[actor.id] || 0) + 1;
    const newTotal = oldVote ? stats.totalVotes : stats.totalVotes + 1;
    setStats(prev => ({ ...prev, votes: newVotes, totalVotes: newTotal }));
  };

  const handleSource = async (source: string) => {
    setMySource(source);
    await supabase.from('episode_sources').upsert({ user_id: user.id, episode_id: ep.id, source }, { onConflict: 'user_id, episode_id' });
    setStats(prev => ({ ...prev, totalSources: prev.totalSources + 1, sources: { ...prev.sources, [source]: (prev.sources[source] || 0) + 1 } }));
  };

  const toggleLike = async (commentId: number) => {
    const isLiked = likedComments.includes(commentId);
    let newLiked = [...likedComments];
    let newComments = [...comments];
    const updateLikeCount = (list: any[]) => {
        return list.map(c => {
            if (c.id === commentId) {
                return { ...c, likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1 };
            }
            return c;
        });
    }
    if (isLiked) {
        newLiked = newLiked.filter(id => id !== commentId);
        await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
    } else {
        newLiked.push(commentId);
        await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId });
    }
    setLikedComments(newLiked);
    setComments(updateLikeCount(comments));
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    const payload: any = { user_id: user.id, show_id: Number(showId), episode_id: ep.id, content: newComment, email: user.email };
    if (replyTo) payload.parent_id = replyTo.id;
    const { data } = await supabase.from('comments').insert([payload]).select();
    if (data) setComments([...comments, { ...data[0], likes_count: 0 }]);
    setNewComment("");
    setReplyTo(null);
    setCommentLoading(false);
  };

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"><Loader2 className="animate-spin text-[#ccff00]" size={48} /></div>;

  const episodeCast = [...(ep.guest_stars || []), ...(ep.credits?.cast || []).slice(0, 10)].sort((a, b) => {
      const votesA = stats.votes[a.id] || 0;
      const votesB = stats.votes[b.id] || 0;
      return votesB - votesA;
  });

  const rootComments = comments.filter(c => !c.parent_id).reverse();
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#111] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row relative">
        <button onClick={onClose} className="absolute top-4 left-4 z-50 bg-black/50 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer"><X size={20} className="text-white" /></button>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
            <div className="relative h-48 md:h-60">
                <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
                <div className="absolute bottom-4 right-4 text-right">
                    <div className="text-[#ccff00] text-sm font-bold mb-1">فصل {seasonNum} | قسمت {episodeNum}</div>
                    <h2 className="text-2xl font-black text-white ltr">{ep.name}</h2>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* منطق نمایش دکمه تیک یا روزشمار */}
                {isReleased ? (
                    <button 
                        onClick={handleToggleWatched}
                        className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all cursor-pointer ${
                            isWatched ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                        }`}
                    >
                        <CheckCircle size={24} fill={isWatched ? "black" : "none"} />
                        <span>{isWatched ? 'دیده شده' : 'این قسمت رو دیدی؟ تیک بزن'}</span>
                    </button>
                ) : (
                    <div className="w-full py-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col items-center justify-center gap-1 text-cyan-400">
                        <div className="flex items-center gap-2 font-black text-lg">
                            <Calendar size={20} />
                            <span>در انتظار پخش...</span>
                        </div>
                        <span className="text-xs opacity-80">{getCountdown(ep.air_date)}</span>
                    </div>
                )}

                <p className="text-gray-300 leading-relaxed text-sm text-justify">{ep.overview || "توضیحی نیست."}</p>

                {/* اگر پخش نشده، کلاً بخش تعامل رو مخفی کن */}
                {isReleased ? (
                    isWatched ? (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            {/* ... (کدهای ایموجی، سورس و بازیگر مثل قبل) ... */}
                            <div>
                                <h3 className="font-bold text-gray-400 mb-3 text-sm">چه حسی داشتی؟</h3>
                                <div className="flex justify-between gap-2 bg-white/5 p-3 rounded-2xl">
                                    {EMOTIONS.map((e) => {
                                        const percent = getPercent(stats.reactions[e.id] || 0, stats.totalReactions);
                                        const showPercent = myReactions.length > 0;
                                        const isSelected = myReactions.includes(e.id);
                                        return (
                                            <button key={e.id} onClick={() => handleReaction(e.id)} className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer relative ${isSelected ? 'bg-white/10 scale-105 border border-[#ccff00]/30' : 'opacity-70 hover:opacity-100'}`}>
                                                <span className="text-2xl">{e.icon}</span>
                                                {showPercent && <><div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden"><div className="bg-[#ccff00] h-full" style={{ width: `${percent}%` }}></div></div><span className="text-[9px] text-gray-400 mt-0.5">{percent}%</span></>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-400 mb-3 text-sm">از کجا دیدی؟</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {SOURCES.map((s) => {
                                        const percent = getPercent(stats.sources[s.id] || 0, stats.totalSources);
                                        return (
                                            <button key={s.id} onClick={() => handleSource(s.id)} className={`relative flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer overflow-hidden ${mySource === s.id ? 'border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}>
                                                <div className="absolute left-0 top-0 bottom-0 bg-cyan-500/10 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                <div className="flex items-center gap-2 z-10">{s.icon} {s.label}</div>
                                                <span className="z-10 text-[10px] opacity-70">{percent}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-400 mb-3 text-sm">ستاره این قسمت</h3>
                                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                    {episodeCast.map((actor: any, index) => {
                                        const percent = getPercent(stats.votes[actor.id] || 0, stats.totalVotes);
                                        return (
                                            <div key={actor.id} onClick={() => handleVote(actor)} className={`min-w-[80px] flex flex-col items-center cursor-pointer group`}>
                                                <div className="relative">
                                                    {index === 0 && stats.totalVotes > 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl z-10">👑</div>}
                                                    <div className={`w-16 h-16 rounded-full overflow-hidden border-2 mb-2 transition-all relative ${myVote === actor.id ? 'border-[#ccff00]' : 'border-white/10'}`}>
                                                        <img src={getImageUrl(actor.profile_path)} className="w-full h-full object-cover" />
                                                        {stats.totalVotes > 0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center font-bold text-[#ccff00] text-sm">{percent}%</div>}
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] text-center font-bold truncate w-full ${myVote === actor.id ? 'text-[#ccff00]' : 'text-gray-400'}`}>{actor.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3 text-yellow-500">
                            <AlertTriangle />
                            <span className="text-xs font-bold">برای رای دادن و دیدن آمار، اول تیک بزن!</span>
                        </div>
                    )
                ) : (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-3 text-cyan-400">
                        <Calendar size={20} />
                        <span className="text-xs font-bold">رای‌گیری و آمار بعد از پخش فعال می‌شود.</span>
                    </div>
                )}
            </div>
        </div>

        <div className="w-full md:w-1/3 bg-[#050505] border-r border-white/10 flex flex-col h-[60vh] md:h-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a]">
                <h3 className="font-bold flex items-center gap-2"><MessageSquare size={18} className="text-[#ccff00]" /> نظرات</h3>
                <span className="text-xs text-gray-500">{comments.length} نظر</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
                {/* پرده اسپویل (فقط اگر پخش شده باشد و ندیده باشد) */}
                {isReleased && !isWatched && (
                     <div className="absolute inset-0 z-20 bg-[#050505]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2"><AlertTriangle size={32} /></div>
                        <h4 className="text-xl font-black text-white">خطر اسپویل! ⛔</h4>
                        <p className="text-gray-400 text-sm">اول تیک بزن، بعد نظرات رو بخون.</p>
                     </div>
                )}

                <div className="space-y-4">
                    {rootComments.map((c) => {
                        const isLiked = likedComments.includes(c.id);
                        const replies = getReplies(c.id);
                        return (
                            <div key={c.id}>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-gray-400 ltr">{c.email?.split('@')[0]}</span><span className="text-[8px] text-gray-600">{new Date(c.created_at).toLocaleDateString('fa-IR')}</span></div>
                                    <p className="text-xs text-gray-200 leading-relaxed mb-2">{c.content}</p>
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => setReplyTo(c)} className="text-[10px] text-gray-500 hover:text-[#ccff00] flex items-center gap-1 cursor-pointer"><Reply size={12} /> پاسخ</button>
                                        <button onClick={() => toggleLike(c.id)} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all cursor-pointer ${isLiked ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white'}`}><Heart size={12} fill={isLiked ? "currentColor" : "none"} /><span>{c.likes_count || 0}</span></button>
                                    </div>
                                </div>
                                {replies.length > 0 && <div className="mr-4 mt-2 space-y-2 border-r-2 border-white/10 pr-3">{replies.map((r: any) => { const isRLiked = likedComments.includes(r.id); return (<div key={r.id} className="bg-white/5 p-2 rounded-lg"><div className="flex justify-between items-center mb-1"><span className="text-[9px] font-bold text-gray-500 ltr">{r.email?.split('@')[0]}</span></div><p className="text-[11px] text-gray-300 mb-1">{r.content}</p><div className="flex justify-end"><button onClick={() => toggleLike(r.id)} className={`flex items-center gap-1 text-[9px] transition-all cursor-pointer ${isRLiked ? 'text-red-500' : 'text-gray-600'}`}><Heart size={10} fill={isRLiked ? "currentColor" : "none"} /><span>{r.likes_count || 0}</span></button></div></div>) })}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="p-3 bg-[#0a0a0a] border-t border-white/10 relative z-30">
                {replyTo && <div className="flex justify-between items-center bg-[#ccff00]/10 px-3 py-1 rounded-t-lg text-[10px] text-[#ccff00] mb-1"><span>پاسخ به: {replyTo.email?.split('@')[0]}</span><button onClick={() => setReplyTo(null)} className="hover:text-white"><X size={12} /></button></div>}
                <div className="relative">
                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={isReleased ? (isWatched ? "نظرت چیه؟" : "اول ببین...") : "هایپ قبل پخش..."} disabled={isReleased && !isWatched} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-[#ccff00] disabled:opacity-50" onKeyDown={(e) => e.key === 'Enter' && sendComment()} />
                    <button onClick={sendComment} disabled={commentLoading || !newComment.trim() || (isReleased && !isWatched)} className="absolute left-1.5 top-1.5 p-1.5 bg-[#ccff00] text-black rounded-lg hover:bg-[#b3e600] disabled:opacity-50 transition-all cursor-pointer"><Send size={14} /></button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}