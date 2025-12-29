"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getShowDetails, getSeasonDetails, getImageUrl, getBackdropUrl, getSimilarShows, BASE_URL, API_KEY } from '@/lib/tmdbClient';
import { createClient } from '@/lib/supabase';
import { Star, Loader2, Check, Plus, Share2, Play, Info, RotateCcw, ChevronDown, ChevronUp, Tag, CheckCircle2, Search, Users } from 'lucide-react';
import EpisodeModal from '../../components/EpisodeModal';
import confetti from 'canvas-confetti'; 

// --- SKELETON LOADER ---
const SkeletonPage = () => (
  <div className="min-h-screen bg-[#050505] animate-pulse pb-20 overflow-hidden">
    <div className="relative w-full h-[65vh] md:h-[75vh] bg-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full md:w-2/3 p-6 md:p-12 flex flex-col items-start gap-4 pb-20">
           <div className="w-24 h-6 bg-white/10 rounded-full"></div>
            <div className="space-y-2 w-full">
                <div className="w-3/4 md:w-1/2 h-12 md:h-16 bg-white/10 rounded-xl"></div>
                <div className="w-1/3 h-6 bg-white/5 rounded-lg"></div>
            </div>
        </div>
    </div>
  </div>
);

// --- HELPER COMPONENT ---
const PlatformIcon = ({ name, color, icon }: any) => (
    <div className="flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95">
        <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl border border-white/5 relative overflow-hidden`}>
            {icon ? icon : <span className="font-black text-[10px] uppercase tracking-wider">{name.substring(0, 3)}</span>}
        </div>
        <span className="text-[9px] md:text-[10px] text-gray-400 font-medium group-hover:text-white transition-colors">{name}</span>
    </div>
);

const getGenreColor = (index: number) => {
    const colors = ['from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];
    return colors[index % colors.length];
};
// تابع ساخت حروف اول اسم (مثلا Bryan Cranston -> BC)
const getInitials = (name: string) => {
    if (!name) return "";
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};
export default function ShowDetailsPage() {
  const supabase = createClient() as any;
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

  const isPersianText = (text: string) => {
        if (!text) return false;
        return /[\u0600-\u06FF]/.test(text);
  };

  // --- Data States ---
  
  const [user, setUser] = useState<any>(null);
  const [show, setShow] = useState<any>(null);
  const [showEn, setShowEn] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [allSeasonsData, setAllSeasonsData] = useState<any>({});
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'episodes'>('about');
  const [loading, setLoading] = useState(true);
  // ... state های قبلی
  const [showGapModal, setShowGapModal] = useState(false);
  const [gapEpisodesToMark, setGapEpisodesToMark] = useState<number[]>([]);
  const [targetGapEpisode, setTargetGapEpisode] = useState<number | null>(null); // اپیزودی که کاربر روش کلیک کرده
  
  // --- New Feature: Platform Links ---
  const [platformLinks, setPlatformLinks] = useState<any>(null);

  // --- UI States ---
  const [selectedEp, setSelectedEp] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false); 
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set([1]));
  const carouselRef = useRef<HTMLDivElement>(null);

  // --- Loading States ---
  const [seasonLoading, setSeasonLoading] = useState<{[key: number]: boolean}>({}); 
  const [wholeShowLoading, setWholeShowLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // --- Ratings & Similar ---
  const [similarShows, setSimilarShows] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0); 
  const [bingerStats, setBingerStats] = useState({ avg: 0, count: 0 }); // Restored Binger Stats
  const [inWatchlist, setInWatchlist] = useState(false);

  // --- Helper Functions ---
  const triggerCelebration = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        try {
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        } catch (e) { console.log("Confetti optional"); }
      }, 250);
  };

  const isReleased = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) <= new Date();
  };
  
  const getStatusText = (status: string) => {
      switch (status) {
          case "Ended": return "پایان یافته";
          case "Canceled": return "کنسل شده";
          case "Returning Series": return "در انتظار فصل جدید";
          default: return "در حال پخش";
      }
  };

  const scrollToActiveEpisode = () => {
      if (carouselRef.current) {
          const firstUnwatched = episodes.find(ep => !watchedEpisodes.includes(ep.id));
          const targetId = firstUnwatched ? `ep-${firstUnwatched.id}` : (episodes.length > 0 ? `ep-${episodes[episodes.length-1].id}` : null);
          if (targetId) {
              const el = document.getElementById(targetId);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } else {
              carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }
      }
  };

  // --- DATA FETCHING ---
  const refreshWatched = async (userId: string) => {
    const { data } = await supabase.from('watched').select('episode_id').eq('user_id', userId).eq('show_id', showId);
    if (data) setWatchedEpisodes(data.map((item: any) => item.episode_id));
  };

  const fetchRatings = async (userId: string) => {
    // 1. My Rating
    const { data: myR } = await supabase.from('show_ratings').select('rating').eq('user_id', userId).eq('show_id', showId);
    if (myR && myR.length > 0) setMyRating(myR[0].rating);

    // 2. Average Stats (Optimized: Single query if possible, or simple aggregate)
    // Note: In real production with millions of rows, use a dedicated stats table or Edge Function.
    // For MVP, simple fetch is okay for now.
    const { data: allR } = await supabase.from('show_ratings').select('rating').eq('show_id', showId);
    if (allR && allR.length > 0) {
        const sum = allR.reduce((acc:any, curr:any) => acc + curr.rating, 0);
        setBingerStats({ avg: sum / allR.length, count: allR.length });
    }
  };

  const fetchWatchlist = async (userId: string) => {
      const { data } = await supabase.from('watchlist').select('id').eq('user_id', userId).eq('show_id', showId);
      if (data && data.length > 0) setInWatchlist(true);
  };

  const fetchPlatformLinks = async () => {
      const { data } = await supabase.from('show_platform_links').select('*').eq('show_id', showId).single();
      if (data) setPlatformLinks(data);
  };

  const fetchCredits = async (id: string) => {
      try {
          const res = await fetch(`${BASE_URL}/tv/${id}/credits?api_key=${API_KEY}`);
          const data = await res.json();
          if(data.cast) setCast(data.cast.slice(0, 10));
      } catch(e) { console.error(e); }
  }

  const getEnglishDetails = async (id: string) => {
      try {
          const res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`);
          return await res.json();
      } catch { return null; }
  }

  // --- MAIN EFFECT ---
  useEffect(() => {
    const initData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.replace('/login'); return; }
      setUser(currentUser); 

      const details = await getShowDetails(showId);
      const detailsEn = await getEnglishDetails(showId);
      setShow(details);
      setShowEn(detailsEn);
      
      if (details) {
        const firstSeason = details.seasons?.find((s:any) => s.season_number > 0)?.season_number || 1;
        setActiveSeason(firstSeason);
        setExpandedSeasons(new Set([firstSeason]));
        
        const sData = await getSeasonDetails(showId, firstSeason);
        const eps = sData?.episodes || [];
        setEpisodes(eps);
        setAllSeasonsData((prev:any) => ({...prev, [firstSeason]: eps}));
      
        fetchCredits(showId);
      }
      
      const similarData = await getSimilarShows(showId);
      setSimilarShows(similarData ? similarData : []);

      await Promise.all([
          refreshWatched(currentUser.id), 
          fetchRatings(currentUser.id), 
          fetchWatchlist(currentUser.id),
          fetchPlatformLinks(), 
      ]);
      setLoading(false);
    };
    if (showId) initData();
  }, [showId]);

  useEffect(() => {
      if (activeTab === 'episodes' && episodes.length > 0) {
          setTimeout(scrollToActiveEpisode, 500);
      }
  }, [activeTab, episodes]);

  // --- HANDLERS ---
  
  const handlePlatformClick = async (platform: string) => {
      // 1. Log the click
      supabase.from('outbound_clicks').insert({
          show_id: Number(showId),
          platform: platform
      } as any).then(() => console.log('Analytics logged'));

      // 2. Direct Link
      if (platformLinks) {
          if (platform === 'filimo' && platformLinks.filimo_url) { window.open(platformLinks.filimo_url, '_blank'); return; }
          if (platform === 'namava' && platformLinks.namava_url) { window.open(platformLinks.namava_url, '_blank'); return; }
          if (platform === 'filmnet' && platformLinks.filmnet_url) { window.open(platformLinks.filmnet_url, '_blank'); return; }
      }

      // 3. Fallback Search (Fixed Filmnet)
      const query = encodeURIComponent(show.name); 
      let url = "";
      if (platform === 'filimo') url = `https://www.filimo.com/search/${query}`;
      if (platform === 'namava') url = `https://www.namava.ir/search?query=${query}`;
      if (platform === 'filmnet') url = `https://filmnet.ir/contents?query=${query}`; // FIXED
      if (platform === 'google') url = `https://www.google.com/search?q=دانلود+سریال+${query}`;
      
      if(url) window.open(url, '_blank');
  };

  const handleSeasonChange = async (seasonNumber: number) => {
    setActiveSeason(seasonNumber);
    if (!allSeasonsData[seasonNumber]) {
        const seasonData = await getSeasonDetails(showId, seasonNumber);
        const epData = seasonData?.episodes || [];
        setAllSeasonsData((prev:any) => ({...prev, [seasonNumber]: epData}));
        setEpisodes(epData);
    } else {
        setEpisodes(allSeasonsData[seasonNumber]);
    }
  };

  const toggleAccordion = async (seasonNum: number) => {
      const newSet = new Set(expandedSeasons);
      if (newSet.has(seasonNum)) newSet.delete(seasonNum);
      else {
          newSet.add(seasonNum);
          if (!allSeasonsData[seasonNum]) {
             const seasonData = await getSeasonDetails(showId, seasonNum);
             setAllSeasonsData((prev:any) => ({...prev, [seasonNum]: seasonData?.episodes || []}));
          }
      }
      setExpandedSeasons(newSet);
  }

const toggleWatched = async (episodeId: number, forceSingle: boolean = false) => {
    if (!user) return;
    
    const isWatched = watchedEpisodes.includes(episodeId);

    // ۱. اگر میخواد تیک رو برداره (Unwatch)، یا حالت forceSingle فعاله، مثل قبل عمل کن
    if (isWatched || forceSingle) {
        let newWatchedList: number[];
        if (isWatched) {
            newWatchedList = watchedEpisodes.filter(id => id !== episodeId);
            setWatchedEpisodes(newWatchedList);
            await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', episodeId);
        } else {
            newWatchedList = [...watchedEpisodes, episodeId];
            setWatchedEpisodes(newWatchedList);
            await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: episodeId }] as any);
             // چک کردن جشن و شادی
            const released = episodes.filter(ep => isReleased(ep.air_date)).map(e => e.id);
            if (released.every(id => newWatchedList.includes(id))) triggerCelebration();
        }
        return;
    }
    const handleGapConfirm = async () => {
      if (!user || !targetGapEpisode) return;
      
      const allIds = [...gapEpisodesToMark, targetGapEpisode];
      
      // آپدیت UI فوری
      setWatchedEpisodes(prev => [...prev, ...allIds]);
      setShowGapModal(false);
      triggerCelebration(); // یه جشن کوچولو

      // آپدیت دیتابیس (Group Insert)
      const records = allIds.map(id => ({
          user_id: user.id,
          show_id: Number(showId),
          episode_id: id
      }));
      
      await supabase.from('watched').upsert(records, { onConflict: 'user_id, episode_id' } as any);
  };

    // ۲. بررسی هوشمند برای اپیزودهای جاافتاده (Gap Check)
    // پیدا کردن ایندکس اپیزود کلیک شده در لیست فعلی
    const currentIndex = episodes.findIndex(ep => ep.id === episodeId);
    
    // اگر اپیزود پیدا شد و اول لیست نبود
    if (currentIndex > 0) {
        // تمام اپیزودهای قبل از این رو میگیریم
        const previousEpisodes = episodes.slice(0, currentIndex);
        
        // اونایی که هنوز تیک نخوردن رو جدا میکنیم
        const missingEpisodeIds = previousEpisodes
            .filter(ep => !watchedEpisodes.includes(ep.id) && isReleased(ep.air_date)) // فقط پخش شده‌ها
            .map(ep => ep.id);

        // اگر چیزی جا افتاده بود، مودال رو باز کن
        if (missingEpisodeIds.length > 0) {
            setGapEpisodesToMark(missingEpisodeIds);
            setTargetGapEpisode(episodeId);
            setShowGapModal(true);
            return; // عملیات رو متوقف کن تا کاربر تصمیم بگیره
        }
    }

    // ۳. اگر هیچ گپی نبود، به صورت عادی تیک بزن (کد تکراری بالا رو صدا میزنیم)
    toggleWatched(episodeId, true);
  };
  const handleGapConfirm = async () => {
      // اگر کاربر یا اپیزود هدف مشخص نبود، کاری نکن
      if (!user || !targetGapEpisode) return;
      
      // لیست همه اپیزودهایی که باید تیک بخورند (قبلی‌ها + همین اپیزود کلیک شده)
      const allIds = [...gapEpisodesToMark, targetGapEpisode];
      
      // 1. آپدیت سریع ظاهر برنامه (UI)
      setWatchedEpisodes(prev => {
          const uniqueIds = new Set([...prev, ...allIds]);
          return Array.from(uniqueIds);
      });
      
      // 2. بستن مودال و جشن
      setShowGapModal(false);
      triggerCelebration(); 

      // 3. آپدیت دیتابیس (ثبت گروهی در Supabase)
      const records = allIds.map(id => ({
          user_id: user.id,
          show_id: Number(showId),
          episode_id: id
      }));
      
      await supabase.from('watched').upsert(records, { onConflict: 'user_id, episode_id' } as any);
  };
  const toggleSeasonWatched = async (seasonNum: number, seasonEpisodes: any[]) => {
    if (!user) return;
    let targetEpisodes = seasonEpisodes;
    if (!targetEpisodes) {
        setSeasonLoading(prev => ({...prev, [seasonNum]: true}));
        const sData = await getSeasonDetails(showId, seasonNum);
        targetEpisodes = sData?.episodes || [];
        setAllSeasonsData((prev:any) => ({...prev, [seasonNum]: targetEpisodes}));
    }

    if (!targetEpisodes || targetEpisodes.length === 0) {
        setSeasonLoading(prev => ({...prev, [seasonNum]: false}));
        return;
    }

    setSeasonLoading(prev => ({...prev, [seasonNum]: true}));
    
    const releasedEpisodes = targetEpisodes.filter((ep:any) => isReleased(ep.air_date));
    const seasonEpisodeIds = releasedEpisodes.map((ep:any) => ep.id);
    const allWatched = seasonEpisodeIds.every((id:number) => watchedEpisodes.includes(id));
    
    let newWatchedList: number[] = [...watchedEpisodes];
    if (allWatched) {
      newWatchedList = newWatchedList.filter(id => !seasonEpisodeIds.includes(id));
      setWatchedEpisodes(newWatchedList);
      await supabase.from('watched').delete().eq('user_id', user.id).in('episode_id', seasonEpisodeIds);
    } else {
      const newIdsToInsert = seasonEpisodeIds
          .filter((id:number) => !watchedEpisodes.includes(id))
          .map((id:number) => ({ user_id: user.id, show_id: Number(showId), episode_id: id }));
      
      if (newIdsToInsert.length > 0) {
        newIdsToInsert.forEach(item => newWatchedList.push(item.episode_id));
        setWatchedEpisodes(newWatchedList);
        await supabase.from('watched').upsert(newIdsToInsert, { onConflict: 'user_id, episode_id' } as any); 
        triggerCelebration(); 
      }
    }
    setSeasonLoading(prev => ({...prev, [seasonNum]: false}));
  };

  const handleMarkShowAsWatched = async () => {
      if(!user || !show) return;
      setWholeShowLoading(true);
      try {
          const seasonPromises = show.seasons
            .map((s:any) => getSeasonDetails(showId, s.season_number));
          const allSeasonsResults = await Promise.all(seasonPromises);
          
          // IMPORTANT: Update state immediately so UI reflects changes
          const newSeasonsData = { ...allSeasonsData };
          allSeasonsResults.forEach((s: any) => {
             if (s?.season_number && s?.episodes) {
                 newSeasonsData[s.season_number] = s.episodes;
             }
          });
          setAllSeasonsData(newSeasonsData);

          let allEpisodes: any[] = [];
          allSeasonsResults.forEach((s:any) => {
              if(s?.episodes) allEpisodes = [...allEpisodes, ...s.episodes];
          });
          const idsToMark = allEpisodes
            .filter(ep => isReleased(ep.air_date))
            .map(ep => ep.id);

          if (idsToMark.length === 0) {
              setWholeShowLoading(false);
              setShowConfirmAll(false);
              return;
          }

          const records = idsToMark.map(id => ({
              user_id: user.id,
              show_id: Number(showId),
              episode_id: id
          }));
          
          const chunkSize = 50; 
          for (let i = 0; i < records.length; i += chunkSize) {
              const chunk = records.slice(i, i + chunkSize);
              const { error } = await supabase.from('watched').upsert(chunk, { onConflict: 'user_id, episode_id' } as any);
              if (error) throw new Error(`خطا: ${error.message}`);
          }
          
          setWatchedEpisodes(prev => {
              const unique = new Set([...prev, ...idsToMark]);
              return Array.from(unique);
          });
          triggerCelebration();

      } catch (err: any) {
          console.error("Bulk update failed", err);
          alert(err.message || "خطا در ثبت گروهی.");
      } finally {
          setWholeShowLoading(false);
          setShowConfirmAll(false);
      }
  };
  
  const toggleWatchlist = async () => {
    if (!user) return;
    setWatchlistLoading(true);
    setInWatchlist(!inWatchlist);
    if (inWatchlist) {
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
    } else {
        await supabase.from('watchlist').insert([{ user_id: user.id, show_id: Number(showId) }] as any);
    }
    setWatchlistLoading(false);
  };

  const handleRateShow = async (rating: number) => {
    if (!user) return;
    setMyRating(rating);
    await supabase.from('show_ratings').upsert({ user_id: user.id, show_id: Number(showId), rating: rating }, { onConflict: 'user_id, show_id' } as any);
    // Refresh stats
    fetchRatings(user.id);
  };

  if (loading) return <SkeletonPage />;
  if (!show) return <div className="text-white text-center mt-20">سریال پیدا نشد!</div>;

  const totalReleasedEpisodes = show.number_of_episodes;
  const progressPercent = Math.min(100, Math.round((watchedEpisodes.length / totalReleasedEpisodes) * 100)) || 0;
  // 🔥 FIX: If show is 100% watched, force all seasons to look "Complete" even if data not loaded
  const isShowCompleted = progressPercent === 100;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-32 md:pb-20">
      
      {selectedEp && (
        <EpisodeModal 
            showId={showId}
            seasonNum={activeSeason}
            episodeNum={selectedEp.episode_number}
            onClose={() => setSelectedEp(null)}
            onWatchedChange={() => user && refreshWatched(user.id)} 
        />
      )}

      {showConfirmAll && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1a1a1a] border border-[#ccff00]/30 w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(204,255,0,0.1)] relative">
                  <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
                     <Check size={32} className="text-[#ccff00]" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">مطمئنی همه‌شو دیدی؟</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                       این کار تمام فصل‌ها و اپیزودهای پخش‌شده‌ی <span className="text-[#ccff00] font-bold">{show.name}</span> رو به لیست دیده‌شده‌ها اضافه می‌کنه.
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={handleMarkShowAsWatched}
                        disabled={wholeShowLoading}
                        className="flex-1 bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                          {wholeShowLoading ? <Loader2 className="animate-spin" size={18} /> : 'آره، ثبت کن'}
                      </button>
                      <button onClick={() => setShowConfirmAll(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10">
                          بیخیال
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* --- GAP MODAL (مودال هوشمند اپیزودهای قبلی) --- */}
      {showGapModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#1a1a1a] border border-[#ccff00]/30 w-full max-w-sm rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(204,255,0,0.1)] relative">
                  <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
                     <Check size={32} className="text-[#ccff00]" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">قبلی‌ها رو هم دیدی؟</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                       شما روی قسمت <span className="text-[#ccff00] font-bold">{episodes.find(e => e.id === targetGapEpisode)?.episode_number}</span> کلیک کردید، اما {gapEpisodesToMark.length} قسمت قبلی هنوز تیک نخورده. اون‌ها رو هم تیک بزنم؟
                  </p>
                  <div className="flex gap-3 flex-col">
                      <button 
                        onClick={handleGapConfirm}
                        className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                          آره، همشو دیدم (ثبت {gapEpisodesToMark.length + 1} قسمت)
                      </button>
                      <button 
                        onClick={() => {
                            // فقط همین اپیزود رو تیک بزن و مودال رو ببند
                            if (targetGapEpisode) toggleWatched(targetGapEpisode, true);
                            setShowGapModal(false);
                        }} 
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                      >
                          نه، فقط همین قسمت رو تیک بزن
                      </button>
                      <button onClick={() => setShowGapModal(false)} className="text-xs text-gray-500 mt-2 hover:text-white">
                          کنسل
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[65vh] md:h-[75vh]">
        <div className="absolute inset-0">
            <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover opacity-60" alt={show.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
        </div>
        
        <div className="absolute bottom-0 w-full p-6 md:p-12 flex flex-col md:flex-row gap-8 items-end z-10 pb-20">
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                    <span className="bg-[#ccff00] text-black text-xs font-black px-2 py-1 rounded uppercase">
                        وضعیت: {getStatusText(show.status)}
                    </span>
                    {watchedEpisodes.length > 0 && (
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-[#ccff00]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-[#ccff00]">{progressPercent}% دیدی</span>
                        </div>
                    )}
                </div>

                <h1 className="text-4xl md:text-7xl font-black leading-tight text-white drop-shadow-2xl ltr text-right tracking-tighter">
                    {showEn?.name || show.name}
                </h1>
                <h2 className="text-lg md:text-2xl text-gray-300 font-bold rtl text-right opacity-90">
                    {show.name !== show.original_name ? show.name : ''}
                </h2>
                
                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-gray-300 font-bold ltr">
                    <button 
                        onClick={toggleWatchlist}
                        disabled={watchlistLoading}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all border cursor-pointer active:scale-95 text-xs md:text-sm ${
                            inWatchlist ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                        }`}
                    >
                        {watchlistLoading ? <Loader2 className="animate-spin" size={18} /> : (inWatchlist ? <Check size={18} /> : <Plus size={18} />)}
                        <span>{inWatchlist ? 'در لیست من' : 'افزودن به لیست'}</span>
                    </button>
                    
                    {progressPercent === 100 ? (
                        <span className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-500/20 text-green-400 border border-green-500/30 cursor-default select-none text-xs md:text-sm">
                             <CheckCircle2 size={18} />
                             <span>کامل تماشا شده</span>
                        </span>
                    ) : (
                        <button 
                            onClick={() => setShowConfirmAll(true)}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95 text-xs md:text-sm"
                        >
                            <CheckCircle2 size={18} className="text-gray-400" />
                             <span>کل سریال رو دیدم</span>
                        </button>
                    )}

                    <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-[#ccff00] border border-white/10 transition-all active:scale-95">
                        <Share2 size={18} />
                    </button>

                    <span className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-white/10"><Star size={14} fill="#ccff00" className="text-[#ccff00]" /> {show.vote_average.toFixed(1)}</span>
                    <span>{show.first_air_date?.split('-')[0]}</span>
                    <span>{show.number_of_seasons} فصل</span>
                </div>
            </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 flex gap-8">
              <button 
                onClick={() => setActiveTab('about')}
                className={`py-4 text-sm font-bold relative transition-colors ${activeTab === 'about' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'}`}
              >
                  درباره سریال
                  {activeTab === 'about' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('episodes')}
                className={`py-4 text-sm font-bold relative transition-colors ${activeTab === 'episodes' ? 'text-[#ccff00]' : 'text-gray-400 hover:text-white'}`}
              >
                  اپیزودها
                  {activeTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ccff00] rounded-t-full"></div>}
              </button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 pb-20">
          
          {/* ================= TAB 1: ABOUT (RE-DESIGNED) ================= */}
          {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                  
                  {/* LEFT SIDEBAR (NOW ON LEFT IN LTR GRID, BUT VISUALLY RIGHT IN RTL) */}
                  <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
                      {/* ================= خلاصه داستان ================= */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                                <Info className="text-[#ccff00]" size={18} /> خلاصه داستان
                            </h3>
                            <p className={`text-gray-300 leading-relaxed text-sm md:text-base ${isPersianText(show.overview) ? 'text-justify dir-rtl' : 'text-left dir-ltr font-sans opacity-90'}`}>
                                {show.overview || showEn?.overview || "توضیحی برای این سریال ثبت نشده است."}
                            </p>
                      </div>

                      {/* ================= بازیگران (با هندلینگ عکس) ================= */}
<div>
    <h3 className="font-bold text-gray-200 mb-4">بازیگران</h3>
    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {cast.map((actor: any) => (
            <div key={actor.id} className="flex flex-col items-center w-20 shrink-0">
                {actor.profile_path ? (
                    <img 
                        src={getImageUrl(actor.profile_path)} 
                        className="w-16 h-16 rounded-full object-cover mb-2 border border-white/10" 
                        alt={actor.original_name}
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full mb-2 border border-white/10 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 font-black text-sm tracking-wider">
                        {getInitials(actor.original_name)}
                    </div>
                                    )}
                                    <span className="text-[10px] font-bold text-center line-clamp-1">{actor.original_name}</span>
                                    <span className="text-[9px] text-gray-500 text-center line-clamp-1">{actor.character}</span>
                                </div>
                            ))}
                            {cast.length === 0 && <span className="text-xs text-gray-500">لیست بازیگران ثبت نشده.</span>}
                        </div>
                    </div>

                       {/* ================= مشابه (CAROUSEL) ================= */}
                       <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="font-bold text-white mb-4">مشابه این سریال</h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {similarShows.map((sim) => (
                                    <div key={sim.id} onClick={() => router.push(`/dashboard/tv/${sim.id}`)} className="group relative cursor-pointer w-[120px] shrink-0">
                                        <img src={getImageUrl(sim.poster_path)} className="w-full rounded-lg shadow-md group-hover:scale-105 transition-transform" />
                                        <h4 className="text-[10px] text-center mt-2 text-gray-400 line-clamp-1">{sim.name}</h4>
                                    </div>
                                ))}
                                {similarShows.length === 0 && <span className="text-xs text-gray-500">موردی یافت نشد.</span>}
                            </div>
                       </div>
                  </div>

                  {/* RIGHT SIDEBAR (Sticky on Desktop) */}
                  <div className="space-y-6 order-1 lg:order-2">
                      
                      {/* 🔥🔥 امتیازدهی (RESTORED) 🔥🔥 */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Star className="text-[#ccff00]" size={18} /> امتیازدهی</h3>
                          
                          {/* My Rating */}
                          <div className="mb-6">
                              <p className="text-xs text-gray-400 mb-2 font-bold">امتیاز شما:</p>
                              <div className="flex items-center justify-between" dir="ltr"> 
                                  <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                          <Star 
                                            key={star} 
                                            size={24} 
                                            fill={star <= myRating ? "#ccff00" : "none"} 
                                            className={`cursor-pointer transition-all hover:scale-110 ${star <= myRating ? 'text-[#ccff00]' : 'text-gray-600 hover:text-gray-400'}`}
                                            onClick={() => handleRateShow(star)}
                                          />
                                      ))}
                                  </div>
                                  <span className="text-xl font-black text-[#ccff00]">{myRating > 0 ? myRating : '-'}</span>
                              </div>
                          </div>

                          <div className="w-full h-px bg-white/10 mb-6"></div>

                          {/* Users Rating */}
                          <div>
                              <p className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2">میانگین کاربران Binger <Users size={14} /></p>
                              <div className="flex items-center gap-4" dir="ltr"> 
                                  <div className="flex items-end gap-1">
                                      <span className="text-3xl font-black text-white">{bingerStats.avg > 0 ? bingerStats.avg.toFixed(1) : '-'}</span>
                                      <span className="text-sm text-gray-500 mb-1">/ 5</span>
                                  </div>
                                  <div className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400">
                                      {bingerStats.count} رای
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* 🔥🔥🔥 SMART WHERE TO WATCH 🔥🔥🔥 */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><Play className="text-[#ccff00]" size={18} /> کجا ببینیم؟</h3>
                          <div className="flex gap-4 justify-center flex-wrap">
                               {/* فیلیمو */}
                               <div onClick={() => handlePlatformClick('filimo')} className="relative group">
                                    <PlatformIcon name="فیلیمو" color={platformLinks?.filimo_url ? "bg-yellow-500 border-yellow-400" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} />
                                    {platformLinks?.filimo_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                               </div>
                               {/* نماوا */}
                               <div onClick={() => handlePlatformClick('namava')} className="relative group">
                                    <PlatformIcon name="نماوا" color={platformLinks?.namava_url ? "bg-blue-600 border-blue-400" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} />
                                     {platformLinks?.namava_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                               </div>
                               {/* فیلم نت */}
                               <div onClick={() => handlePlatformClick('filmnet')} className="relative group">
                                   <PlatformIcon name="فیلم‌نت" color={platformLinks?.filmnet_url ? "bg-black border-white/20" : "bg-gray-800 grayscale opacity-70 hover:grayscale-0 hover:opacity-100"} icon={<span className="text-[#e50914] font-black">FN</span>} />
                                   {platformLinks?.filmnet_url && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                               </div>
                               {/* گوگل */}
                               <div onClick={() => handlePlatformClick('google')}><PlatformIcon name="گوگل" color="bg-gray-700" icon={<Search size={20} />} /></div>
                          </div>
                      </div>

                       {/* 🔥🔥 ژانر🔥🔥 */}
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><Tag className="text-[#ccff00]" size={18} /> سبک</h3>
                          <div className="flex flex-wrap gap-2">
                              {show.genres?.map((genre: any, idx: number) => (
                                  <span key={genre.id} className={`px-3 py-1.5 rounded-lg font-bold text-[10px] text-white shadow-lg bg-gradient-to-r ${getGenreColor(idx)}`}>
                                      {genre.name}
                                  </span>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* ================= TAB 2: EPISODES ================= */}
          {activeTab === 'episodes' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12">
                  
                  {/* 1. Continue Tracking */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xl flex items-center gap-2"><Play size={20} className="text-[#ccff00]" /> ادامه تماشا</h3>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={scrollToActiveEpisode}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#ccff00] hover:border-[#ccff00] transition-all ml-2"
                                title="بازگشت به آخرین قسمت دیده شده"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <div className="relative">
                                <select 
                                    value={activeSeason} 
                                    onChange={(e) => handleSeasonChange(Number(e.target.value))}
                                    className="appearance-none bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold py-1.5 pl-8 pr-3 rounded-lg cursor-pointer focus:outline-none focus:border-[#ccff00]"
                                >
                                    {show.seasons
                                        ?.slice() // کپی گرفتن برای سورت
                                        .sort((a: any, b: any) => {
                                            // فصل ۰ بره ته صف
                                            if (a.season_number === 0) return 1;
                                            if (b.season_number === 0) return -1;
                                            return a.season_number - b.season_number;
                                        })
                                        .map((s:any) => (
                                            <option key={s.id} value={s.season_number}>
                                                {/* تغییر اسم فصل ۰ */}
                                                {s.season_number === 0 ? "قسمت‌های ویژه" : `فصل ${s.season_number}`}
                                            </option>
                                        ))
                                    }
                                </select>
                                <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
    
    <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x px-1 items-center scroll-smooth">
        {episodes.map((ep: any) => {
            const isWatched = watchedEpisodes.includes(ep.id);
            return (
                <div id={`ep-${ep.id}`} key={ep.id} className={`snap-start shrink-0 w-64 h-24 bg-[#1a1a1a] rounded-xl border flex items-center overflow-hidden transition-all group relative ${isWatched ? 'border-[#ccff00]/50' : 'border-white/10 hover:border-white/30'}`}>
                    {/* 👇👇👇 بخش اصلاح شده عکس 👇👇👇 */}
                    <div className="w-24 h-full relative cursor-pointer bg-[#111]" onClick={() => setSelectedEp(ep)}>
                        {ep.still_path ? (
                            <img 
                                src={getImageUrl(ep.still_path)} 
                                className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale opacity-60'}`} 
                                loading="lazy"
                            />
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center ${isWatched ? 'bg-[#ccff00]/10' : 'bg-white/5'}`}>
                                <span className={`font-black text-[10px] tracking-widest ${isWatched ? 'text-[#ccff00]' : 'text-gray-600'}`}>بدون تصویر</span>
                            </div>
                        )}
                    </div>
                    {/* 👆👆👆 پایان بخش اصلاح شده 👆👆👆 */}

                    <div className="flex-1 px-3 flex flex-col justify-center cursor-pointer" onClick={() => setSelectedEp(ep)}>
                        <span className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">E{ep.episode_number}</span>
                        <h4 className={`text-xs font-bold line-clamp-2 ${isWatched ? 'text-[#ccff00]' : 'text-gray-200'}`}>{ep.name}</h4>
                    </div>
                    {isReleased(ep.air_date) && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-75 ${isWatched ? 'bg-[#ccff00] border-[#ccff00]' : 'border-gray-600 hover:border-white opacity-0 group-hover:opacity-100'}`}
                            >
                                {isWatched && <Check size={16} className="text-black" strokeWidth={3} />}
                            </button>
                        </div>
                    )}
                </div>
            )
        })}

        <div className="snap-start shrink-0 w-48 h-24 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-center p-4">
            {show.status === "Ended" && activeSeason === show.number_of_seasons ? (
                <>
                    <div className="text-2xl animate-bounce">🥕</div>
                    <span className="text-xs font-bold text-[#ccff00]">تموم شد! خسته نباشید</span>
                </>
            ) : (
                <>
                    <div className="text-2xl">⏳</div>
                    <span className="text-xs font-bold text-white">منتظر فصل بعد...</span>
                </>
            )}
        </div>
    </div>
</div>

                  {/* 2. All Episodes List */}
                  <div>
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-xl">لیست کامل اپیزودها</h3>
                      </div>

                      <div className="space-y-4">
                        {show.seasons
                            ?.slice() // یک کپی از آرایه می‌گیریم تا اصلی خراب نشه
                            .sort((a: any, b: any) => {
                                // منطق: اگر فصل 0 بود، بفرستش ته لیست (return 1)
                                if (a.season_number === 0) return 1;
                                if (b.season_number === 0) return -1;
                                return a.season_number - b.season_number; // بقیه فصل‌ها به ترتیب
                            })
                            .map((season: any) => {
                                const isExpanded = expandedSeasons.has(season.season_number);
                                const isLoading = seasonLoading[season.season_number];
                                const loadedSeasonEpisodes = allSeasonsData[season.season_number] || [];
                                const hasData = loadedSeasonEpisodes.length > 0;
                                
                                // اگر کل سریال تمام شده یا این فصل کامل دیده شده
                                const isFullyWatched = isShowCompleted || (hasData && loadedSeasonEpisodes.every((ep:any) => 
                                    !isReleased(ep.air_date) || watchedEpisodes.includes(ep.id)
                                ));

                                return (
                                    <div key={season.id} className="border border-white/10 rounded-2xl overflow-hidden bg-[#111]">
                                        <div 
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => toggleAccordion(season.season_number)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden">
                                                    {season.poster_path ? (
                                                        <img src={getImageUrl(season.poster_path)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-white/10 text-[8px] text-gray-500">بدون تصویر</div>
                                                    )}
                                                </div>
                                                <div>
                                                    {/* 👇 تغییر نام فصل صفر 👇 */}
                                                    <h4 className="font-bold text-white">
                                                        {season.season_number === 0 ? " پشت صحنه " : `فصل ${season.season_number}`}
                                                    </h4>
                                                    <span className="text-xs text-gray-500">{season.episode_count} قسمت</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button 
                                                onClick={(e) => { e.stopPropagation(); toggleSeasonWatched(season.season_number, allSeasonsData[season.season_number]); }}
                                                disabled={isLoading}
                                                className={`text-xs font-bold border px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                                                    isFullyWatched 
                                                    ? 'bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' 
                                                    : 'text-gray-400 hover:text-[#ccff00] border-white/10 hover:border-[#ccff00]'
                                                }`}
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : isFullyWatched ? (
                                                        <><Check size={14} strokeWidth={3} /> کامل دیدم</>
                                                    ) : (
                                                        'شخم زدم (کل فصل)'
                                                    )}
                                                </button>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-white/5 bg-black/20">
                                                {allSeasonsData[season.season_number] ? (
                                                    allSeasonsData[season.season_number].map((ep: any) => {
                                                        const isWatched = watchedEpisodes.includes(ep.id);
                                                        return (
                                                            <div key={ep.id} className="flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 group cursor-pointer" onClick={() => setSelectedEp(ep)}>
                                                                <div className="w-16 h-10 bg-gray-800 rounded overflow-hidden shrink-0">
                                                                    {ep.still_path ? (
                                                                        <img 
                                                                            src={getImageUrl(ep.still_path)} 
                                                                            className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale'}`} 
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                                            <span className="text-[8px] font-black text-gray-600">NO IMG</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="w-8 text-center text-sm font-bold text-gray-500">{ep.episode_number}</div>
                                                                <div className="flex-1">
                                                                    <h5 className={`text-sm font-bold ${isWatched ? 'text-[#ccff00]' : 'text-gray-200'}`}>{ep.name}</h5>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{ep.air_date}</span>
                                                                        <span className="text-[10px] text-gray-500">{ep.runtime}m</span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }}
                                                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-90 ${isWatched ? 'bg-[#ccff00] border-[#ccff00]' : 'border-gray-600 hover:border-white opacity-0 group-hover:opacity-100'}`}
                                                                >
                                                                    {isWatched && <Check size={16} className="text-black" />}
                                                                </button>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#ccff00]" /></div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
    })}
</div>
                  </div>
              </div>
          )}

      </div>

      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 animate-in fade-in" onClick={() => setShowShareModal(false)}>
              <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="relative aspect-[9/16] bg-gray-900">
                      <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 w-full p-8 flex flex-col items-center text-center">
                          <img src={getImageUrl(show.poster_path)} className="w-24 h-24 rounded-full border-4 border-[#ccff00] mb-4 shadow-[0_0_20px_#ccff00]" />
                          <h3 className="text-2xl font-black text-white mb-2">{showEn?.name || show.name}</h3>
                          <p className="text-[#ccff00] font-bold text-xs bg-[#ccff00]/10 px-4 py-1.5 rounded-full mb-6">مشاهده آنالیز و وضعیت تماشا در Binger 😎</p>
                          <div className="grid grid-cols-2 gap-8 w-full border-t border-white/10 pt-4">
                               <div><span className="block text-xl font-black">{show.number_of_seasons}</span><span className="text-[9px] text-gray-500">SEASONS</span></div>
                               <div><span className="block text-xl font-black">{show.vote_average.toFixed(1)}</span><span className="text-[9px] text-gray-500">RATING</span></div>
                          </div>
                      </div>
                  </div>
                  <button onClick={() => setShowShareModal(false)} className="w-full bg-[#ccff00] text-black py-4 font-black text-sm hover:bg-[#b3e600]">استوری کن</button>
              </div>
          </div>
      )}

    </div>
  );
}