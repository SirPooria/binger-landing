"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getShowDetails, getSeasonDetails, getImageUrl, getBackdropUrl, getSimilarShows } from '@/lib/tmdbClient';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, Star, Calendar, Clock, Loader2, CheckCircle, CheckCheck, Plus, Bookmark, Check, MessageSquare, Hourglass } from 'lucide-react';
import EpisodeModal from '../../components/EpisodeModal';

export default function ShowDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [show, setShow] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEp, setSelectedEp] = useState<any>(null);

  // --- وضعیت‌های جدید ---
  const [similarShows, setSimilarShows] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0); 
  
  // ⚠️ فیکس ارور تایپ: تعریف دقیق نوع votes
  const [communityRatings, setCommunityRatings] = useState<{ 
      average: number; 
      count: number; 
      votes: Record<number, number>; 
  }>({ 
      average: 0, 
      count: 0, 
      votes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } 
  });
  
  // Watchlist & Bulk
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Comments (کلی)
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // --- توابع کمکی ---

  const refreshWatched = async (userId: string) => {
    const { data: watchedData } = await supabase.from('watched').select('episode_id').eq('user_id', userId).eq('show_id', showId);
    if (watchedData) setWatchedEpisodes(watchedData.map((item: any) => item.episode_id));
  };

  const fetchRatings = async (userId: string) => {
    // 1. گرفتن امتیاز من
    const { data: myR } = await supabase.from('show_ratings').select('rating').eq('user_id', userId).eq('show_id', showId);
    if (myR && myR.length > 0) setMyRating(myR[0].rating);

    // 2. گرفتن آمار کامیونیتی
    const { data: allR } = await supabase.from('show_ratings').select('rating').eq('show_id', showId);
    if (allR && allR.length > 0) {
        const count = allR.length;
        let sum = 0;
        const votes: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allR.forEach((r) => {
            sum += r.rating;
            votes[r.rating] = (votes[r.rating] || 0) + 1;
        });
        setCommunityRatings({ average: sum / count, count: count, votes: votes });
    }
  };

  const fetchWatchlist = async (userId: string) => {
      const { data: watchlistData } = await supabase.from('watchlist').select('*').eq('user_id', userId).eq('show_id', showId);
      if (watchlistData && watchlistData.length > 0) setInWatchlist(true);
  };

  // --- لود اولیه داده‌ها ---
  useEffect(() => {
    const initData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { window.location.href = '/login'; return; }
      setUser(currentUser); 

      const details = await getShowDetails(showId);
      setShow(details);
      
      if (details) {
        const season1 = await getSeasonDetails(showId, 1);
        setEpisodes(season1?.episodes || []);
      }
      
      const fetchSimilar = async () => {
          const similarData = await getSimilarShows(showId);
          setSimilarShows(similarData);
      };

      const fetchShowComments = async () => {
          const { data: commentsData } = await supabase.from('comments').select('*').eq('show_id', showId).is('episode_id', null).order('created_at', { ascending: false });
          if (commentsData) setComments(commentsData);
      };

      await Promise.all([
          refreshWatched(currentUser.id),
          fetchSimilar(),
          fetchRatings(currentUser.id), 
          fetchWatchlist(currentUser.id),
          fetchShowComments()
      ]);

      setLoading(false);
    };

    if (showId) initData();
  }, [showId]);

  // --- اکشن‌ها ---

  const handleRateShow = async (rating: number) => {
    if (!user) return;
    setMyRating(rating);
    await supabase.from('show_ratings').upsert({ user_id: user.id, show_id: Number(showId), rating: rating }, { onConflict: 'user_id, show_id' });
    await fetchRatings(user.id); 
  };

  const handleSeasonChange = async (seasonNumber: number) => {
    setActiveSeason(seasonNumber);
    setEpisodes([]); 
    const seasonData = await getSeasonDetails(showId, seasonNumber);
    setEpisodes(seasonData?.episodes || []);
  };

  const isReleased = (dateString: string) => {
    if (!dateString) return false;
    return new Date(dateString) <= new Date();
  };

  const toggleWatched = async (episodeId: number) => {
    if (!user) return;
    const isWatched = watchedEpisodes.includes(episodeId);
    let newWatchedList;
    if (isWatched) {
      newWatchedList = watchedEpisodes.filter(id => id !== episodeId);
      await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', episodeId);
    } else {
      newWatchedList = [...watchedEpisodes, episodeId];
      await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: episodeId }]);
    }
    setWatchedEpisodes(newWatchedList);
  };

  const toggleSeasonWatched = async () => {
    if (!user || episodes.length === 0) return;
    const releasedEpisodes = episodes.filter(ep => isReleased(ep.air_date));
    if (releasedEpisodes.length === 0) return;

    setBulkLoading(true);
    const seasonEpisodeIds = releasedEpisodes.map(ep => ep.id);
    const allWatched = seasonEpisodeIds.every(id => watchedEpisodes.includes(id));
    let newWatchedList = [...watchedEpisodes];

    if (allWatched) {
      newWatchedList = newWatchedList.filter(id => !seasonEpisodeIds.includes(id));
      await supabase.from('watched').delete().eq('user_id', user.id).in('episode_id', seasonEpisodeIds);
    } else {
      const newIdsToInsert = seasonEpisodeIds
        .filter(id => !watchedEpisodes.includes(id))
        .map(id => ({ user_id: user.id, show_id: Number(showId), episode_id: id }));
      
      if (newIdsToInsert.length > 0) {
        await supabase.from('watched').insert(newIdsToInsert);
        newIdsToInsert.forEach(item => newWatchedList.push(item.episode_id));
      }
    }
    setWatchedEpisodes(newWatchedList);
    setBulkLoading(false);
  };
  
  const toggleWatchlist = async () => {
    if (!user) return;
    setWatchlistLoading(true);
    if (inWatchlist) {
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
        setInWatchlist(false);
    } else {
        await supabase.from('watchlist').insert([{ user_id: user.id, show_id: Number(showId) }]);
        setInWatchlist(true);
    }
    setWatchlistLoading(false);
  };

  const handleSendComment = async () => {
    if (!user || !newComment.trim()) return;
    setCommentLoading(true);
    const commentObj = { user_id: user.id, show_id: Number(showId), content: newComment, email: user.email };
    const { data, error } = await supabase.from('comments').insert([commentObj]).select();
    if (!error && data) {
        setComments([data[0], ...comments]);
        setNewComment("");
    }
    setCommentLoading(false);
  };

  const getDaysLeft = (dateString: string) => {
      const diff = new Date(dateString).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days > 0 ? days + "d" : "Soon";
  };

  const getRatingBar = (rating: number) => {
      // ⚠️ فیکس نهایی ارور: استفاده از state تایپ شده
      const percent = communityRatings.count > 0 ? (communityRatings.votes[rating] / communityRatings.count) * 100 : 0;
      const color = rating >= 4 ? 'bg-green-500' : (rating >= 3 ? 'bg-yellow-500' : 'bg-red-500');
      return (
          <div key={rating} className="flex items-center gap-2">
              <span className="text-sm text-gray-400 w-4">{rating}</span>
              <Star size={12} fill="#ccff00" className="text-[#ccff00]" />
              <div className="flex-1 h-2 bg-white/10 rounded-full">
                  <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percent}%` }}></div>
              </div>
              <span className="text-xs text-gray-400 w-6 text-left ltr">{Math.round(percent)}%</span>
          </div>
      );
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;
  if (!show) return <div className="text-white text-center mt-20">سریال پیدا نشد!</div>;

  const releasedEpisodes = episodes.filter(ep => isReleased(ep.air_date));
  const isSeasonFullyWatched = releasedEpisodes.length > 0 && releasedEpisodes.every(ep => watchedEpisodes.includes(ep.id));

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-20">
      
      {/* Modal Integration */}
      {selectedEp && (
        <EpisodeModal 
            showId={showId}
            seasonNum={activeSeason}
            episodeNum={selectedEp.episode_number}
            onClose={() => setSelectedEp(null)}
            onWatchedChange={() => user && refreshWatched(user.id)} 
        />
      )}

      {/* HERO SECTION */}
      <div className="relative w-full h-[50vh] md:h-[60vh]">
        <div className="absolute inset-0">
            <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover opacity-50" alt={show.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
        </div>
        <button onClick={() => router.back()} className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all cursor-pointer">
            <ArrowRight size={24} />
        </button>
        <div className="absolute bottom-0 w-full p-6 md:p-12 flex flex-col md:flex-row gap-8 items-end">
            <img src={getImageUrl(show.poster_path)} className="w-32 md:w-48 rounded-2xl shadow-2xl border border-white/10 hidden md:block" alt={show.name} />
            <div className="flex-1 mb-4">
                <h1 className="text-4xl md:text-6xl font-black mb-4 text-white drop-shadow-lg">{show.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-6">
                    <div className="flex items-center gap-1 text-[#ccff00] font-bold bg-[#ccff00]/10 px-2 py-1 rounded-md">
                        <Star size={14} fill="#ccff00" /> {show.vote_average.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1"><Calendar size={14} /> {show.first_air_date?.split('-')[0]}</div>
                    <div className="flex items-center gap-1"><Clock size={14} /> {show.number_of_seasons} فصل</div>
                    <button 
                        onClick={toggleWatchlist}
                        disabled={watchlistLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm transition-all border cursor-pointer ${
                            inWatchlist ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        }`}
                    >
                        {watchlistLoading ? <Loader2 className="animate-spin" size={16} /> : (inWatchlist ? <Check size={16} /> : <Plus size={16} />)}
                        <span>{inWatchlist ? 'در لیست تماشا' : 'افزودن به لیست'}</span>
                    </button>
                </div>
                <p className="text-gray-300 max-w-2xl leading-relaxed text-sm md:text-base line-clamp-3 md:line-clamp-none">
                    {show.overview || "توضیحاتی ثبت نشده."}
                </p>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ستون راست: اپیزودها */}
        <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex gap-3 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                    {show.seasons?.filter((s:any) => s.season_number > 0).map((season: any) => (
                        <button
                            key={season.id}
                            onClick={() => handleSeasonChange(season.season_number)}
                            className={`px-5 py-2 rounded-xl whitespace-nowrap transition-all font-bold text-sm cursor-pointer ${activeSeason === season.season_number ? 'bg-[#ccff00] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            فصل {season.season_number}
                        </button>
                    ))}
                </div>
                {releasedEpisodes.length > 0 && (
                    <button 
                        onClick={toggleSeasonWatched}
                        disabled={bulkLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all w-full md:w-auto justify-center cursor-pointer ${
                            isSeasonFullyWatched ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/30 hover:bg-[#ccff00]/20' : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/5'
                        }`}
                    >
                        {bulkLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCheck size={18} />}
                        <span>{isSeasonFullyWatched ? 'فصل تکمیل شد' : 'تیک زدن کل فصل'}</span>
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {episodes.map((ep: any) => {
                    const released = isReleased(ep.air_date);
                    const isWatched = watchedEpisodes.includes(ep.id);
                    return (
                        <div key={ep.id} className={`border rounded-2xl p-4 flex gap-4 transition-all group ${isWatched ? 'bg-[#ccff00]/5 border-[#ccff00]/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                            <div onClick={() => setSelectedEp(ep)} className="flex gap-4 flex-1 cursor-pointer">
                                <div className="w-32 h-20 bg-black/50 rounded-lg overflow-hidden shrink-0 relative">
                                    <img src={getImageUrl(ep.still_path)} className={`w-full h-full object-cover transition-all ${isWatched ? 'grayscale-0' : 'grayscale opacity-70 group-hover:opacity-100'}`} alt={ep.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                     <h3 className={`font-bold text-lg truncate ltr text-right ${isWatched ? 'text-[#ccff00]' : 'text-white'}`}>{ep.episode_number}. {ep.name}</h3>
                                     <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">{ep.overview || "..."}</p>
                                     <div className="text-xs text-gray-500 mt-2 ltr text-right">{ep.air_date}</div>
                                </div>
                            </div>
                            {released ? (
                                <button onClick={(e) => { e.stopPropagation(); toggleWatched(ep.id); }} className={`transition-all transform active:scale-90 cursor-pointer self-start mt-1 ${isWatched ? 'text-[#ccff00]' : 'text-gray-600 hover:text-gray-400'}`}>
                                    <CheckCircle size={28} fill={isWatched ? "#ccff00" : "none"} className={isWatched ? "text-black" : ""} />
                                </button>
                            ) : (
                                <div className="flex flex-col items-center mt-1 text-gray-600 gap-1 opacity-60">
                                    <Hourglass size={20} />
                                    <span className="text-[10px] font-bold ltr">{getDaysLeft(ep.air_date)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ستون چپ: اطلاعات اجتماعی و رتبه بندی */}
        <div className="lg:col-span-1 space-y-8">
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-lg mb-4 text-[#ccff00]">امتیازدهی و آمار</h3>
                <div className="mb-6 border-b border-white/10 pb-4">
                     <p className="text-sm font-bold mb-2">امتیاز شما:</p>
                     <div className="flex justify-center gap-2">
                         {[1, 2, 3, 4, 5].map((rating) => (
                            <Star 
                                key={rating}
                                size={30}
                                onClick={() => handleRateShow(rating)}
                                fill={rating <= myRating ? '#ccff00' : 'none'}
                                className={`text-[#ccff00] cursor-pointer transition-transform duration-150 ${rating <= myRating ? 'scale-110' : 'opacity-50 hover:opacity-100'}`}
                            />
                         ))}
                     </div>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold mb-3 flex justify-between items-center">
                        آمار کاربران Binger: 
                        <span className="text-lg text-white font-black">{communityRatings.average.toFixed(2)}</span>
                    </p>
                    {[5, 4, 3, 2, 1].map(getRatingBar)}
                    <p className="text-xs text-gray-500 mt-3 text-center">بر اساس {communityRatings.count} رای</p>
                </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="font-bold text-lg mb-4 text-white">سریال‌های مشابه (پیشنهاد Binger)</h3>
                <div className={`grid ${similarShows.length > 0 ? 'grid-cols-3 gap-3' : 'grid-cols-1'}`}>
                    {similarShows.length > 0 ? (
                        similarShows.map((sim) => (
                            <div key={sim.id} onClick={() => router.push(`/dashboard/tv/${sim.id}`)} className="group relative cursor-pointer">
                                <img src={getImageUrl(sim.poster_path)} alt={sim.name} className="w-full rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.05]" />
                                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 text-center">{sim.name}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm col-span-full">فعلا پیشنهادی نداریم.</p>
                    )}
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sticky top-24">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#ccff00]" />
                    نظرات کلی
                </h3>
                <div className="relative mb-6">
                    <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="نظر کلی شما..." className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#ccff00] transition-all pr-12" />
                    <button onClick={handleSendComment} disabled={commentLoading || !newComment.trim()} className="absolute left-2 top-2 p-1.5 bg-[#ccff00] text-black rounded-lg hover:bg-[#b3e600] disabled:opacity-50 transition-all cursor-pointer">
                        {commentLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                    </button>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-300 ltr">{comment.email.split('@')[0]}</span>
                                    <span className="text-[10px] text-gray-600">{new Date(comment.created_at).toLocaleDateString('fa-IR')}</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed">{comment.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-600 py-10 text-sm">هنوز نظری ثبت نشده.<br/>اولین نفر باش!</div>
                    )}
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}