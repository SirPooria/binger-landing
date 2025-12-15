"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  getTrendingShows, searchShows, getImageUrl, getBackdropUrl, 
  getShowDetails, getIranianShows, getNewestIranianShows,
  getLatestAnime, getAsianDramas, getNewestGlobal, getRecommendations
} from '@/lib/tmdbClient'; 
import { 
  Loader2, Star, Plus, Info, AlertTriangle, Check, Bookmark, 
  Globe, Activity, ChevronLeft, ChevronRight, Twitter, Instagram, Github, Heart, Sparkles,
  Trash2, ArrowLeft // <--- آیکون‌های جدید اضافه شدند
} from 'lucide-react';
// --- اضافه کردن ایمپورت‌های SWIPER ---
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

// --- WRAPPER FOR VERCEL ---
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

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const [heroShows, setHeroShows] = useState<any[]>([]); 
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discovery' | 'my_radar'>('discovery');
  const [user, setUser] = useState<any>(null);
  const [radarLoading, setRadarLoading] = useState(false);

  // 🔥 AI RECOMMENDATION STATE
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiSourceShow, setAiSourceShow] = useState<string | null>(null); 

  const [categories, setCategories] = useState({
      newIranian: [] as any[], 
      popularIranian: [] as any[], 
      trending: [] as any[],
      topBinger: [] as any[], 
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
        const { data: watched } = await supabase.from('watched').select('show_id').eq('user_id', user.id);

        const wIds = wList?.map((i: any) => i.show_id) || [];
        const wEdIds = watched?.map((i: any) => i.show_id) || [];
        const allUserShowIds = Array.from(new Set([...wIds, ...wEdIds]));
        
        setWatchlistIds(new Set(wIds));

        // 1. Radar Logic
        if (allUserShowIds.length > 0) {
            setRadarLoading(true);
            const recentIds = allUserShowIds.reverse().slice(0, 30); 
            const myShowsPromises = recentIds.map(id => getShowDetails(id).catch(() => null));
            const myShowsRaw = await Promise.all(myShowsPromises);
            const myShowsValid = myShowsRaw.filter(s => s !== null);
            setMyFeed(myShowsValid);
            setRadarLoading(false);

            // 🔥 2. AI RECOMMENDATION LOGIC
            if (allUserShowIds.length > 0) {
                const randomSeedId = allUserShowIds[Math.floor(Math.random() * allUserShowIds.length)];
                
                const [seedDetails, recs] = await Promise.all([
                    getShowDetails(randomSeedId),
                    getRecommendations(randomSeedId)
                ]);

                if (recs && recs.length > 0) {
                    setAiRecs(recs);
                    setAiSourceShow(seedDetails?.name || "سلیقه شما");
                }
            }
        }

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
            topBinger: topBingerShows.filter(s => s)
        });
        
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
      
      if (user) {
          if (isAdded) await supabase.from('watchlist').delete().eq('user_id', user.id).eq('show_id', showId);
          else await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }]);
      }
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
    <div className="animate-in fade-in duration-500 relative w-full overflow-hidden flex flex-col min-h-screen">
        
        {toastMsg && (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2">
                <Info size={20} /> {toastMsg}
            </div>
        )}

        {/* 1. HERO SLIDER */}
        {heroShows.length > 0 && <HeroSlider shows={heroShows} router={router} watchlistIds={watchlistIds} onToggle={toggleWatchlist} />}

        {/* 2. TABS */}
        <div className="flex justify-center mb-10 -mt-8 relative z-20">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex shadow-2xl">
                <button onClick={() => setActiveTab('discovery')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'discovery' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    <Globe size={18} /> اکسپلور گردی
                </button>
                <button onClick={() => setActiveTab('my_radar')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'my_radar' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    <Activity size={18} /> رادار سریال های من 
                </button>
            </div>
        </div>

        {/* 3. CONTENT AREA */}
        <div className="relative z-10 px-4 md:px-8 pb-10 space-y-16 flex-1">
            {activeTab === 'discovery' ? (
                <>
                    {/* 🔥🔥 AI RECOMMENDATIONS (TOP PRIORITY) 🔥🔥 */}
                    {aiRecs.length > 0 && (
                        <div className="relative bg-gradient-to-r from-[#ccff00]/5 to-transparent border border-[#ccff00]/10 rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Sparkles size={24} className="text-[#ccff00] animate-pulse" />
                                <h2 className="text-lg md:text-2xl font-black text-white">
                                    چون <span className="text-[#ccff00] underline decoration-wavy underline-offset-4">{aiSourceShow}</span> رو دیدی:
                                </h2>
                            </div>
                            <CarouselSection title="" items={aiRecs} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                        </div>
                    )}
                    
                    {/* ✅ عناوین بدون ایموجی + قابلیت مشاهده همه با ID */}
                    <CarouselSection title="تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-iranian" />
                    <CarouselSection title="پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="pop-iranian" />
                    <CarouselSection title="پربازدیدترین‌های هفته (جهان)" items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="trending" />
                    {categories.topBinger.length > 0 && <CarouselSection title="برترین‌های بینجر" items={categories.topBinger} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="top" />}
                    <CarouselSection title="جدیدترین‌های دنیا" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-global" />
                    <CarouselSection title="انیمه" items={categories.anime} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="anime" />
                    <CarouselSection title="آسیای شرقی" items={categories.asian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="asian" />
                </>
            ) : (
                // My Radar
                <>
                    {radarLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#ccff00]" size={32} /></div>
                    ) : myFeed.length > 0 ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-2 text-[#ccff00] mb-6 px-2">
                                <Activity size={24} />
                                <h2 className="text-xl font-black">سریال‌های شما (در حال تماشا و لیست)</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {myFeed.map((show) => (
                                    <ShowCard key={show.id} show={show} isAdded={true} onToggle={() => toggleWatchlist(show.id)} onClick={() => router.push(`/dashboard/tv/${show.id}`)} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 mx-4">
                            <h3 className="text-lg font-bold text-white mb-2">رادار شما خالیه!</h3>
                            <p className="text-gray-400 text-sm">به نظر میاد هنوز سریالی رو به لیستت اضافه نکردی یا شروع نکردی.</p>
                            <button onClick={() => setActiveTab('discovery')} className="mt-4 text-[#ccff00] text-sm border-b border-[#ccff00] pb-0.5 font-bold cursor-pointer">
                                برو به اکسپلور و چند تا سریال پیدا کن
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>

        {/* 4. FOOTER */}
        <DashboardFooter />
    </div>
  );
}

// --- COMPONENTS ---

// 1. HERO SLIDER (FIXED: Nav Logic, Text Justify, Delete Button)
// 1. HERO SLIDER REBUILT WITH SWIPER (INFINITE LOOP & MOUSE DRAG FIX)
function HeroSlider({ shows, router, watchlistIds, onToggle }: any) {
    if (shows.length === 0) return null;

    return (
        <div className="relative w-full h-[65vh] md:h-[75vh] group mb-8">
            <Swiper
                modules={[Navigation, Autoplay, EffectFade]}
                loop={true} // ✅ لوپ بی‌نهایت
                speed={1000} // سرعت نرم‌تر انیمیشن
                grabCursor={true} // ✅ نشانگر دست برای درگ کردن با موس
                effect="fade" // انیمیشن فید (جذاب‌تر برای هیرو)
                fadeEffect={{ crossFade: true }}
                autoplay={{
                    delay: 6000,
                    disableOnInteraction: false, // ✅ حتی بعد از کلیک کاربر، باز هم ورق بخورد
                }}
                navigation={{
                    nextEl: '.custom-next-btn',
                    prevEl: '.custom-prev-btn',
                }}
                className="w-full h-full"
                dir="ltr" // جهت اسلایدر برای عملکرد صحیح درگ باید LTR باشد (محتوا RTL میماند)
            >
                {shows.map((show: any, index: number) => {
                    const isAdded = watchlistIds.has(show.id);
                    const hasPersianName = show.name !== show.original_name;
                    const overviewText = show.overview || "توضیحات این سریال به زودی تکمیل می‌شود...";
                    const isPersianOverview = /[\u0600-\u06FF]/.test(overviewText);

                    return (
                        <SwiperSlide key={show.id} className="w-full h-full relative bg-[#050505]">
                            {/* بک‌دراپ */}
                            <div className="absolute inset-0">
                                <img 
                                    src={getBackdropUrl(show.backdrop_path)} 
                                    className="w-full h-full object-cover opacity-60" 
                                    alt={show.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
                            </div>

                            {/* محتوا */}
                            <div className="absolute bottom-0 right-0 w-full md:w-2/3 p-6 md:p-16 flex flex-col items-start gap-4 pb-20 md:pb-24 z-10" dir="rtl">
                                <div className="flex items-center gap-2">
                                    <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">TOP #{index + 1}</span>
                                    {show.origin_country?.includes('IR') && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">ایران 🇮🇷</span>}
                                </div>
                                
                                <div>
                                    <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl leading-tight text-right">{show.name}</h1>
                                    {hasPersianName && <h2 className="text-lg md:text-2xl text-gray-300 font-bold mt-1 text-right ltr opacity-80 font-sans">{show.original_name}</h2>}
                                </div>
                                
                                <p className={`text-gray-200 text-xs md:text-sm leading-relaxed max-w-xl line-clamp-3 md:line-clamp-4 text-justify ${isPersianOverview ? 'text-right dir-rtl' : 'text-left dir-ltr opacity-90'}`}>
                                    {overviewText}
                                </p>
                                
                                <div className="flex gap-3 mt-2 w-full md:w-auto">
                                    <button onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="flex-1 md:flex-none bg-[#ccff00] hover:bg-[#b3e600] text-black px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm shadow-[0_0_20px_rgba(204,255,0,0.2)]">
                                        <Info size={20} /> اطلاعات
                                    </button>
                                    
                                    <button 
                                        onClick={() => onToggle(show.id)} 
                                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-transform active:scale-95 cursor-pointer text-sm ${
                                            isAdded 
                                            ? 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20' 
                                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                        }`}
                                    >
                                        {isAdded ? (
                                            <> <Trash2 size={20} /> حذف از لیست </>
                                        ) : (
                                            <> <Plus size={20} /> افزودن به لیست </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </SwiperSlide>
                    );
                })}

                {/* دکمه‌های نویگیشن اختصاصی (بیرون از اسلایدها برای جلوگیری از باگ کلیک) */}
                <div className="custom-prev-btn absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all z-20 cursor-pointer hidden md:flex items-center justify-center active:scale-90 hover:scale-110 opacity-0 group-hover:opacity-100">
                    <ChevronLeft size={32} />
                </div>
                <div className="custom-next-btn absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all z-20 cursor-pointer hidden md:flex items-center justify-center active:scale-90 hover:scale-110 opacity-0 group-hover:opacity-100">
                    <ChevronRight size={32} />
                </div>
            </Swiper>
        </div>
    );
}

// 2. CAROUSEL SECTION (FIXED: Draggable, View All, Overflow Clip)
function CarouselSection({ title, items, router, watchlistIds, onToggle, categoryId }: any) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    if (!items || items.length === 0) return null;

    // --- DRAG LOGIC ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rowRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - rowRef.current.offsetLeft);
        setScrollLeft(rowRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !rowRef.current) return;
        e.preventDefault();
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX) * 2; // ضریب سرعت درگ
        rowRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="space-y-4 group/section relative">
            {/* Header: Title + View All */}
            {title && (
                <div className="flex items-center justify-between px-2 mr-2 border-r-4 border-[#ccff00]">
                    <h2 className="text-lg md:text-xl font-black text-white/90 cursor-default">{title}</h2>
                    
                    {/* ✅ FIX: دکمه مشاهده همه */}
                    <button 
                        onClick={() => router.push(`/dashboard/category/${categoryId}`)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ccff00] transition-colors cursor-pointer"
                    >
                        <span>مشاهده همه</span>
                        <ArrowLeft size={14} />
                    </button>
                </div>
            )}
            
            <div className="relative">
                {/* Navigation Buttons (Hidden if dragging) */}
                {!isDragging && (
                   <>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                            className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black/80 to-transparent z-20 flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity duration-300 cursor-pointer md:flex hidden"
                        >
                            <ChevronLeft className="text-white hover:text-[#ccff00] drop-shadow-lg" size={32} />
                        </button>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                            className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black/80 to-transparent z-20 flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-opacity duration-300 cursor-pointer md:flex hidden"
                        >
                            <ChevronRight className="text-white hover:text-[#ccff00] drop-shadow-lg" size={32} />
                        </button>
                   </>
                )}

                {/* ✅ FIX: Added padding (py-8) - جلوگیری از کات شدن هنگام هاور */}
                <div 
                    ref={rowRef} 
                    className={`flex gap-4 overflow-x-auto px-4 py-8 -my-8 no-scrollbar scroll-smooth cursor-grab ${isDragging ? 'cursor-grabbing snap-none' : 'snap-x'}`}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {items.map((show: any) => (
                        <div key={show.id} className="snap-center shrink-0 w-[130px] md:w-[160px] pointer-events-auto">
                            {/* Pass Drag State to prevent click after drag */}
                            <ShowCard 
                                show={show} 
                                isAdded={watchlistIds.has(show.id)} 
                                onClick={() => !isDragging && router.push(`/dashboard/tv/${show.id}`)} 
                                onToggle={() => onToggle(show.id)} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ShowCard({ show, isAdded, onClick, onToggle }: any) {
    return (
        <div onClick={onClick} className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00] transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-30">
            <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer ${isAdded ? 'bg-[#ccff00] text-black' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}>
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

function DashboardFooter() {
    return (
        <footer className="mt-20 border-t border-white/5 bg-[#080808] relative z-10">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
                            <span className="text-xl font-black text-white">Binger</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed max-w-sm text-justify">
                            بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی. هدف ما خلق بهترین تجربه برای عاشقان سینماست.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">دسترسی سریع</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">تازه ترین ها</a></li>
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">برترین های IMDB</a></li>
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">انیمه</a></li>
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">سوالات متداول</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">ما را دنبال کنید</h4>
                        <div className="flex gap-4">
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Twitter size={18} /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Instagram size={18} /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all cursor-pointer"><Github size={18} /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © ۲۰۲۵ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        Made with <Heart size={12} className="text-red-500 fill-red-500 animate-pulse" /> for Movie Lovers
                    </div>
                </div>
            </div>
        </footer>
    );
}