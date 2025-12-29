"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { 
  getTrendingShows, getImageUrl, getBackdropUrl, 
  getShowDetails, getIranianShows, getNewestIranianShows,
  getNewestGlobal, getRecommendations
} from '@/lib/tmdbClient';
import { 
  AlertTriangle, Plus, Info, Check, Bookmark, 
  Activity, ChevronLeft, ChevronRight, Twitter, Instagram, Sparkles,
  Trash2, ArrowLeft, Flame, Star
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

// --- SKELETON LOADER ---
const DashboardSkeleton = () => (
  <div className="w-full min-h-screen bg-[#050505] p-6 space-y-10 animate-pulse pt-24">
     <div className="w-full h-[50vh] bg-white/5 rounded-3xl relative overflow-hidden" />
     {[1, 2].map((i) => (
         <div key={i} className="space-y-4">
             <div className="w-48 h-6 bg-white/10 rounded-lg"></div>
             <div className="flex gap-4 overflow-hidden">
               {[1, 2, 3, 4, 5].map((j) => (
                     <div key={j} className="w-40 h-60 bg-white/5 rounded-2xl shrink-0"></div>
                 ))}
             </div>
         </div>
     ))}
  </div>
);

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
       <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const [heroShows, setHeroShows] = useState<any[]>([]); 
  const [myFeed, setMyFeed] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any>({});

  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiSourceShow, setAiSourceShow] = useState<string | null>(null); 

  // --- Main Data Logic ---
  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // FIX: Better redirect
        if (!user) { 
            router.replace('/login'); 
            return; 
        }
        setUser(user);

        const { data: wList } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
        
        // OPTIMIZATION: Limit the query to avoid fetching huge data
        const { data: watched } = await supabase.from('watched')
            .select('show_id')
            .eq('user_id', user.id)
            .limit(100); 

        const wIds = wList?.map((i: any) => i.show_id) || [];
        const wEdIds = watched?.map((i: any) => i.show_id) || [];
        
        // Combine distinct IDs
        const allUserShowIds = Array.from(new Set([...wIds, ...wEdIds]));
        setWatchlistIds(new Set(wIds));

        // Logic for "Continue Watching" (My Feed)
        if (allUserShowIds.length > 0) {
            // Take only last 10 for performance
            const recentIds = allUserShowIds.reverse().slice(0, 10); 
            
            const myShowsPromises = recentIds.map(id => getShowDetails(String(id)).catch(() => null));
            const myShowsRaw = await Promise.all(myShowsPromises);
            setMyFeed(myShowsRaw.filter(s => s !== null));

            // Recommendation Logic
            const randomSeedId = allUserShowIds[Math.floor(Math.random() * allUserShowIds.length)];
            const [seedDetails, recs] = await Promise.all([
                getShowDetails(String(randomSeedId)),
                getRecommendations(randomSeedId)
            ]);
            if (recs && recs.length > 0) {
                setAiRecs(recs);
                setAiSourceShow(seedDetails?.name || "سلیقه شما");
            }
        }

        const fetchSafely = async (fn: () => Promise<any>, fallback: any[]) => {
            try { return await fn(); } catch (e) { return fallback; }
        };

        // OPTIMIZATION: Removed extra categories for MVP speed
        const [trend, global, popIr, newIr] = await Promise.all([
            fetchSafely(getTrendingShows, []),
            fetchSafely(getNewestGlobal, []),
            fetchSafely(getIranianShows, []),        
            fetchSafely(getNewestIranianShows, [])    
        ]);

        if (trend.length > 0) {
            const topIranian = newIr.length > 0 ? [newIr[0]] : [];
            const topGlobal = trend.slice(0, topIranian.length > 0 ? 4 : 5);
            setHeroShows([...topIranian, ...topGlobal]);
        }

        // Removed heavy "Top Binger" calculation loop for MVP

        setCategories({
            newIranian: newIr || [],
            popularIranian: popIr || [],
            trending: trend ? trend.slice(0, 10) : [],
            newGlobal: global || [],
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
          else await supabase.from('watchlist').insert([{ user_id: user.id, show_id: showId }] as any);
      }
  };

  if (loading) return <DashboardSkeleton />;
  if (errorMsg) return <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4 pt-20"><AlertTriangle size={48} /><p>{errorMsg}</p></div>;

  return (
    <div className="animate-in fade-in duration-700 relative w-full overflow-hidden flex flex-col min-h-screen bg-[#050505]">
        
        {toastMsg && (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#ccff00] text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
                <Info size={20} /> {toastMsg}
            </div>
        )}

        {/* 1. HERO SLIDER */}
        {heroShows.length > 0 && <HeroSlider shows={heroShows} router={router} watchlistIds={watchlistIds} onToggle={toggleWatchlist} />}

        {/* 2. CONTENT AREA */}
        <div className="relative z-10 px-4 md:px-8 pb-10 space-y-12 md:space-y-16 flex-1 -mt-10">
            
            {myFeed.length > 0 && (
                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-[#ccff00] animate-pulse" size={24} />
                        <h2 className="text-lg md:text-2xl font-black text-white">ادامه تماشا</h2>
                    </div>
                    <CarouselSection items={myFeed} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                </div>
            )}

            {aiRecs.length > 0 && (
                <div className="relative bg-gradient-to-r from-[#ccff00]/5 to-transparent border border-[#ccff00]/10 rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={24} className="text-[#ccff00]" />
                        <h2 className="text-lg md:text-2xl font-black text-white">
                             چون <span className="text-[#ccff00] underline decoration-wavy underline-offset-4">{aiSourceShow}</span> رو دیدی:
                        </h2>
                    </div>
                    <CarouselSection items={aiRecs} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} />
                </div>
            )}
            
            <CarouselSection title="تازه‌های نمایش خانگی ایران" items={categories.newIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-iranian" />
            <CarouselSection title="پرطرفدارترین‌های ایرانی" items={categories.popularIranian} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="pop-iranian" />
            
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Flame className="text-red-500 fill-red-500" />
                    <h2 className="text-xl font-black text-white">ترندهای جهانی</h2>
                </div>
                <CarouselSection items={categories.trending} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="trending" />
            </div>

            <CarouselSection title="جدیدترین‌های دنیا" items={categories.newGlobal} watchlistIds={watchlistIds} router={router} onToggle={toggleWatchlist} categoryId="new-global" />
            
            {/* Removed Anime/Asian for MVP Speed */}
        </div>

        <DashboardFooter />
    </div>
  );
}

// --- COMPONENTS ---

function HeroSlider({ shows, router, watchlistIds, onToggle }: any) {
    if (shows.length === 0) return null;
    return (
        <div className="relative w-full h-[60vh] md:h-[75vh] group mb-8">
            <Swiper
                modules={[Navigation, Autoplay, EffectFade]}
                loop={true}
                speed={1000}
                grabCursor={true}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                autoplay={{ delay: 6000, disableOnInteraction: false }}
                navigation={{ nextEl: '.custom-next-btn', prevEl: '.custom-prev-btn' }}
                className="w-full h-full"
                dir="ltr"
            >
                {shows.map((show: any, index: number) => {
                    const isAdded = watchlistIds.has(show.id);
                    const hasPersianName = show.name !== show.original_name;
                    const overviewText = show.overview || "توضیحات این سریال به زودی تکمیل می‌شود...";
                    const isPersianOverview = /[\u0600-\u06FF]/.test(overviewText);

                    return (
                        <SwiperSlide key={show.id} className="w-full h-full relative bg-[#050505]">
                            <div className="absolute inset-0">
                                <img src={getBackdropUrl(show.backdrop_path)} className="w-full h-full object-cover opacity-60" alt={show.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-transparent"></div>
                            </div>

                            <div className="absolute bottom-0 right-0 w-full md:w-2/3 p-6 md:p-16 flex flex-col items-start gap-3 md:gap-4 pb-16 md:pb-24 z-10" dir="rtl">
                                <div className="flex items-center gap-2">
                                    <span className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-lg">TOP #{index + 1}</span>
                                     {show.origin_country?.includes('IR') && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">ایران 🇮🇷</span>}
                                </div>
                                
                                <div>
                                    <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl leading-tight text-right">{show.name}</h1>
                                     {hasPersianName && <h2 className="text-sm md:text-2xl text-gray-300 font-bold mt-1 text-right ltr opacity-80 font-sans">{show.original_name}</h2>}
                                </div>
                                
                                <p className={`text-gray-200 text-xs md:text-sm leading-relaxed max-w-xl line-clamp-2 md:line-clamp-3 text-justify ${isPersianOverview ? 'text-right dir-rtl' : 'text-left dir-ltr opacity-90'}`}>
                                    {overviewText}
                                </p>
                                
                                <div className="flex gap-3 mt-2 w-full md:w-auto">
                                    <button onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="flex-1 md:flex-none bg-[#ccff00] hover:bg-[#b3e600] text-black px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                                        <Info size={20} /> <span className="md:inline">اطلاعات</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => onToggle(show.id)} 
                                        className={`flex-1 md:flex-none px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border transition-transform active:scale-95 cursor-pointer text-sm backdrop-blur-md ${
                                            isAdded 
                                            ? 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20' 
                                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                        }`}
                                    >
                                        {isAdded ? (
                                            <> <Trash2 size={20} /> <span className="hidden md:inline">حذف از لیست</span><span className="md:hidden">حذف</span> </>
                                        ) : (
                                            <> <Plus size={20} /> <span className="hidden md:inline">افزودن به لیست</span><span className="md:hidden">لیست</span> </>
                                        )}
                                     </button>
                                </div>
                            </div>
                        </SwiperSlide>
                    );
                })}

                <div className="custom-prev-btn absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all z-20 cursor-pointer hidden md:flex items-center justify-center active:scale-90 hover:scale-110 opacity-0 group-hover:opacity-100 shadow-lg">
                    <ChevronLeft size={24} />
                </div>
                <div className="custom-next-btn absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all z-20 cursor-pointer hidden md:flex items-center justify-center active:scale-90 hover:scale-110 opacity-0 group-hover:opacity-100 shadow-lg">
                    <ChevronRight size={24} />
                </div>
            </Swiper>
        </div>
    );
}

// 2. CAROUSEL SECTION
function CarouselSection({ title, items, router, watchlistIds, onToggle, categoryId }: any) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    if (!items || items.length === 0) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!rowRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - rowRef.current.offsetLeft);
        setScrollLeft(rowRef.current.scrollLeft);
    };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !rowRef.current) return;
        e.preventDefault();
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        rowRef.current.scrollLeft = scrollLeft - walk;
    };
    return (
        <div className="space-y-4 group/section relative z-0">
            {title && (
                <div className="flex items-center justify-between px-2 mr-2 border-r-4 border-[#ccff00] relative z-20">
                    <h2 className="text-lg md:text-xl font-black text-white/90 cursor-default">{title}</h2>
                    {categoryId && (
                        <button 
                            onClick={() => router.push(`/dashboard/category/${categoryId}`)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#ccff00] transition-colors cursor-pointer px-2 py-1 z-30 pointer-events-auto"
                        >
                            <span>مشاهده همه</span>
                            <ArrowLeft size={14} />
                        </button>
                    )}
                </div>
            )}
            
            <div className="relative group">
                {!isDragging && (
                    <>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                            className="absolute -left-6 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-3 rounded-full border border-white/10 z-50 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                        >
                             <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => rowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                            className="absolute -right-6 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-[#ccff00] hover:text-black text-white p-3 rounded-full border border-white/10 z-50 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                <div 
                    ref={rowRef} 
                    className={`flex gap-4 overflow-x-auto px-4 py-8 -my-8 no-scrollbar scroll-smooth cursor-grab relative z-10 ${isDragging ? 'cursor-grabbing snap-none' : 'snap-x'}`}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {items.map((show: any) => (
                        <div key={show.id} className="snap-center shrink-0 w-[130px] md:w-[160px] pointer-events-auto">
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

// 3. SHOW CARD (CLEAN VERSION - NO FAKE DATA)
function ShowCard({ show, isAdded, onClick, onToggle }: any) {
    return (
        <div onClick={onClick} className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(204,255,0,0.15)] hover:z-30">
            <img 
                src={getImageUrl(show.poster_path)} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                loading="lazy"
                alt={show.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-[#000000]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
            
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`absolute top-2 left-2 p-2 rounded-full backdrop-blur-md transition-all z-10 cursor-pointer shadow-lg hover:scale-110 active:scale-90 ${isAdded ? 'bg-[#ccff00] text-black' : 'bg-black/40 text-white hover:bg-white hover:text-black'}`}>
                {isAdded ? <Bookmark size={14} fill="black" /> : <Plus size={14} />}
            </button>
            
            <div className="absolute bottom-0 p-3 w-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1 text-right drop-shadow-md">{show.name}</h3>
                
                {show.vote_average > 0 && (
                    <div className="flex justify-end items-center mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-[#ccff00] flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded border border-white/20 font-bold">
                            <Star size={8} fill="#ccff00" /> {show.vote_average?.toFixed(1)}
                        </span>
                    </div>
                )}
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
                            بینجر پلتفرم هوشمند مدیریت و کشف سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">دسترسی سریع</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-[#ccff00]">تازه ترین ها</a></li>
                            <li><a href="#" className="hover:text-[#ccff00]">برترین های IMDB</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">ما را دنبال کنید</h4>
                        <div className="flex gap-4">
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Twitter size={18} /></a>
                            <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-[#ccff00] hover:text-black transition-all"><Instagram size={18} /></a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">© ۲۰۲۵ تمامی حقوق برای <span className="text-[#ccff00]">Binger</span> محفوظ است.</p>
                </div>
            </div>
        </footer>
    );
}