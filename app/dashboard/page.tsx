"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  getTrendingShows, searchShows, getImageUrl, getBackdropUrl, 
  getLatestAnime, getAsianDramas, getNewestGlobal, getShowDetails, 
  getIranianShows, getNewestIranianShows 
} from '@/lib/tmdbClient'; 
import { 
  Loader2, Star, Plus, Info, AlertTriangle, Check, Bookmark, 
  Globe, Activity, ChevronLeft, ChevronRight 
} from 'lucide-react';

// --- WRAPPER COMPONENT (FIX FOR VERCEL ERROR) ---
export default function Dashboard() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>}>
       <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q'); 

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Data
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [heroShows, setHeroShows] = useState<any[]>([]); 
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discovery' | 'my_radar'>('discovery');
  
  const [categories, setCategories] = useState({
      newIranian: [] as any[], 
      popularIranian: [] as any[], 
      trending: [] as any[],
      topBinger: [] as any[], 
      mostDiscussed: [] as any[], 
      newGlobal: [] as any[],
      asian: [] as any[],
      anime: [] as any[]
  });

  // --- Search Logic ---
  useEffect(() => {
      const performSearch = async () => {
          if (queryFromUrl && queryFromUrl.length > 1) {
              setIsSearching(true);
              const results = await searchShows(queryFromUrl);
              setSearchResults(results);
              setIsSearching(false);
          } else {
              setSearchResults([]);
          }
      };
      performSearch();
  }, [queryFromUrl]);

  // --- Main Data Logic ---
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        setUser(user);

        const { data: wList } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        setWatchlistIds(new Set(wList?.map((i:any) => i.show_id)));

        const fetchSafely = async (fn: () => Promise<any>, fallback: any[]) => {
            try { return await fn(); } catch (e) { return fallback; }
        };

        const [trendDataRaw, animeData, asianData, newGlobalData, popIranianData, newIranianData] = await Promise.all([
            fetchSafely(getTrendingShows, []),
            fetchSafely(getLatestAnime, []),
            fetchSafely(getAsianDramas, []),
            fetchSafely(getNewestGlobal, []),
            fetchSafely(getIranianShows, []),        
            fetchSafely(getNewestIranianShows, [])   
        ]);

        if (trendDataRaw && trendDataRaw.length > 0) {
            const topIranian = newIranianData.length > 0 ? [newIranianData[0]] : [];
            const topGlobal = trendDataRaw.slice(0, topIranian.length > 0 ? 4 : 5);
            setHeroShows([...topIranian, ...topGlobal]);
        }

        const { data: ratings } = await supabase.from('show_ratings').select('show_id, rating');
        const ratingMap: any = {};
        ratings?.forEach((r: any) => {
            if (!ratingMap[r.show_id]) ratingMap[r.show_id] = { sum: 0, count: 0 };
            ratingMap[r.show_id].sum += r.rating;
            ratingMap[r.show_id].count += 1;
        });
        const topBingerIds = Object.keys(ratingMap).sort((a, b) => (ratingMap[b].sum/ratingMap[b].count) - (ratingMap[a].sum/ratingMap[a].count)).slice(0, 10);
        const topBingerShows = await Promise.all(topBingerIds.map(async id => { try { return await getShowDetails(id); } catch { return null; } }));

        setCategories({
            newIranian: newIranianData || [],
            popularIranian: popIranianData || [],
            trending: trendDataRaw ? trendDataRaw.slice(0, 10) : [],
            newGlobal: newGlobalData || [],
            anime: animeData || [],
            asian: asianData || [],
            mostDiscussed: [], 
            topBinger: topBingerShows.filter(s => s)
        });

        const allFetchedShows = [...(newGlobalData || []), ...(trendDataRaw || []), ...(animeData || []), ...(newIranianData || [])];
        const myShowIds = new Set(wList?.map((i:any) => i.show_id));
        const personalFeed = allFetchedShows.filter((show: any, index, self) => index === self.findIndex((t) => t.id === show.id) && myShowIds.has(show.id));
        setMyFeed(personalFeed);
        
      } catch (err: any) {
          console.error(err);
          setErrorMsg("خطا در بارگذاری.");
      } finally {
          setLoading(false);
      }
    };

    initData();
  }, []);

  const toggleWatchlist = async (showId: number) => {
      const isAdded = watchlistIds.has(showId);
      setWatchlistIds(prev => {
          const next = new Set(prev);
          if (isAdded) next.delete(showId);
          else next.add(showId);
          return next;
      });
      setToastMsg(isAdded ? "حذف شد 🗑️" : "اضافه شد ✅");
      setTimeout(() => setToastMsg(null), 3000);
      
      if (isAdded) await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
      else await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }]);
  };

  if (loading) return <div className="h-full flex items-center justify-center text-[#ccff00] pt-20"><Loader2 className="animate-spin" size={48} /></div>;
  if (errorMsg) return <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4 pt-20"><AlertTriangle size={48} /><p>{errorMsg}</p></div>;

  if (queryFromUrl) {
      return (
          <div className="p-6 min-h-screen animate-in fade-in">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  نتایج جستجو برای: <span className="text-[#ccff00]">"{queryFromUrl}"</span>
                  {isSearching && <Loader2 className="animate-spin" size={20} />}
              </h2>
              {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {searchResults.map((show) => (
                          <ShowCard key={show.id} show={show} isAdded={watchlistIds.has(show.id)} onToggle={() => toggleWatchlist(show.id)} onClick={() => router.push(`/dashboard/tv/${show.id}`)} />
                      ))}
                  </div>
              ) : (
                  !isSearching && <p className="text-gray-500 text-center mt-10">موردی یافت نشد.</p>
              )}
          </div>
      );
  }

  return (
    <div className="animate-in fade-in duration-500 relative w-full overflow-hidden">
        
        {toastMsg && (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2">
                <Info size={20} /> {toastMsg}
            </div>
        )}

        {/* 1. HERO SLIDER */}
        {heroShows.length > 0 && <HeroSlider shows={heroShows} router={router} watchlistIds={watchlistIds} onToggle={toggleWatchlist} />}

        {/* 2. TABS */}
        <div className="flex justify-center mb-8 -mt-8 relative z-20">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex shadow-2xl">
                <button onClick={() => setActiveTab('discovery')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'discovery' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    <Globe size={18} /> کشف
                </button>
                <button onClick={() => setActiveTab('my_radar')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'my_radar' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    <Activity size={18} /> رادارِ من
                </button>
            </div>
        </div>

        {/* 3. CONTENT AREA */}
        <div className="relative z-10 px-4 md:px-8 pb-20 space-y-12">
            {activeTab === 'discovery' ? (
                <>
                    <CarouselSection title="🆕 تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="💎 پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="🔥 پربازدیدترین‌های هفته (جهان)" items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    {categories.topBinger.length > 0 && <CarouselSection title="👑 برترین‌های بینجر" items={categories.topBinger} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />}
                    <CarouselSection title="🌏 جدیدترین‌های دنیا" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="⛩️ انیمه" items={categories.anime} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="🐉 آسیای شرقی" items={categories.asian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 mx-4">
                    <h3 className="text-lg font-bold text-white mb-2">رادار شما خالیه!</h3>
                    <p className="text-gray-400 text-sm">فعلاً سریالی در لیست شما نیست.</p>
                </div>
            )}
        </div>
    </div>
  );
}

// --- COMPONENTS ---
// فقط این تابع را در app/dashboard/page.tsx جایگزین کنید

function HeroSlider({ shows, router, watchlistIds, onToggle }: any) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState(0);

    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            const scrollPos = Math.abs(scrollRef.current.scrollLeft); 
            setCurrent(Math.round(scrollPos / width));
        }
    };

    const nextSlide = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            const next = current === shows.length - 1 ? 0 : current + 1;
            scrollRef.current.scrollTo({ left: -(next * width), behavior: 'smooth' });
            setCurrent(next);
        }
    };

    const prevSlide = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            const prev = current === 0 ? shows.length - 1 : current - 1;
            scrollRef.current.scrollTo({ left: -(prev * width), behavior: 'smooth' });
            setCurrent(prev);
        }
    };

    if (shows.length === 0) return null;

    return (
        <div className="relative w-full h-[60vh] md:h-[75vh] group mb-8">
            <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory h-full w-full no-scrollbar scroll-smooth" dir="ltr">
                {shows.map((show: any, index: number) => {
                    const isAdded = watchlistIds.has(show.id);
                    const hasPersianName = show.name !== show.original_name;
                    const overviewText = show.overview || "توضیحات این سریال به زودی تکمیل می‌شود...";
                    const isPersianOverview = /[\u0600-\u06FF]/.test(overviewText);

                    return (
                        <div key={show.id} className="snap-center shrink-0 w-full h-full relative">
                            <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
                            
                            <div className="absolute bottom-0 right-0 w-full md:w-2/3 p-6 md:p-16 flex flex-col items-start gap-4 pb-20 md:pb-24 z-10" dir="rtl">
                                <div className="flex items-center gap-2">
                                    <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">Trending #{index + 1}</span>
                                    {show.origin_country?.includes('IR') && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">ایران 🇮🇷</span>}
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl leading-tight text-right">{show.name}</h1>
                                    {hasPersianName && <h2 className="text-lg md:text-2xl text-gray-300 font-bold mt-1 text-right ltr opacity-80 font-sans">{show.original_name}</h2>}
                                </div>
                                <p className={`text-gray-200 text-xs md:text-sm leading-relaxed max-w-xl line-clamp-3 md:line-clamp-4 ${isPersianOverview ? 'text-justify text-right dir-rtl' : 'text-left dir-ltr opacity-90'}`}>
                                    {overviewText}
                                </p>
                                <div className="flex gap-3 mt-2 w-full md:w-auto">
                                    <button onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="flex-1 md:flex-none bg-[#ccff00] hover:bg-[#b3e600] text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm shadow-[0_0_20px_rgba(204,255,0,0.2)]">
                                        <Info size={20} /> اطلاعات
                                    </button>
                                    <button onClick={() => onToggle(show.id)} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-transform active:scale-95 cursor-pointer text-sm ${isAdded ? 'bg-white text-black border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'}`}>
                                        {isAdded ? <Check size={20} /> : <Plus size={20} />} {isAdded ? 'لیست' : 'افزودن'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* 🔥 Navigation Arrows (Restored) */}
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block active:scale-90"><ChevronRight size={28} /></button>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block active:scale-90"><ChevronLeft size={28} /></button>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
                {shows.map((_: any, idx: number) => (
                    <div key={idx} onClick={() => { if(scrollRef.current) { const w = scrollRef.current.clientWidth; scrollRef.current.scrollTo({left: -(idx * w), behavior: 'smooth'}); setCurrent(idx); }}} className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === current ? 'w-6 bg-[#ccff00]' : 'w-1.5 bg-white/50'}`}></div>
                ))}
            </div>
        </div>
    );
}

function CarouselSection({ title, items, router, watchlistIds, onToggle }: any) {
    if (!items || items.length === 0) return null;
    return (
        <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2 text-white/90 px-2 border-r-4 border-[#ccff00] mr-2">{title}</h2>
            <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar snap-x scroll-smooth">
                {items.map((show: any) => (
                    <div key={show.id} className="snap-center shrink-0 w-[130px] md:w-[160px]">
                        <ShowCard show={show} isAdded={watchlistIds.has(show.id)} onClick={() => router.push(`/dashboard/tv/${show.id}`)} onToggle={() => onToggle(show.id)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ShowCard({ show, isAdded, onClick, onToggle }: any) {
    return (
        <div onClick={onClick} className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00] transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${isAdded ? 'bg-[#ccff00] text-black' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}>
                {isAdded ? <Bookmark size={14} fill="black" /> : <Plus size={14} />}
            </button>
            <div className="absolute bottom-0 p-3 w-full">
                <h3 className="text-xs font-bold text-white line-clamp-1 text-right">{show.name}</h3>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-gray-400">{show.first_air_date?.split('-')[0]}</span>
                    <span className="text-[10px] text-[#ccff00] flex items-center gap-0.5"><Star size={8} fill="#ccff00" /> {show.vote_average?.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
}