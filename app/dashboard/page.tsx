"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Home, Search, List, User, LogOut, Loader2, Star, Plus, Calendar as CalIcon, Flame, MessageCircle, Globe, PlayCircle, Info, AlertTriangle, ChevronLeft, ChevronRight, Check, Bookmark } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
// اضافه شدن getNewestIranianShows
import { getTrendingShows, searchShows, getImageUrl, getBackdropUrl, getLatestAnime, getAsianDramas, getNewestGlobal, getShowDetails, getIranianShows, getNewestIranianShows } from '@/lib/tmdbClient'; 
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [heroShows, setHeroShows] = useState<any[]>([]); 
  const [categories, setCategories] = useState({
      newIranian: [] as any[], // جدیدترین ایرانی
      popularIranian: [] as any[], // محبوب‌ترین ایرانی
      trending: [] as any[],
      topBinger: [] as any[], 
      mostDiscussed: [] as any[], 
      newGlobal: [] as any[],
      asian: [] as any[],
      anime: [] as any[]
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        setUser(user);

        const { data: wList } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        if (wList) {
            const ids = new Set(wList.map((i: any) => i.show_id));
            setWatchlistIds(ids);
        }

        const fetchSafely = async (fn: () => Promise<any>, fallback: any[]) => {
            try { return await fn(); } catch (e) { console.error(e); return fallback; }
        };

        // 1. دریافت داده‌ها (شامل ۲ مدل ایرانی)
        const [trendDataRaw, animeData, asianData, newGlobalData, popIranianData, newIranianData] = await Promise.all([
            fetchSafely(getTrendingShows, []),
            fetchSafely(getLatestAnime, []),
            fetchSafely(getAsianDramas, []),
            fetchSafely(getNewestGlobal, []),
            fetchSafely(getIranianShows, []),        // محبوب
            fetchSafely(getNewestIranianShows, [])   // جدید (تازه)
        ]);

        // 2. ساخت اسلایدر ترکیبی (جدیدترین ایرانی + ترند جهانی)
        let heroSlice = [];
        if (trendDataRaw && trendDataRaw.length > 0) {
            // اولویت اسلایدر: ۱. جدیدترین ایرانی، ۲. ترند جهانی
            const topIranian = newIranianData.length > 0 ? [newIranianData[0]] : (popIranianData.length > 0 ? [popIranianData[0]] : []);
            const topGlobal = trendDataRaw.slice(0, topIranian.length > 0 ? 4 : 5);
            
            const rawHeroList = [...topIranian, ...topGlobal];

            heroSlice = await Promise.all(rawHeroList.map(async (show: any) => {
                 try { return await getShowDetails(String(show.id)) || show; } catch { return show; }
            }));
            setHeroShows(heroSlice);
        }

        // 3. دیتای لوکال
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
                {/* HERO SLIDER */}
                {heroShows.length > 0 && <HeroSlider shows={heroShows} router={router} watchlistIds={watchlistIds} onToggle={toggleWatchlist} />}

                {/* CAROUSELS */}
                <div className="relative z-10 mt-8 md:mt-12 space-y-12 pb-20 px-4 md:px-12">
                    
                    {/* 🇮🇷 جدیدترین‌های ایرانی (Newest First) */}
                    <CarouselSection title="🆕 تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />

                    {/* 🇮🇷 محبوب‌ترین‌های ایرانی */}
                    <CarouselSection title="💎 پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    
                    <CarouselSection title="🔥 پربازدیدترین‌های هفته (جهان)" items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    {categories.topBinger.length > 0 && <CarouselSection title="👑 برترین‌های بینجر (انتخاب کاربران)" items={categories.topBinger} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />}
                    <CarouselSection title="🌏 جدیدترین سریال‌های دنیا (در حال پخش)" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="⛩️ جدیدترین انیمه‌ها" items={categories.anime} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    <CarouselSection title="🐉 جدیدترین‌های آسیای شرقی" items={categories.asian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                    {categories.mostDiscussed.length > 0 && <CarouselSection title="💬 پربحث‌ترین‌ها (داغ)" items={categories.mostDiscussed} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />}
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

function HeroSlider({ shows, router, watchlistIds, onToggle }: any) {
    const [current, setCurrent] = useState(0);
    const timeoutRef = useRef<any>(null);
    const resetTimeout = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    useEffect(() => {
        resetTimeout();
        timeoutRef.current = setTimeout(() => setCurrent((prev) => (prev === shows.length - 1 ? 0 : prev + 1)), 8000);
        return () => resetTimeout();
    }, [current, shows.length]);
    const nextSlide = () => { resetTimeout(); setCurrent(current === shows.length - 1 ? 0 : current + 1); };
    const prevSlide = () => { resetTimeout(); setCurrent(current === 0 ? shows.length - 1 : current - 1); };
    if (shows.length === 0) return null;

    const currentShow = shows[current];
    const isAdded = watchlistIds.has(currentShow.id);

    return (
        <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden group">
            {shows.map((show: any, index: number) => (
                <div key={show.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="absolute inset-0">
                        <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover scale-105 animate-pan-slow" alt={show.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-transparent"></div>
                    </div>
                    
                    <div className="absolute bottom-0 right-0 w-full p-6 md:p-16 md:w-2/3 lg:w-1/2 flex flex-col items-start gap-4 pb-24 md:pb-20">
                        <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <span className="bg-[#ccff00] text-black text-xs font-black px-2 py-1 rounded uppercase">Trending #{index + 1}</span>
                            {show.origin_country?.includes('IR') && <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">محصول ایران 🇮🇷</span>}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-2xl ltr text-right animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 line-clamp-2">{show.name}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300 font-bold animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                            <span className="text-[#ccff00] flex items-center gap-1"><Star size={14} fill="#ccff00" /> {show.vote_average?.toFixed(1)}</span>
                            <span>{show.first_air_date?.split('-')[0]}</span>
                            <span>{show.number_of_seasons ? `${show.number_of_seasons} Seasons` : ''}</span>
                            <div className="flex gap-2">{show.genres?.slice(0, 2).map((g:any) => (<span key={g.id} className="text-gray-400 text-xs border border-white/20 px-2 py-0.5 rounded-full">{g.name}</span>))}</div>
                        </div>
                        <p className="text-gray-300 text-sm md:text-base line-clamp-3 leading-relaxed max-w-xl text-justify animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400">{show.overview}</p>
                        <div className="flex gap-3 mt-6 w-full md:w-auto animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
                            <button onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="flex-1 md:flex-none bg-[#ccff00] hover:bg-[#b3e600] text-black px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"><Info size={20} /> اطلاعات بیشتر</button>
                            <button onClick={() => onToggle(show.id)} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-transform active:scale-95 cursor-pointer ${isAdded ? 'bg-[#ccff00]/20 text-[#ccff00] border-[#ccff00]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}>
                                {isAdded ? <Check size={20} /> : <Plus size={20} />} {isAdded ? 'در لیست شما' : 'لیست'}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block"><ChevronLeft size={24} /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/10 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer hidden md:block"><ChevronRight size={24} /></button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">{shows.map((_: any, idx: number) => (<div key={idx} onClick={() => { resetTimeout(); setCurrent(idx); }} className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === current ? 'w-6 bg-[#ccff00]' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}></div>))}</div>
        </div>
    );
}

function CarouselSection({ title, items, router, watchlistIds, onToggle }: any) {
    if (!items || items.length === 0) return null;
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2 text-white/90 px-2">{title}</h2>
            <div className="flex gap-4 overflow-x-auto pb-6 px-2 no-scrollbar snap-x">
                {items.map((show: any) => (
                    <div key={show.id} className="snap-center shrink-0 w-[140px] md:w-[180px]">
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
                className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all translate-y-[-10px] group-hover:translate-y-0 cursor-pointer ${isAdded ? 'opacity-100 bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.6)]' : 'opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-[#ccff00] hover:text-black'}`}
            >
                {isAdded ? <Bookmark size={16} fill="black" /> : <Plus size={16} />}
            </button>

            <div className="absolute bottom-0 p-3 w-full translate-y-2 group-hover:translate-y-0 transition-transform">
                <h3 className="text-sm font-bold text-white line-clamp-1 ltr text-left">{show.name}</h3>
                <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                    <span className="text-[10px] text-gray-400">{show.first_air_date?.split('-')[0]}</span>
                    <div className="flex items-center gap-1 text-[10px] text-[#ccff00] font-bold"><Star size={10} fill="#ccff00" /> {show.vote_average?.toFixed(1)}</div>
                </div>
            </div>
        </div>
    );
}

function MenuItem({ icon, label, active = false, onClick }: any) {
    return (<div onClick={onClick} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-[#ccff00] text-black font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>{icon} <span className="hidden md:block">{label}</span></div>);
}