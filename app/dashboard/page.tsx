"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  getTrendingShows, searchShows, getImageUrl, getBackdropUrl, 
  getLatestAnime, getAsianDramas, getNewestGlobal, getShowDetails, 
  getIranianShows, getNewestIranianShows 
} from '@/lib/tmdbClient'; 
import { 
  Home, Search, List, User, LogOut, Loader2, Star, Plus, 
  Calendar as CalIcon, Info, AlertTriangle, Check, Bookmark, 
  Globe, Activity, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Data
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [heroShows, setHeroShows] = useState<any[]>([]); 
  
  // Tabs Data
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
  
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discovery' | 'my_radar'>('discovery');

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        setUser(user);

        const { data: wList } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        const { data: watched } = await supabase.from('watched').select('show_id').eq('user_id', user.id);
        
        const myShowIds = new Set<number>();
        if (wList) wList.forEach((i: any) => myShowIds.add(i.show_id));
        if (watched) watched.forEach((i: any) => myShowIds.add(i.show_id));
        
        setWatchlistIds(new Set(wList?.map((i:any) => i.show_id)));

        const fetchSafely = async (fn: () => Promise<any>, fallback: any[]) => {
            try { return await fn(); } catch (e) { console.error(e); return fallback; }
        };

        const [trendDataRaw, animeData, asianData, newGlobalData, popIranianData, newIranianData] = await Promise.all([
            fetchSafely(getTrendingShows, []),
            fetchSafely(getLatestAnime, []),
            fetchSafely(getAsianDramas, []),
            fetchSafely(getNewestGlobal, []),
            fetchSafely(getIranianShows, []),        
            fetchSafely(getNewestIranianShows, [])   
        ]);

        let heroSlice = [];
        if (trendDataRaw && trendDataRaw.length > 0) {
            const topIranian = newIranianData.length > 0 ? [newIranianData[0]] : (popIranianData.length > 0 ? [popIranianData[0]] : []);
            const topGlobal = trendDataRaw.slice(0, topIranian.length > 0 ? 4 : 5);
            heroSlice = [...topIranian, ...topGlobal];
            setHeroShows(heroSlice);
        }

        const { data: comments } = await supabase.from('comments').select('show_id');
        const commentCounts: any = {};
        comments?.forEach((c: any) => { commentCounts[c.show_id] = (commentCounts[c.show_id] || 0) + 1 });
        const discussedIds = Object.keys(commentCounts).sort((a, b) => commentCounts[b] - commentCounts[a]).slice(0, 10);
        const discussedShows = await Promise.all(discussedIds.map(async id => { try { return await getShowDetails(id); } catch { return null; } }));

        const { data: ratings } = await supabase.from('show_ratings').select('show_id, rating');
        const ratingMap: any = {};
        ratings?.forEach((r: any) => {
            if (!ratingMap[r.show_id]) ratingMap[r.show_id] = { sum: 0, count: 0 };
            ratingMap[r.show_id].sum += r.rating;
            ratingMap[r.show_id].count += 1;
        });
        const topBingerIds = Object.keys(ratingMap).map(id => ({ id, avg: ratingMap[id].sum / ratingMap[id].count })).sort((a, b) => b.avg - a.avg).slice(0, 10).map(item => item.id);
        const topBingerShows = await Promise.all(topBingerIds.map(async id => { try { return await getShowDetails(id); } catch { return null; } }));

        setCategories({
            newIranian: newIranianData || [],
            popularIranian: popIranianData || [],
            trending: trendDataRaw ? trendDataRaw.slice(0, 10) : [],
            newGlobal: newGlobalData || [],
            anime: animeData || [],
            asian: asianData || [],
            mostDiscussed: discussedShows.filter(s => s),
            topBinger: topBingerShows.filter(s => s)
        });

        const allFetchedShows = [
            ...(newGlobalData || []), 
            ...(trendDataRaw || []),
            ...(animeData || []),
            ...(newIranianData || [])
        ];
        
        const personalFeed = allFetchedShows.filter((show: any, index, self) => 
            index === self.findIndex((t) => t.id === show.id) && 
            myShowIds.has(show.id)
        );
        setMyFeed(personalFeed);
        
      } catch (err: any) {
          console.error("Dashboard Error:", err);
          setErrorMsg("مشکلی در بارگذاری اطلاعات پیش آمد.");
      } finally {
          setLoading(false);
      }
    };

    initData();
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      const results = await searchShows(query);
      setSearchResults(results);
    }
  };

  const toggleWatchlist = async (showId: number) => {
      const isAdded = watchlistIds.has(showId);
      setWatchlistIds(prev => {
          const next = new Set(prev);
          if (isAdded) next.delete(showId);
          else next.add(showId);
          return next;
      });
      showToast(isAdded ? "از لیست تماشا حذف شد 🗑️" : "به لیست تماشا اضافه شد ✅");
      if (isAdded) {
          await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
      } else {
          await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }]);
      }
  };

  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;
  if (errorMsg) return <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 gap-4"><AlertTriangle size={48} /><p>{errorMsg}</p><button onClick={() => window.location.reload()} className="bg-white/10 px-4 py-2 rounded-lg text-white hover:bg-white/20">تلاش مجدد</button></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex flex-col md:flex-row relative">
      
      {toastMsg && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-2">
              <Info size={20} />
              {toastMsg}
          </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-black/20 border-l border-white/5 flex-col items-start py-8 sticky top-0 h-screen z-50 backdrop-blur-xl">
        <div className="px-8 mb-10 flex items-center gap-3">
           <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black text-xl">B</div>
           <span className="text-xl font-bold">Binger</span>
        </div>
        <nav className="flex-1 w-full space-y-2 px-4">
          <MenuItem icon={<Home size={24} />} label="ویترین" active={!searchQuery} onClick={() => setSearchQuery("")} />
          <MenuItem icon={<CalIcon size={24} />} label="تقویم پخش" onClick={() => router.push('/dashboard/calendar')} />
          <MenuItem icon={<List size={24} />} label="کتابخانه من" onClick={() => router.push('/dashboard/lists')} />
          <MenuItem icon={<User size={24} />} label="پروفایل" onClick={() => router.push('/dashboard/profile')} />
        </nav>
        <div className="p-4 w-full">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all"><LogOut size={20} /> <span className="text-sm font-bold">خروج</span></button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 relative no-scrollbar">
        
        {/* TOP BAR & SEARCH */}
        <div className="absolute top-0 left-0 right-0 z-40 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/50 to-transparent pointer-events-none">
            <div className="pointer-events-auto max-w-md mr-auto">
                <div className="relative group">
                    <input ref={searchInputRef} type="text" value={searchQuery} onChange={handleSearch} placeholder="جستجو..." className="w-full bg-black/50 border border-white/20 backdrop-blur-md rounded-full px-5 py-2.5 pl-10 text-white focus:outline-none focus:border-[#ccff00] transition-all text-sm group-hover:bg-black/70" />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
            </div>
        </div>

        {searchQuery ? (
            <div className="p-6 pt-24 min-h-screen">
                <h2 className="text-xl font-bold mb-6">نتایج جستجو: "{searchQuery}"</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {searchResults.map((show) => (
                        <ShowCard key={show.id} show={show} isAdded={watchlistIds.has(show.id)} onToggle={() => toggleWatchlist(show.id)} onClick={() => router.push(`/dashboard/tv/${show.id}`)} />
                    ))}
                </div>
            </div>
        ) : (
            <div className="animate-in fade-in duration-500">
                
                {/* 1. HERO SLIDER */}
                {heroShows.length > 0 && <HeroSlider shows={heroShows} router={router} watchlistIds={watchlistIds} onToggle={toggleWatchlist} />}

                {/* 2. TABS */}
                <div className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 mb-6 -mt-6">
                    <div className="flex justify-center">
                        <div className="bg-white/10 p-1 rounded-xl flex">
                            <button 
                                onClick={() => setActiveTab('discovery')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'discovery' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Globe size={16} /> کشف و جستجو
                            </button>
                            <button 
                                onClick={() => setActiveTab('my_radar')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'my_radar' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Activity size={16} /> رادارِ من
                                {myFeed.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{myFeed.length}</span>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. CONTENT AREA */}
                <div className="relative z-10 px-4 md:px-12 pb-20 space-y-12">
                    
                    {activeTab === 'discovery' ? (
                        <>
                            <CarouselSection title="🆕 تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            <CarouselSection title="💎 پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            <CarouselSection title="🔥 پربازدیدترین‌های هفته (جهان)" items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            {categories.topBinger.length > 0 && <CarouselSection title="👑 برترین‌های بینجر (انتخاب کاربران)" items={categories.topBinger} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />}
                            <CarouselSection title="🌏 جدیدترین سریال‌های دنیا (در حال پخش)" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            <CarouselSection title="⛩️ جدیدترین انیمه‌ها" items={categories.anime} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            <CarouselSection title="🐉 جدیدترین‌های آسیای شرقی" items={categories.asian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                            {categories.mostDiscussed.length > 0 && <CarouselSection title="💬 پربحث‌ترین‌ها (داغ)" items={categories.mostDiscussed} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />}
                        </>
                    ) : (
                        <>
                            {myFeed.length > 0 ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center gap-2 text-[#ccff00] mb-4">
                                        <Activity size={24} />
                                        <h2 className="text-xl font-black">سریال‌های شما (قسمت‌های جدید)</h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                        {myFeed.map((show) => (
                                            <ShowCard key={show.id} show={show} isAdded={true} onToggle={() => toggleWatchlist(show.id)} onClick={() => router.push(`/dashboard/tv/${show.id}`)} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
                                        <Plus size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">رادار شما خالیه!</h3>
                                    <p className="text-gray-400 text-sm max-w-xs mb-6">
                                        هنوز هیچ سریالی رو به لیستت اضافه نکردی یا سریال‌هات الان پخش نمیشن.
                                    </p>
                                    <button onClick={() => setActiveTab('discovery')} className="text-[#ccff00] text-sm font-bold border-b border-[#ccff00] pb-0.5">
                                        برو به بخش کشف و جستجو
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-t border-white/10 flex justify-around p-4 z-50">
          <Home size={24} className={!searchQuery ? "text-[#ccff00]" : "text-gray-500"} onClick={() => setSearchQuery("")} />
          <CalIcon size={24} className="text-gray-500" onClick={() => router.push('/dashboard/calendar')} />
          <List size={24} className="text-gray-500" onClick={() => router.push('/dashboard/lists')} />
          <User size={24} className="text-gray-500" onClick={() => router.push('/dashboard/profile')} />
      </div>
    </div>
  );
}

// --- COMPONENTS ---

// 1. Hero Slider (Scrollable/Swipeable Version)
function HeroSlider({ shows, router, watchlistIds, onToggle }: any) {
    const [current, setCurrent] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync active dot on scroll
    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth) * -1; // RTL fix might be needed or simple math
            // For RTL, scrollLeft is negative or starts from right. Usually Math.abs helps.
            // Simplified calculation for demo:
            const cardWidth = scrollRef.current.clientWidth;
            const scrollPos = Math.abs(scrollRef.current.scrollLeft);
            const idx = Math.round(scrollPos / cardWidth);
            if (idx >= 0 && idx < shows.length) setCurrent(idx);
        }
    };

    const scrollToSlide = (idx: number) => {
        if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            // RTL handling for scrollTo might vary by browser, but usually negative for left
            // Or just native behavior:
            scrollRef.current.scrollTo({ left: -(idx * width), behavior: 'smooth' }); 
            setCurrent(idx);
        }
    };

    const nextSlide = () => {
        const next = current === shows.length - 1 ? 0 : current + 1;
        scrollToSlide(next);
    };

    const prevSlide = () => {
        const prev = current === 0 ? shows.length - 1 : current - 1;
        scrollToSlide(prev);
    };

    if (shows.length === 0) return null;

    return (
        <div className="relative w-full h-[65vh] md:h-[75vh] group mb-8">
            {/* Scroll Container */}
            {/* 🔥 Added 'no-scrollbar' class here */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory h-full w-full no-scrollbar scroll-smooth"
            >
                {shows.map((show: any, index: number) => {
                    const isAdded = watchlistIds.has(show.id);
                    return (
                        <div key={show.id} className="snap-center shrink-0 w-full h-full relative">
                            <img 
                                src={getBackdropUrl(show.backdrop_path)} 
                                className="w-full h-full object-cover opacity-60" 
                                alt={show.name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/30 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
                            
                            <div className="absolute bottom-0 right-0 w-full p-6 md:p-16 md:w-2/3 lg:w-1/2 flex flex-col items-start gap-3 pb-20">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">Trending #{index + 1}</span>
                                    {show.origin_country?.includes('IR') && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">ایران 🇮🇷</span>}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-2xl ltr text-right line-clamp-2">{show.name}</h1>
                                <p className="text-gray-300 text-xs md:text-sm line-clamp-2 leading-relaxed max-w-lg text-justify hidden sm:block">{show.overview}</p>
                                
                                <div className="flex gap-3 mt-4 w-full md:w-auto">
                                    <button onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="flex-1 md:flex-none bg-[#ccff00] hover:bg-[#b3e600] text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm">
                                        <Info size={18} /> اطلاعات
                                    </button>
                                    <button onClick={() => onToggle(show.id)} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-transform active:scale-95 cursor-pointer text-sm ${isAdded ? 'bg-[#ccff00]/20 text-[#ccff00] border-[#ccff00]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}>
                                        {isAdded ? <Check size={18} /> : <Plus size={18} />} {isAdded ? 'لیست' : 'افزودن'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Navigation Arrows */}
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block"><ChevronLeft size={24} /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block"><ChevronRight size={24} /></button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {shows.map((_: any, idx: number) => (
                    <div key={idx} onClick={() => scrollToSlide(idx)} className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === current ? 'w-4 bg-[#ccff00]' : 'w-1.5 bg-white/30'}`}></div>
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
            {/* 🔥 Added 'no-scrollbar' class here too */}
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
        <div onClick={onClick} className="group relative aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#ccff00]/10">
            <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity"></div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-all translate-y-[-10px] group-hover:translate-y-0 cursor-pointer z-10 ${isAdded ? 'opacity-100 bg-[#ccff00] text-black shadow-lg' : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-[#ccff00] hover:text-black'}`}
            >
                {isAdded ? <Bookmark size={14} fill="black" /> : <Plus size={14} />}
            </button>

            <div className="absolute bottom-0 p-3 w-full translate-y-2 group-hover:translate-y-0 transition-transform">
                <h3 className="text-xs font-bold text-white line-clamp-1 ltr text-left">{show.name}</h3>
                <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                    <span className="text-[9px] text-gray-400">{show.first_air_date?.split('-')[0]}</span>
                    <div className="flex items-center gap-1 text-[9px] text-[#ccff00] font-bold"><Star size={9} fill="#ccff00" /> {show.vote_average?.toFixed(1)}</div>
                </div>
            </div>
        </div>
    );
}

function MenuItem({ icon, label, active = false, onClick }: any) {
    return (<div onClick={onClick} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-[#ccff00] text-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>{icon} <span className="hidden md:block">{label}</span></div>);
}