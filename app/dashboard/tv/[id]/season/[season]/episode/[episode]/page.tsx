"use client";

import React, { useEffect, useState, useRef } from 'react';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
// 👇 تغییر ۱: استفاده از کلاینت جدید
import { createClient } from '@/lib/supabase';
import html2canvas from 'html2canvas'; 
import { 
  X, Loader2, Check, MessageSquare, Send, Heart, 
  AlertTriangle, Reply, Calendar, Share2, Lock, 
  Flame, ChevronLeft, Award, ThumbsUp, ThumbsDown, Minus, Instagram 
} from 'lucide-react';

// --- تنظیمات و ثابت‌ها ---
const EMOTIONS = [
  { id: 'wow', icon: '🤯', label: 'پشمام!' },
  { id: 'funny', icon: '😂', label: 'خندیدم' },
  { id: 'sad', icon: '😭', label: 'گریه کردم' },
  { id: 'love', icon: '😍', label: 'عاشقش شدم' },
  { id: 'angry', icon: '🤬', label: 'عصبی شدم' },
  { id: 'boring', icon: '😴', label: 'حوصلم سر رفت' },
];

const BADGES = [
  { label: 'خوره‌فیلم', color: 'bg-purple-500', icon: <Award size={10} /> },
  { label: 'منتقد', color: 'bg-blue-500', icon: <MessageSquare size={10} /> },
  { label: 'فن‌تعصبی', color: 'bg-red-500', icon: <Heart size={10} /> },
  { label: 'بینجر', color: 'bg-[#ccff00] text-black', icon: <Flame size={10} /> },
];

const isEnglishText = (text: string) => {
    if (!text) return true;
    const englishChars = text.replace(/[^a-zA-Z]/g, "").length;
    return englishChars > text.length / 2;
};

const getUserBadge = (email: string) => {
    if (!email) return BADGES[0];
    const hash = email.length % BADGES.length;
    return BADGES[hash];
};

export default function EpisodeModal({ showId, seasonNum, episodeNum, onClose, onWatchedChange }: any) {
  // 👇 تغییر ۲: ساخت نمونه کلاینت سوپابیس با بای‌پس کردن تایپ‌اسکریپت
  const supabase = createClient() as any;
  
  // --- States ---
  const [currentEpNum, setCurrentEpNum] = useState(episodeNum);
  
  const [loading, setLoading] = useState(true);
  const [ep, setEp] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // User Actions
  const [isWatched, setIsWatched] = useState(false);
  const [isReleased, setIsReleased] = useState(true);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [hotTakeVote, setHotTakeVote] = useState<'fire' | 'mid' | 'trash' | null>(null); 

  // Stats
  const [stats, setStats] = useState({ reactions: {} as any, totalReactions: 0, votes: {} as any, totalVotes: 0 });
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [likedComments, setLikedComments] = useState<number[]>([]);
  
  // Share Logic
  const [storyData, setStoryData] = useState<any>(null); 
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null); 

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Main Logic ---
  useEffect(() => {
    let channel: any;

    const init = async () => {
      setLoading(true); 
      setComments([]); 
      setMyReactions([]);
      setMyVote(null);
      setStats({ reactions: {}, totalReactions: 0, votes: {}, totalVotes: 0 });
      setLikedComments([]);
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 1. Fetch TMDB Data
      const data = await getEpisodeDetails(showId, seasonNum, currentEpNum);
      if (!data || !data.id) {
          console.error("Failed to load episode data");
          setLoading(false);
          return;
      }
      setEp(data);

      if (user) {
        const released = new Date(data.air_date) <= new Date();
        setIsReleased(released);

        // 2. Parallel DB Fetch (Excluding Comments to handle errors better)
        const [wRes, r1, r2, ar, av, ml] = await Promise.all([
             supabase.from('watched').select('*').eq('user_id', user.id).eq('episode_id', data.id),
             supabase.from('episode_reactions').select('reaction').eq('user_id', user.id).eq('episode_id', data.id),
             supabase.from('episode_votes').select('actor_id').eq('user_id', user.id).eq('episode_id', data.id),
             supabase.from('episode_reactions').select('reaction').eq('episode_id', data.id),
             supabase.from('episode_votes').select('actor_id').eq('episode_id', data.id),
             supabase.from('comment_likes').select('comment_id').eq('user_id', user.id)
        ]);

        if (wRes.data && wRes.data.length > 0) setIsWatched(true);
        if (r1.data) setMyReactions(r1.data.map((r:any) => r.reaction));
        if (r2.data?.[0]) setMyVote(r2.data[0].actor_id);
        if (ml.data) setLikedComments(ml.data.map((l:any) => l.comment_id));

        if (ar.data) processStats(ar.data, 'reactions', 'reaction');
        if (av.data) processStats(av.data, 'votes', 'actor_id');

        // --- 3. SMART COMMENT FETCH (The Fix) ---
        // Try fetching with likes first
        const { data: commentsWithLikes, error: commentsError } = await supabase
            .from('comments')
            .select('*, comment_likes(count)')
            .eq('episode_id', data.id)
            .order('created_at', { ascending: true });

        if (!commentsError && commentsWithLikes) {
            const formattedComments = commentsWithLikes.map((c: any) => ({
                ...c,
                likes_count: c.comment_likes?.[0]?.count || 0
            }));
            setComments(formattedComments);
        } else {
            console.warn("Complex comment fetch failed, trying simple fetch...", commentsError);
            // Fallback: Fetch simple comments if join fails
            const { data: simpleComments } = await supabase
                .from('comments')
                .select('*')
                .eq('episode_id', data.id)
                .order('created_at', { ascending: true });
            
            if (simpleComments) {
                setComments(simpleComments.map((c: any) => ({ ...c, likes_count: 0 })));
            }
        }

        // 4. Realtime Listener
        channel = supabase.channel(`comments-ep-${data.id}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'comments', filter: `episode_id=eq.${data.id}` },
            (payload: any) => {
                if (payload.new.user_id !== user.id) {
                    const newCm = { ...payload.new, likes_count: 0, email: 'کاربر آنلاین' }; 
                    setComments((prev: any[]) => [...prev, newCm]);
                    if (scrollRef.current) setTimeout(() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight, 100);
                }
            }
        )
        .subscribe();
      }
      setLoading(false);
    };
    init();

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [currentEpNum]);

  const processStats = (data: any[], key: string, field: string) => {
    const counts: any = {};
    data.forEach(item => {
        const val = item[field];
        counts[val] = (counts[val] || 0) + 1;
    });
    setStats((prev: any) => ({
        ...prev,
        [key]: counts,
        [`total${key.charAt(0).toUpperCase() + key.slice(1)}`]: data.length
    }));
  };

  const getPercent = (count: number, total: number) => total === 0 ? 0 : Math.round((count / total) * 100);

  // --- Handlers ---
  const handleToggleWatched = async () => {
    if (!isReleased) return;
    const newState = !isWatched;
    setIsWatched(newState);
    
    if (newState) {
      await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: ep.id }]);
    } else {
      await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', ep.id);
    }
    if (onWatchedChange) onWatchedChange(); 
  };

  const handleReaction = async (reaction: string) => {
    const isSelected = myReactions.includes(reaction);
    let newReactions;
    let newStats = { ...stats.reactions };
    let newTotal = stats.totalReactions;
    
    if (isSelected) {
        newReactions = myReactions.filter(r => r !== reaction);
        newStats[reaction] = Math.max(0, (newStats[reaction] || 1) - 1);
        newTotal--;
        setMyReactions(newReactions);
        await supabase.from('episode_reactions').delete().eq('user_id', user.id).eq('episode_id', ep.id).eq('reaction', reaction);
    } else {
        newReactions = [...myReactions, reaction];
        newStats[reaction] = (newStats[reaction] || 0) + 1;
        newTotal++;
        setMyReactions(newReactions);
        await supabase.from('episode_reactions').insert({ user_id: user.id, episode_id: ep.id, reaction });
    }
    setStats((prev: any) => ({ ...prev, reactions: newStats, totalReactions: newTotal }));
  };

  const handleVote = async (actor: any) => {
    const oldVote = myVote;
    setMyVote(actor.id); 
    const newVotes = { ...stats.votes };
    if (oldVote) newVotes[oldVote] = Math.max(0, (newVotes[oldVote] || 1) - 1);
    newVotes[actor.id] = (newVotes[actor.id] || 0) + 1;
    setStats((prev: any) => ({ ...prev, votes: newVotes, totalVotes: oldVote ? stats.totalVotes : stats.totalVotes + 1 }));
    await supabase.from('episode_votes').upsert({ user_id: user.id, episode_id: ep.id, actor_id: actor.id, actor_name: actor.name, actor_image: actor.profile_path }, { onConflict: 'user_id, episode_id' });
  };

  const toggleLike = async (commentId: number) => {
    const isLiked = likedComments.includes(commentId);
    let newLiked = isLiked ? likedComments.filter(id => id !== commentId) : [...likedComments, commentId];
    setLikedComments(newLiked);
    setComments((prev: any[]) => prev.map(c => c.id === commentId ? { ...c, likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1 } : c));
    if (isLiked) await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
    else await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId });
  };

  const sendComment = async () => {
    if (!newComment.trim() || !ep || !ep.id) return;
    
    const payload: any = { 
        user_id: user.id, 
        show_id: Number(showId), 
        episode_id: Number(ep.id), 
        content: newComment, 
        email: user.email 
    };
    if (replyTo) payload.parent_id = replyTo.id;
    
    // --- ثبت در دیتابیس ---
    const { data, error } = await supabase.from('comments').insert([payload]).select();
    
    if (error) {
        console.error("Save Error:", error);
    } else if (data) {
        setComments((prev: any[]) => [...prev, { ...data[0], likes_count: 0 }]);
        if (scrollRef.current) setTimeout(() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight, 100);
        setNewComment("");
        setReplyTo(null);
    }
  };

  // --- Share Engine ---
  const handleShare = async (type: 'comment' | 'episode', data: any = null) => {
      setIsGeneratingStory(true);
      setStoryData({ type, data });

      setTimeout(async () => {
          if (storyRef.current) {
              try {
                  const canvas = await html2canvas(storyRef.current, { 
                      useCORS: true, 
                      backgroundColor: '#000',
                      scale: 2 
                  });
                  const image = canvas.toDataURL("image/png");
                  const link = document.createElement('a');
                  link.href = image;
                  link.download = `binger-story-${Date.now()}.png`;
                  link.click();
              } catch (e) {
                  console.error("Story gen failed:", e);
                  alert("مشکلی در ساخت استوری پیش آمد.");
              }
              setIsGeneratingStory(false);
              setStoryData(null);
          }
      }, 500);
  };

  const handleNextEpisode = () => {
      setCurrentEpNum((prev: number) => prev + 1);
  };

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"><Loader2 className="animate-spin text-[#ccff00]" size={48} /></div>;

  const episodeCast = [...(ep.guest_stars || []), ...(ep.credits?.cast || []).slice(0, 10)].sort((a, b) => (stats.votes[b.id] || 0) - (stats.votes[a.id] || 0));
  const rootComments = comments.filter(c => !c.parent_id).reverse();
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      
      <div className="absolute inset-0 z-0" onClick={onClose}>
         <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover blur-3xl opacity-40 scale-110" />
         <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="bg-black/40 backdrop-blur-2xl w-full max-w-7xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row relative z-10">
        
        <button onClick={onClose} className="absolute top-4 left-4 z-[60] bg-black/50 hover:bg-[#ccff00] hover:text-black p-2 rounded-full transition-all cursor-pointer border border-white/10"><X size={20} /></button>

        {/* --- LEFT SIDE --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-black/20">
            <div className="relative h-64 md:h-80 group">
                <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                
                {/* دکمه استوری */}
                <button 
                    onClick={() => handleShare('episode', ep)}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-[#ccff00] hover:text-black backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white transition-all text-xs font-bold border border-white/10 z-20"
                >
                   {isGeneratingStory ? <Loader2 size={12} className="animate-spin" /> : <Instagram size={14} />}
                   استوری کن
                </button>

                <div className="absolute bottom-6 right-6 text-right max-w-[80%]">
                    <div className="flex items-center gap-2 mb-2">
                         <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">فصل {seasonNum}</span>
                         <span className="text-gray-300 text-[10px] bg-black/50 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1"><Calendar size={10} /> {ep.air_date}</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white ltr leading-tight drop-shadow-xl">{ep.name}</h2>
                </div>
            </div>

            <div className="p-6 space-y-8 pb-24">
                {isReleased ? (
                    <button 
                        onClick={handleToggleWatched}
                        className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all cursor-pointer transform active:scale-[0.98] ${
                            isWatched 
                            ? 'bg-[#ccff00] text-black shadow-[0_0_30px_rgba(204,255,0,0.3)] ring-2 ring-[#ccff00] ring-offset-2 ring-offset-black' 
                            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                        }`}
                    >
                        {isWatched ? <><Check size={28} strokeWidth={3} /> دیدم، تمام!</> : <><div className="w-6 h-6 rounded-full border-2 border-white/50"></div> ثبت در لیست دیده‌شده‌ها</>}
                    </button>
                ) : (
                    <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center gap-2 text-gray-400">
                        <Calendar size={20} />
                        <span className="font-bold">هنوز پخش نشده</span>
                    </div>
                )}

                {!isEnglishText(ep.overview) && (
                    <p className="text-gray-200 leading-8 text-sm text-justify font-light opacity-90 border-r-2 border-[#ccff00]/50 pr-4">
                        {ep.overview}
                    </p>
                )}

                <div className="relative min-h-[300px] transition-all duration-700">
                    {!isWatched && isReleased && (
                        <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/20 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
                            <Lock size={48} className="text-gray-500 mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-white mb-2">قفل محتوای اسپویل‌دار ⛔</h3>
                            <p className="text-gray-400 text-sm mb-6 max-w-xs">
                                هر موقع اپیزود رو دیدی، به کامنت‌ها، آمار و نظرسنجی‌ها دسترسی پیدا میکنی.
                            </p>
                        </div>
                    )}

                    <div className={`${!isWatched && isReleased ? 'opacity-20 pointer-events-none filter blur-sm' : 'opacity-100 filter-none'} transition-all duration-700 space-y-8`}>
                        <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-2 opacity-10"><Flame size={100} /></div>
                             <h3 className="font-bold text-white mb-4 relative z-10 flex items-center gap-2">🔥 نظرسنجی داغ: این قسمت چطور بود؟</h3>
                             <div className="flex gap-3 relative z-10">
                                 <button onClick={() => setHotTakeVote('fire')} className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${hotTakeVote === 'fire' ? 'bg-orange-500 text-black border-orange-500 font-bold' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}><ThumbsUp size={16} /> شاهکار</button>
                                 <button onClick={() => setHotTakeVote('mid')} className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${hotTakeVote === 'mid' ? 'bg-gray-500 text-white border-gray-500 font-bold' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}><Minus size={16} /> معمولی</button>
                                 <button onClick={() => setHotTakeVote('trash')} className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${hotTakeVote === 'trash' ? 'bg-red-600 text-white border-red-600 font-bold' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}><ThumbsDown size={16} /> افتضاح</button>
                             </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-300 mb-4 text-xs tracking-wider">حسی که داشتی:</h3>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {EMOTIONS.map((e) => {
                                    const isSelected = myReactions.includes(e.id);
                                    const percent = getPercent(stats.reactions[e.id] || 0, stats.totalReactions);
                                    const showPercent = myReactions.length > 0;
                                    return (
                                        <button key={e.id} onClick={() => handleReaction(e.id)} className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer border ${isSelected ? 'bg-[#ccff00]/20 border-[#ccff00] scale-105' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                            <span className="text-2xl filter drop-shadow-lg">{e.icon}</span>
                                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#ccff00]' : 'text-gray-500'}`}>{e.label}</span>
                                            {showPercent && <div className="absolute top-1 left-2 text-[9px] text-gray-400 font-bold bg-black/50 px-1 rounded">{percent}%</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-300 mb-4 text-xs tracking-wider">ستاره این قسمت 🌟</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {episodeCast.map((actor: any) => {
                                    const percent = getPercent(stats.votes[actor.id] || 0, stats.totalVotes);
                                    return (
                                        <div key={actor.id} onClick={() => handleVote(actor)} className="min-w-[70px] flex flex-col items-center cursor-pointer group">
                                            <div className={`w-14 h-14 rounded-full p-0.5 border-2 transition-all relative ${myVote === actor.id ? 'border-[#ccff00] scale-110' : 'border-white/10 group-hover:border-white/50'}`}>
                                                <img src={getImageUrl(actor.profile_path)} className="w-full h-full object-cover rounded-full" />
                                                {stats.totalVotes > 0 && <div className="absolute -bottom-2 -right-2 bg-black/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded border border-white/20">{percent}%</div>}
                                            </div>
                                            <span className={`text-[9px] mt-2 font-bold truncate w-full text-center ${myVote === actor.id ? 'text-[#ccff00]' : 'text-gray-400'}`}>{actor.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT SIDE: COMMENTS --- */}
        <div className="w-full md:w-[450px] bg-black/40 border-r border-white/5 flex flex-col h-[60vh] md:h-auto backdrop-blur-md">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h3 className="font-bold flex items-center gap-2 text-sm"><MessageSquare size={16} className="text-[#ccff00]" /> بحث و گفتگو</h3>
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live</span>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 relative">
                {!isWatched && isReleased && (
                      <div className="absolute inset-0 z-10 backdrop-blur-md bg-black/10 flex items-center justify-center">
                          <div className="bg-black/80 p-4 rounded-2xl border border-white/10 text-center">
                              <AlertTriangle className="mx-auto text-yellow-500 mb-2" />
                              <p className="text-xs text-gray-300">اول ثبت کن که دیدی، بعد بخون!</p>
                          </div>
                      </div>
                )}

                {rootComments.map((c) => {
                    const badge = getUserBadge(c.email || ''); 
                    return (
                        <div key={c.id} className="group animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl rounded-tr-none border border-white/5 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                                            {c.email?.split('@')[0]}
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}>{badge.icon} {badge.label}</span>
                                        </span>
                                        <span className="text-[9px] text-gray-600 mt-0.5">{new Date(c.created_at).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <button onClick={() => handleShare('comment', c)} className="text-gray-500 hover:text-[#ccff00] transition-colors p-1" title="استوری کردن نظر">
                                        {isGeneratingStory ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={14} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-200 leading-relaxed mb-3">{c.content}</p>
                                <div className="flex items-center gap-3 border-t border-white/5 pt-2">
                                    <button onClick={() => toggleLike(c.id)} className={`flex items-center gap-1 text-[10px] transition-colors ${likedComments.includes(c.id) ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}><Heart size={12} fill={likedComments.includes(c.id) ? "currentColor" : "none"} /> {c.likes_count || 0}</button>
                                    <button onClick={() => setReplyTo(c)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#ccff00] transition-colors"><Reply size={12} /> پاسخ</button>
                                </div>
                            </div>
                            {getReplies(c.id).length > 0 && <div className="mr-3 pl-2 border-r border-white/10 mt-2 space-y-2">{getReplies(c.id).map((r:any) => (<div key={r.id} className="bg-white/5 p-2 rounded-xl text-[10px] text-gray-300"><span className="text-[#ccff00] font-bold block mb-1">{r.email?.split('@')[0]}</span>{r.content}</div>))}</div>}
                        </div>
                    );
                })}
            </div>
            
            <div className="p-3 bg-black/40 border-t border-white/5 relative z-20">
                {replyTo && <div className="flex justify-between items-center bg-[#ccff00]/10 px-3 py-1.5 rounded-t-xl text-[10px] text-[#ccff00] mb-1"><span>پاسخ به: {replyTo.email?.split('@')[0]}</span><button onClick={() => setReplyTo(null)}><X size={12} /></button></div>}
                <div className="relative group">
                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={isReleased && !isWatched ? "اول لیست کن..." : "نظرت چیه؟"} disabled={isReleased && !isWatched} className="w-full bg-black/40 border border-white/10 group-hover:border-white/20 rounded-xl py-3.5 px-4 text-xs text-white focus:outline-none focus:border-[#ccff00] transition-all pr-10 disabled:opacity-50" onKeyDown={(e) => e.key === 'Enter' && sendComment()} />
                    <button onClick={sendComment} disabled={!newComment.trim()} className="absolute left-2 top-2 p-1.5 bg-[#ccff00] text-black rounded-lg hover:bg-[#b3e600] disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_10px_#ccff00]"><Send size={14} /></button>
                </div>
            </div>

            <div onClick={handleNextEpisode} className="p-4 bg-[#ccff00] text-black cursor-pointer hover:bg-[#b3e600] transition-colors flex items-center justify-between font-black text-xs md:rounded-br-[2.5rem]">
                <span>قسمت بعدی آمادست!</span>
                <div className="flex items-center gap-1">E{currentEpNum + 1} چک کن <ChevronLeft size={16} /></div>
            </div>
            {/* DEBUG INFO: This shows what ID we are looking for */}
            <div className="p-1 text-[8px] text-gray-800 bg-black text-center select-none">ID: {ep?.id}</div>
        </div>
      </div>

      {/* --- HIDDEN STORY TEMPLATES (برای عکس برداری) --- */}
      {storyData && (
          <div ref={storyRef} className="fixed top-0 -left-[9999px] w-[375px] h-[667px] bg-[#1a1a1a] flex flex-col items-center text-white overflow-hidden font-['Vazirmatn']">
              {/* پس زمینه بلور شده */}
              <div className="absolute inset-0 z-0">
                  <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover opacity-60 blur-md" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
              </div>

              {/* لوگو */}
              <div className="relative z-10 w-full p-8 flex justify-between items-center">
                  <span className="font-black text-2xl tracking-tighter">Binger<span className="text-[#ccff00]">.</span></span>
                  <span className="text-xs bg-white/10 px-2 py-1 rounded-full">{new Date().toLocaleDateString('fa-IR')}</span>
              </div>

              {/* محتوای استوری اپیزود */}
              {storyData.type === 'episode' && (
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-8 text-center space-y-6">
                      <div className="w-64 h-64 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(204,255,0,0.3)] border-4 border-[#ccff00]">
                          <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-2">
                          <span className="inline-block bg-[#ccff00] text-black text-xs font-black px-3 py-1 rounded-full uppercase">Just Watched</span>
                          <h1 className="text-4xl font-black leading-tight">{ep.name}</h1>
                          <p className="text-gray-300 font-bold text-lg">Season {seasonNum} | Episode {currentEpNum}</p>
                      </div>
                      <div className="flex gap-4 mt-8">
                          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
                              <Award className="text-[#ccff00]" size={20} />
                              <span className="text-sm font-bold">رای بینجری‌ها: {(stats.totalVotes > 0 ? getPercent(stats.votes[myVote || 0], stats.totalVotes) : 0)}%</span>
                          </div>
                      </div>
                  </div>
              )}

              {/* محتوای استوری کامنت */}
              {storyData.type === 'comment' && (
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-8 text-center">
                      <div className="relative w-full bg-black/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#ccff00] rounded-full flex items-center justify-center text-black">
                              <MessageSquare size={24} fill="black" />
                          </div>
                          <div className="mt-4 mb-6">
                              <p className="text-xl font-bold leading-relaxed">"{storyData.data.content}"</p>
                          </div>
                          <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-4">
                              <span className="font-bold text-[#ccff00]">{storyData.data.email?.split('@')[0]}</span>
                              <span className="text-gray-500 text-xs">درباره اپیزود {currentEpNum}</span>
                          </div>
                      </div>
                      <div className="mt-8 opacity-60">
                           <img src={getImageUrl(ep.still_path)} className="w-24 h-24 rounded-2xl object-cover mx-auto mb-2 opacity-50 grayscale" />
                           <span className="text-xs tracking-widest uppercase">Watching on Binger</span>
                      </div>
                  </div>
              )}

              <div className="relative z-10 w-full p-8 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Share your obsession</p>
              </div>
          </div>
      )}

    </div>
  );
}