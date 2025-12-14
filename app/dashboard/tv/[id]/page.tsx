"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getShowDetails, getSeasonDetails, getImageUrl, getBackdropUrl, getSimilarShows, BASE_URL, API_KEY } from '@/lib/tmdbClient';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, Star, Calendar, Clock, Loader2, CheckCheck, Plus, Check, MessageSquare, Hourglass, Share2, Play, Info, RotateCcw, ChevronDown, ChevronUp, Heart, Activity, BarChart2, Search, Users, Tag, AlertTriangle, CheckCircle2, X, ChevronLeft } from 'lucide-react';
import EpisodeModal from '../../components/EpisodeModal';
import confetti from 'canvas-confetti'; 

// --- SKELETON LOADER ---
const SkeletonPage = () => (
  <div className="min-h-screen bg-[#050505] animate-pulse pb-20">
    <div className="w-full h-[50vh] bg-white/5"></div>
    <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
       <div className="flex gap-8 items-end">
           <div className="w-48 h-72 bg-white/10 rounded-2xl hidden md:block"></div>
           <div className="flex-1 space-y-4">
               <div className="w-3/4 h-12 bg-white/10 rounded-xl"></div>
               <div className="w-1/2 h-6 bg-white/10 rounded-lg"></div>
           </div>
       </div>
    </div>
  </div>
);

// --- COMPONENT: PLATFORM ICON ---
const PlatformIcon = ({ name, color, icon }: any) => (
    <div className="flex flex-col items-center gap-2 group cursor-pointer">
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl border border-white/5`}>
            {icon ? icon : <span className="font-black text-[10px] uppercase tracking-wider">{name.substring(0, 3)}</span>}
        </div>
        <span className="text-[10px] text-gray-400 font-medium group-hover:text-white transition-colors">{name}</span>
    </div>
);

const getGenreColor = (index: number) => {
    const colors = ['from-pink-500 to-rose-500', 'from-purple-500 to-indigo-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];
    return colors[index % colors.length];
};

export default function ShowDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

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

  // --- Poll & Ratings ---
  const [similarShows, setSimilarShows] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0); 
  const [bingerStats, setBingerStats] = useState({ avg: 0, count: 0 });
  const [userVote, setUserVote] = useState<string | null>(null);
  const [pollStats, setPollStats] = useState<any>({}); 
  const [totalVotes, setTotalVotes] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

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

  // --- Fetching Logic ---
  const fetchPollData = async (currentUserId: string) => {
      const { data: myVote } = await supabase.from('poll_votes').select('tag').eq('user_id', currentUserId).eq('show_id', showId).single();
      if (myVote) setUserVote(myVote.tag);

      const { data: allVotes } = await supabase.from('poll_votes').select('tag').eq('show_id', showId);
      if (allVotes) {
          const stats: any = {};
          allVotes.forEach((v: any) => { stats[v.tag] = (stats[v.tag] || 0) + 1; });
          setPollStats(stats);
          setTotalVotes(allVotes.length);
      }
  };

  const fetchBingerStats = async () => {
      const { data } = await supabase.from('show_ratings').select('rating').eq('show_id', showId);
      if (data && data.length > 0) {
          const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
          setBingerStats({ avg: sum / data.length, count: data.length });
      } else {
          setBingerStats({ avg: 0, count: 0 });
      }
  };

  const handlePollVote = async (tag: string) => {
      if (!user) return;
      const previousVote = userVote;
      const isDeselecting = previousVote === tag;
      const newVote = isDeselecting ? null : tag;
      
      setUserVote(newVote);
      setPollStats((prev: any) => {
          const next = { ...prev };
          if (previousVote) next[previousVote] = Math.max(0, (next[previousVote] || 1) - 1);
          if (!isDeselecting) next[tag] = (next[tag] || 0) + 1;
          return next;
      });
      setTotalVotes(prev => isDeselecting ? prev - 1 : (previousVote ? prev : prev + 1));

      if (isDeselecting) {
          await supabase.from('poll_votes').delete().eq('user_id', user.id).eq('show_id', showId);
      } else {
          await supabase.from('poll_votes').upsert({ user_id: user.id, show_id: showId, tag });
      }
  };

  const refreshWatched = async (userId: string) => {
    const { data } = await supabase.from('watched').select('episode_id').eq('user_id', userId).eq('show_id', showId);
    if (data) setWatchedEpisodes(data.map((item: any) => item.episode_id));
  };

  const fetchRatings = async (userId: string) => {
    const { data: myR } = await supabase.from('show_ratings').select('rating').eq('user_id', userId).eq('show_id', showId);
    if (myR && myR.length > 0) setMyRating(myR[0].rating);
  };

  const fetchWatchlist = async (userId: string) => {
      const { data } = await supabase.from('watchlist').select('*').eq('user_id', userId).eq('show_id', showId);
      if (data && data.length > 0) setInWatchlist(true);
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

  useEffect(() => {
    const initData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { window.location.href = '/login'; return; }
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
      setSimilarShows(similarData);

      const { data: commentsData } = await supabase.from('comments').select('*').eq('show_id', showId).is('episode_id', null).order('created_at', { ascending: false });
      if (commentsData) setComments(commentsData);

      await Promise.all([
          refreshWatched(currentUser.id), 
          fetchRatings(currentUser.id), 
          fetchWatchlist(currentUser.id),
          fetchPollData(currentUser.id),
          fetchBingerStats() 
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

  const toggleWatched = async (episodeId: number) => {
    if (!user) return;
    const isWatched = watchedEpisodes.includes(episodeId);
    let newWatchedList: number[]; 

    if (isWatched) {
      newWatchedList = watchedEpisodes.filter(id => id !== episodeId);
      setWatchedEpisodes(newWatchedList);
      await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', episodeId);
    } else {
      newWatchedList = [...watchedEpisodes, episodeId];
      setWatchedEpisodes(newWatchedList);
      await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: episodeId }]);
      const released = episodes.filter(ep => isReleased(ep.air_date)).map(e => e.id);
      if (released.every(id => newWatchedList.includes(id))) triggerCelebration();
    }
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
      const newIdsToInsert = seasonEpisodeIds.filter((id:number) => !watchedEpisodes.includes(id)).map((id:number) => ({ user_id: user.id, show_id: Number(showId), episode_id: id }));
      if (newIdsToInsert.length > 0) {
        newIdsToInsert.forEach(item => newWatchedList.push(item.episode_id));
        setWatchedEpisodes(newWatchedList);
        await supabase.from('watched').upsert(newIdsToInsert, { onConflict: 'user_id, episode_id' }); 
        triggerCelebration(); 
      }
    }
    setSeasonLoading(prev => ({...prev, [seasonNum]: false}));
  };

  // --- 🔥 FIX: "Whole Show" Sync Logic ---
  const handleMarkShowAsWatched = async () => {
      if(!user || !show) return;
      setWholeShowLoading(true);
      
      try {
          const seasonPromises = show.seasons
            .filter((s:any) => s.season_number > 0)
            .map((s:any) => getSeasonDetails(showId, s.season_number));
          
          const allSeasonsResults = await Promise.all(seasonPromises);
          
          // 🔥 NEW: Inject data into State immediately!
          // This fixes the bug where buttons don't update until expanded.
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

          // Chunking (Batch of 20)
          const chunkSize = 20; 
          for (let i = 0; i < records.length; i += chunkSize) {
              const chunk = records.slice(i, i + chunkSize);
              const { error } = await supabase.from('watched').upsert(chunk, { onConflict: 'user_id, episode_id' });
              
              if (error) {
                  console.error("Supabase Upsert Error:", error);
                  throw new Error(`خطا در دیتابیس: ${error.message}`);
              }
          }
          
          setWatchedEpisodes(prev => {
              const unique = new Set([...prev, ...idsToMark]);
              return Array.from(unique);
          });
          triggerCelebration();
          setShowConfirmAll(false); 

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
        await supabase.from('watchlist').insert([{ user_id: user.id, show_id: Number(showId) }]);
    }
    setWatchlistLoading(false);
  };

  const handleSendComment = async () => {
    if (!user || !newComment.trim()) return;
    setCommentLoading(true);
    const commentObj = { user_id: user.id, show_id: Number(showId), content: newComment, email: user.email };
    const { data } = await supabase.from('comments').insert([commentObj]).select();
    if (data) {
        setComments([data[0], ...comments]);
        setNewComment("");
    }
    setCommentLoading(false);
  };

  const handleRateShow = async (rating: number) => {
    if (!user) return;
    setMyRating(rating);
    await supabase.from('show_ratings').upsert({ user_id: user.id, show_id: Number(showId), rating: rating }, { onConflict: 'user_id, show_id' });
    fetchBingerStats(); 
  };

  if (loading) return <SkeletonPage />;
  if (!show) return <div className="text-white text-center mt-20">سریال پیدا نشد!</div>;

  const totalReleasedEpisodes = show.number_of_episodes; 
  const progressPercent = Math.min(100, Math.round((watchedEpisodes.length / totalReleasedEpisodes) * 100)) || 0;

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
                      <button 
                        onClick={() => setShowConfirmAll(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                      >
                          بیخیال
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
        
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
             <button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all border border-white/5"><ArrowRight size={20} /></button>
             <button onClick={() => setShowShareModal(true)} className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all border border-white/5 text-[#ccff00]"><Share2 size={20} /></button>
        </div>

        <div className="absolute bottom-0 w-full p-6 md:p-12 flex flex-col md:flex-row gap-8 items-end z-10 pb-20">
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                    <span className="bg-[#ccff00] text-black text-xs font-black px-2 py-1 rounded uppercase">{show.status === "Ended" ? "پایان یافته" : "در حال پخش"}</span>
                    {watchedEpisodes.length > 0 && (
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-[#ccff00]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-[#ccff00]">{progressPercent}% دیدی</span>
                        </div>
                    )}
                </div>

                <h1 className="text-5xl md:text-7xl font-black leading-tight text-white drop-shadow-2xl ltr text-left tracking-tighter">
                    {showEn?.name || show.name}
                </h1>
                <h2 className="text-xl md:text-2xl text-gray-300 font-bold ltr text-left opacity-90">
                    {show.name !== show.original_name ? show.name : ''}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 font-bold ltr">
                    <button 
                        onClick={toggleWatchlist}
                        disabled={watchlistLoading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all border cursor-pointer active:scale-95 ${
                            inWatchlist ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                        }`}
                    >
                        {watchlistLoading ? <Loader2 className="animate-spin" size={18} /> : (inWatchlist ? <Check size={18} /> : <Plus size={18} />)}
                        <span>{inWatchlist ? 'تو صف تماشا' : 'می‌خوام ببینم'}</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowConfirmAll(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all active:scale-95"
                    >
                        <CheckCircle2 size={18} className={progressPercent === 100 ? "text-[#ccff00]" : "text-gray-400"} />
                        <span>کل سریال رو دیدم</span>
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

      <div className="max-w-7xl mx-auto px-6 mt-8 pb-20">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="lg:col-span-2 space-y-8">
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                           <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Info className="text-[#ccff00]" size={18} /> خلاصه داستان</h3>
                           <p className="text-gray-300 leading-relaxed text-sm md:text-base text-justify">
                               {show.overview || "توضیحی برای این سریال ثبت نشده است."}
                           </p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Star className="text-[#ccff00]" size={18} /> امتیازدهی</h3>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-2 font-bold">امتیاز شما:</p>
                                  <div className="flex items-center gap-4">
                                      <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                              <Star 
                                                key={star} 
                                                size={28} 
                                                fill={star <= myRating ? "#ccff00" : "none"} 
                                                className={`cursor-pointer transition-all hover:scale-110 ${star <= myRating ? 'text-[#ccff00]' : 'text-gray-600 hover:text-gray-400'}`}
                                                onClick={() => handleRateShow(star)}
                                              />
                                          ))}
                                      </div>
                                      <span className="text-xl font-black text-[#ccff00]">{myRating > 0 ? myRating : '-'}</span>
                                  </div>
                              </div>
                              <div className="w-full md:w-px h-px md:h-12 bg-white/10"></div>
                              <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2">امتیاز کاربران بینجر <Users size={14} /></p>
                                  <div className="flex items-center gap-4">
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
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><BarChart2 className="text-[#ccff00]" size={18} /> چه چیزی از این سریال تورو به وجد آورد؟</h3>
                          <div className="space-y-3">
                              {['بازیگران', 'داستان', 'فیلمبرداری', 'موسیقی', 'پایان‌بندی'].map(tag => {
                                  const count = pollStats[tag] || 0;
                                  const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                  const isSelected = userVote === tag;
                                  return (
                                      <div 
                                        key={tag} 
                                        onClick={() => handlePollVote(tag)}
                                        className={`relative h-12 rounded-xl overflow-hidden cursor-pointer border transition-all active:scale-98 ${isSelected ? 'border-[#ccff00]' : 'border-white/10 hover:border-white/30'}`}
                                      >
                                          <div className={`absolute top-0 right-0 h-full transition-all duration-700 ease-out ${isSelected ? 'bg-[#ccff00]/20' : 'bg-white/5'}`} style={{ width: `${percent}%` }}></div>
                                          <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                                              <span className={`font-bold text-sm ${isSelected ? 'text-[#ccff00]' : 'text-gray-300'}`}>{tag}</span>
                                              <span className={`font-bold text-xs ${isSelected ? 'text-[#ccff00]' : 'text-gray-500'}`}>{count > 0 ? `${percent}%` : ''}</span>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2 text-center">برای تغییر رای، مجدد کلیک کنید.</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><Tag className="text-[#ccff00]" size={18} /> سبک و حال‌وهوا</h3>
                          <div className="flex flex-wrap gap-3">
                              {show.genres?.map((genre: any, idx: number) => (
                                  <span key={genre.id} className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg bg-gradient-to-r ${getGenreColor(idx)}`}>
                                      {genre.name}
                                  </span>
                              ))}
                          </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><Play className="text-[#ccff00]" size={18} /> کجا ببینیم؟</h3>
                          <div className="flex gap-4 md:gap-6 justify-center flex-wrap">
                              <PlatformIcon name="فیلیمو" color="bg-yellow-500" />
                              <PlatformIcon name="نماوا" color="bg-blue-600" />
                              <PlatformIcon name="فیلم‌نت" color="bg-black border-white/20" icon={<span className="text-[#e50914] font-black">FN</span>} />
                              <PlatformIcon name="بامابین" color="bg-yellow-400 text-black" icon={<span className="text-black font-black">BM</span>} />
                              <PlatformIcon name="گوگل" color="bg-gray-700" icon={<Search size={20} />} />
                          </div>
                      </div>

                      <div>
                          <h3 className="font-bold text-gray-200 mb-4">بازیگران</h3>
                          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                              {cast.map((actor: any) => (
                                  <div key={actor.id} className="flex flex-col items-center w-20 shrink-0">
                                      <img src={getImageUrl(actor.profile_path)} className="w-16 h-16 rounded-full object-cover mb-2 border border-white/10" />
                                      <span className="text-[10px] font-bold text-center line-clamp-1">{actor.original_name}</span>
                                      <span className="text-[9px] text-gray-500 text-center line-clamp-1">{actor.character}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div>
                          <h3 className="font-bold text-gray-200 mb-4">نظرات کاربران</h3>
                          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-0 overflow-hidden">
                            <div className="h-[300px] overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 animate-in slide-in-from-bottom-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">{comment.email[0].toUpperCase()}</div>
                                        <div className="bg-[#2a2a2a] p-3 rounded-2xl rounded-tr-none border border-white/5 max-w-[85%]">
                                            <div className="flex justify-between items-baseline mb-1 gap-4">
                                                <span className="text-[10px] font-bold text-[#ccff00] opacity-80">{comment.email.split('@')[0]}</span>
                                            </div>
                                            <p className="text-xs text-gray-200 leading-relaxed dir-rtl text-right">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && <div className="text-center text-gray-500 py-10 text-xs">هنوز پیامی نیست. شروع کننده باش!</div>}
                            </div>
                            <div className="p-3 bg-white/5 border-t border-white/5">
                                <div className="relative">
                                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="پیام بگذارید..." className="w-full bg-black/50 border border-white/10 rounded-full py-2.5 px-4 text-xs text-white focus:border-[#ccff00] transition-all pr-10" />
                                    <button onClick={handleSendComment} disabled={!newComment.trim()} className="absolute left-1.5 top-1.5 p-1.5 bg-[#ccff00] text-black rounded-full hover:bg-[#b3e600] disabled:opacity-50 cursor-pointer">
                                        {commentLoading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-8">
                       <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="font-bold text-white mb-4">مشابه این سریال</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {similarShows.slice(0, 4).map((sim) => (
                                    <div key={sim.id} onClick={() => router.push(`/dashboard/tv/${sim.id}`)} className="group relative cursor-pointer">
                                        <img src={getImageUrl(sim.poster_path)} className="w-full rounded-lg shadow-md group-hover:scale-105 transition-transform" />
                                    </div>
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
                                
                                {/* 🔥 DROPDOWN FOR SEASONS (Simpsons Proof) */}
                                <div className="relative">
                                    <select 
                                        value={activeSeason} 
                                        onChange={(e) => handleSeasonChange(Number(e.target.value))}
                                        className="appearance-none bg-[#1a1a1a] border border-white/10 text-white text-xs font-bold py-1.5 pl-8 pr-3 rounded-lg cursor-pointer focus:outline-none focus:border-[#ccff00]"
                                    >
                                        {show.seasons?.filter((s:any) => s.season_number > 0).map((s:any) => (
                                            <option key={s.id} value={s.season_number}>فصل {s.season_number}</option>
                                        ))}
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
                                       <div className="w-24 h-full relative cursor-pointer" onClick={() => setSelectedEp(ep)}>
                                           <img src={getImageUrl(ep.still_path)} className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale opacity-60'}`} />
                                       </div>
                                       <div className="flex-1 px-3 flex flex-col justify-center cursor-pointer" onClick={() => setSelectedEp(ep)}>
                                            <span className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">E{ep.episode_number}</span>
                                            <h4 className={`text-xs font-bold line-clamp-2 ${isWatched ? 'text-[#ccff00]' : 'text-gray-200'}`}>{ep.name}</h4>
                                       </div>
                                       {isReleased(ep.air_date) && (
                                           <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }}
                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-75 ${isWatched ? 'bg-[#ccff00] border-[#ccff00]' : 'border-gray-600 hover:border-white'}`}
                                                >
                                                    {isWatched && <Check size={16} className="text-black" strokeWidth={3} />}
                                                </button>
                                           </div>
                                       )}
                                   </div>
                               )
                           })}

                           {/* --- END CARD --- */}
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
                          {show.seasons?.filter((s:any) => s.season_number > 0).map((season: any) => {
                              const isExpanded = expandedSeasons.has(season.season_number);
                              const isLoading = seasonLoading[season.season_number];
                              
                              const loadedSeasonEpisodes = allSeasonsData[season.season_number] || [];
                              const hasData = loadedSeasonEpisodes.length > 0;
                              // 🔥 Fix for button state: Check if fully watched based on the now-loaded data
                              const isFullyWatched = hasData && loadedSeasonEpisodes.every((ep:any) => 
                                  !isReleased(ep.air_date) || watchedEpisodes.includes(ep.id)
                              );

                              return (
                                  <div key={season.id} className="border border-white/10 rounded-2xl overflow-hidden bg-[#111]">
                                      <div 
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => toggleAccordion(season.season_number)}
                                      >
                                          <div className="flex items-center gap-4">
                                              <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden"><img src={getImageUrl(season.poster_path)} className="w-full h-full object-cover" /></div>
                                              <div>
                                                  <h4 className="font-bold text-white">فصل {season.season_number}</h4>
                                                  <span className="text-xs text-gray-500">{season.episode_count} قسمت</span>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              {/* --- Season Button --- */}
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
                                                                  <img src={getImageUrl(ep.still_path)} className={`w-full h-full object-cover ${isWatched ? '' : 'grayscale'}`} />
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