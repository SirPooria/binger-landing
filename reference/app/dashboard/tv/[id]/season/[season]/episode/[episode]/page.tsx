"use client";

import React, { useEffect, useState } from 'react';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
import { createClient } from '@/lib/supabase';
import { 
  X, Loader2, Check, Calendar, Share2, 
  ChevronLeft, ChevronRight, Lock 
} from 'lucide-react';

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

  // --- Main Logic ---
  useEffect(() => {
    const init = async () => {
      setLoading(true); 
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 1. Fetch TMDB Data
      const data = await getEpisodeDetails(showId, seasonNum, currentEpNum);
      if (!data || !data.id) {
          setLoading(false);
          return;
      }
      setEp(data);

      // 2. Check Release Date & Watch Status
      if (user) {
        const released = new Date(data.air_date) <= new Date();
        setIsReleased(released);

        // Check if watched
        const { data: wRes } = await supabase.from('watched').select('id').eq('user_id', user.id).eq('episode_id', data.id);
        if (wRes && wRes.length > 0) setIsWatched(true);
        else setIsWatched(false);
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

  const handleNextEpisode = () => setCurrentEpNum((prev: number) => prev + 1);
  const handlePrevEpisode = () => setCurrentEpNum((prev: number) => Math.max(1, prev - 1));

  // 🔥 Native Share (Mobile Friendly)
  const handleNativeShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Binger: ${ep.name}`,
                  text: `من همین الان قسمت ${currentEpNum} از فصل ${seasonNum} سریال رو دیدم! 😎`,
                  url: window.location.href,
              });
          } catch (error) {
              console.log('Error sharing', error);
          }
      } else {
          alert("لینک کپی شد (اشتراک‌گذاری نیتیو روی این مرورگر پشتیبانی نمی‌شود)");
      }
  };

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"><Loader2 className="animate-spin text-[#ccff00]" size={48} /></div>;
  if (!ep) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300 font-['Vazirmatn']">
      
      <div className="absolute inset-0 z-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-[#101010] w-full max-w-2xl max-h-[90vh] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col relative z-10">
        
        {/* CLOSE BUTTON */}
        <button onClick={onClose} className="absolute top-4 left-4 z-[60] bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full transition-all cursor-pointer border border-white/10"><X size={20} /></button>

        {/* --- HERO IMAGE --- */}
        <div className="relative h-56 md:h-72 group shrink-0">
            {ep.still_path ? (
                <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-[#222] flex items-center justify-center text-gray-700 font-black text-4xl">BINGER</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent"></div>
            
            {/* Share Button */}
            <button 
                onClick={handleNativeShare}
                className="absolute top-4 right-4 bg-black/50 hover:bg-[#ccff00] hover:text-black backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white transition-all text-xs font-bold border border-white/10 z-20"
            >
                <Share2 size={14} /> اشتراک گذاری
            </button>

            <div className="absolute bottom-4 right-6 text-right max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                     <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">S{seasonNum} | E{currentEpNum}</span>
                     <span className="text-gray-300 text-[10px] bg-black/50 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1"><Calendar size={10} /> {ep.air_date || "Coming Soon"}</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white ltr leading-tight drop-shadow-xl line-clamp-2">{ep.name}</h2>
            </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* WATCH BUTTON */}
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

            {/* OVERVIEW */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-gray-300 leading-7 text-sm text-justify font-light opacity-90" dir="auto">
                    {ep.overview || "توضیحاتی برای این قسمت ثبت نشده است."}
                </p>
            </div>

            {/* NAVIGATION */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
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