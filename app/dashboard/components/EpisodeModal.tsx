"use client";

import React, { useEffect, useState } from 'react';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
import { createClient } from '@/lib/supabase';
import { 
  X, Loader2, Check, Calendar, Share2, 
  ChevronLeft, ChevronRight, Lock, Flame, ThumbsUp, ThumbsDown, Minus, Smile 
} from 'lucide-react';

const EMOTIONS = [
  { id: 'wow', icon: '🤯', label: 'پشمام!' },
  { id: 'funny', icon: '😂', label: 'خندیدم' },
  { id: 'sad', icon: '😭', label: 'گریه کردم' },
  { id: 'love', icon: '😍', label: 'عاشقش شدم' },
  { id: 'angry', icon: '🤬', label: 'عصبی شدم' },
];

export default function EpisodeModal({ showId, seasonNum, episodeNum, onClose, onWatchedChange }: any) {
  const supabase = createClient() as any;
  
  // --- States ---
  const [currentEpNum, setCurrentEpNum] = useState(episodeNum);
  const [loading, setLoading] = useState(true);
  const [ep, setEp] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Actions
  const [isWatched, setIsWatched] = useState(false);
  const [isReleased, setIsReleased] = useState(true);
  
  // Interactive States
  const [myVote, setMyVote] = useState<'fire' | 'mid' | 'trash' | null>(null);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [stats, setStats] = useState({ fire: 0, mid: 0, trash: 0 });

  // --- Helper: Detect English Text ---
  const isEnglishText = (text: string) => {
      if (!text) return true;
      // اگر بیشتر از نصف متن حروف انگلیسی بود، یعنی انگلیسیه
      const englishChars = text.replace(/[^a-zA-Z]/g, "").length;
      return englishChars > text.length / 2;
  };

  // --- Main Logic ---
  useEffect(() => {
    const init = async () => {
      setLoading(true); 
      setMyVote(null);
      setMyReactions([]);
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 1. Fetch TMDB Data
      const data = await getEpisodeDetails(showId, seasonNum, currentEpNum);
      if (!data || !data.id) { setLoading(false); return; }
      setEp(data);

      if (user) {
        const released = new Date(data.air_date) <= new Date();
        setIsReleased(released);

        // 2. Parallel Fetch (Watched + Votes + Reactions)
        const [wRes, vRes, rRes, statsRes] = await Promise.all([
             supabase.from('watched').select('id').eq('user_id', user.id).eq('episode_id', data.id),
             supabase.from('episode_votes').select('vote_type').eq('user_id', user.id).eq('episode_id', data.id).single(),
             supabase.from('episode_reactions').select('reaction').eq('user_id', user.id).eq('episode_id', data.id),
             supabase.from('episode_votes').select('vote_type').eq('episode_id', data.id) // Simple stats fetch
        ]);

        if (wRes.data?.length > 0) setIsWatched(true);
        if (vRes.data) setMyVote(vRes.data.vote_type);
        if (rRes.data) setMyReactions(rRes.data.map((r:any) => r.reaction));
        
        // Calculate Vote Stats
        if (statsRes.data) {
            const counts = { fire: 0, mid: 0, trash: 0 };
            statsRes.data.forEach((v:any) => {
                if (v.vote_type in counts) counts[v.vote_type as keyof typeof counts]++;
            });
            setStats(counts);
        }
      }
      setLoading(false);
    };
    init();
  }, [currentEpNum, showId, seasonNum]);

  // --- Handlers ---
  const handleToggleWatched = async () => {
    if (!isReleased || !user) return;
    const newState = !isWatched;
    setIsWatched(newState);
    
    if (newState) {
      await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: ep.id }] as any);
    } else {
      await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', ep.id);
    }
    if (onWatchedChange) onWatchedChange(); 
  };

  const handleVote = async (type: 'fire' | 'mid' | 'trash') => {
      if (!user) return;
      setMyVote(type);
      // Optimistic UI Update not included for simplicity, just relying on DB upsert
      await supabase.from('episode_votes').upsert({ 
          user_id: user.id, 
          episode_id: ep.id, 
          vote_type: type 
      }, { onConflict: 'user_id, episode_id' });
  };

  const handleReaction = async (reactionId: string) => {
      if (!user) return;
      const exists = myReactions.includes(reactionId);
      let newReactions;
      
      if (exists) {
          newReactions = myReactions.filter(r => r !== reactionId);
          await supabase.from('episode_reactions').delete().eq('user_id', user.id).eq('episode_id', ep.id).eq('reaction', reactionId);
      } else {
          newReactions = [...myReactions, reactionId];
          await supabase.from('episode_reactions').insert({ user_id: user.id, episode_id: ep.id, reaction: reactionId });
      }
      setMyReactions(newReactions);
  };

  const handleNativeShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Binger: ${ep.name}`,
                  text: `من قسمت ${currentEpNum} سریال رو دیدم! نظر شما چیه؟`,
                  url: window.location.href,
              });
          } catch (error) { console.log('Error sharing', error); }
      } else {
          alert("لینک کپی شد.");
      }
  };

  const handleNextEpisode = () => setCurrentEpNum((prev: number) => prev + 1);
  const handlePrevEpisode = () => setCurrentEpNum((prev: number) => Math.max(1, prev - 1));

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"><Loader2 className="animate-spin text-[#ccff00]" size={48} /></div>;
  if (!ep) return null;

  const hasPersianDesc = !isEnglishText(ep.overview);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 font-['Vazirmatn']">
      
      <div className="absolute inset-0 z-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-[#101010] w-full max-w-2xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col relative z-10">
        
        <button onClick={onClose} className="absolute top-4 left-4 z-[60] bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full transition-all cursor-pointer border border-white/10"><X size={20} /></button>

        {/* --- HERO --- */}
        <div className="relative h-56 md:h-64 group shrink-0">
            {ep.still_path ? (
                <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-[#222] flex items-center justify-center text-gray-700 font-black text-4xl">BINGER</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent"></div>
            
            <button onClick={handleNativeShare} className="absolute top-4 right-4 bg-black/50 hover:bg-[#ccff00] hover:text-black backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white transition-all text-xs font-bold border border-white/10 z-20">
                <Share2 size={14} /> <span className="hidden md:inline">اشتراک گذاری</span>
            </button>

            <div className="absolute bottom-4 right-6 text-right max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                     <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">S{seasonNum} | E{currentEpNum}</span>
                     <span className="text-gray-300 text-[10px] bg-black/50 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1"><Calendar size={10} /> {ep.air_date || "Coming Soon"}</span>
                </div>
                <h2 className="text-xl md:text-3xl font-black text-white ltr leading-tight drop-shadow-xl line-clamp-2">{ep.name}</h2>
            </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            
            {/* 1. WATCH BUTTON */}
            {isReleased ? (
                <button 
                    onClick={handleToggleWatched}
                    className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all cursor-pointer transform active:scale-[0.98] ${
                        isWatched 
                        ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]' 
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                >
                    {isWatched ? <><Check size={24} strokeWidth={3} /> دیدم، تمام!</> : <><div className="w-5 h-5 rounded-full border-2 border-white/50"></div> ثبت در لیست دیده‌شده‌ها</>}
                </button>
            ) : (
                <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center gap-2 text-gray-500 cursor-not-allowed">
                    <Lock size={20} />
                    <span className="font-bold">هنوز پخش نشده</span>
                </div>
            )}

            {/* 2. DESCRIPTION OR INTERACTION */}
            {hasPersianDesc ? (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-gray-300 leading-7 text-sm text-justify font-light opacity-90" dir="auto">
                        {ep.overview}
                    </p>
                </div>
            ) : (
                 // اگر توضیحات فارسی نبود، این بخش تعاملی را نشان بده
                 <div className={`space-y-6 ${!isWatched && isReleased ? 'opacity-50 blur-[2px] pointer-events-none' : 'opacity-100'}`}>
                      {/* POLL */}
                      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-white/10 rounded-2xl p-5">
                            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2 text-sm"><Flame size={16} className="text-orange-500" /> این قسمت چطور بود؟</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleVote('fire')} className={`flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${myVote === 'fire' ? 'bg-orange-600/20 text-orange-500 border-orange-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <ThumbsUp size={20} /> <span className="text-[10px]">شاهکار</span>
                                </button>
                                <button onClick={() => handleVote('mid')} className={`flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${myVote === 'mid' ? 'bg-gray-500/20 text-gray-300 border-gray-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <Minus size={20} /> <span className="text-[10px]">معمولی</span>
                                </button>
                                <button onClick={() => handleVote('trash')} className={`flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${myVote === 'trash' ? 'bg-red-600/20 text-red-500 border-red-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}`}>
                                    <ThumbsDown size={20} /> <span className="text-[10px]">ضعیف</span>
                                </button>
                            </div>
                      </div>

                      {/* EMOTIONS */}
                      <div>
                           <h3 className="font-bold text-gray-400 mb-3 text-xs">چه حسی داشتی؟</h3>
                           <div className="flex justify-between gap-2">
                                {EMOTIONS.map(e => {
                                    const isSelected = myReactions.includes(e.id);
                                    return (
                                        <button key={e.id} onClick={() => handleReaction(e.id)} className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isSelected ? 'bg-[#ccff00]/10 border-[#ccff00] scale-110' : 'bg-white/5 border-white/5 hover:bg-white/10 grayscale hover:grayscale-0'}`}>
                                            <span className="text-xl">{e.icon}</span>
                                            <span className="text-[9px] text-gray-500">{e.label}</span>
                                        </button>
                                    )
                                })}
                           </div>
                      </div>
                 </div>
            )}
            
            {/* LOCK MESSAGE FOR UNWATCHED */}
            {!isWatched && isReleased && !hasPersianDesc && (
                 <div className="text-center text-xs text-gray-500 mt-2">
                     برای شرکت در نظرسنجی، اول دکمه «دیدم» را بزنید.
                 </div>
            )}

            {/* NAVIGATION */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                 <button 
                    onClick={handlePrevEpisode}
                    disabled={currentEpNum <= 1}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                 >
                     <ChevronRight size={16} /> قسمت قبلی
                 </button>

                 <button 
                    onClick={handleNextEpisode}
                    className="flex items-center gap-2 text-xs font-bold text-[#ccff00] hover:text-[#b3e600] transition-colors"
                 >
                     قسمت بعدی <ChevronLeft size={16} />
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
}