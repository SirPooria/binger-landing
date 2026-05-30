"use client";

import React, { useEffect, useState } from 'react';
// 👇 تغییر ۱: استفاده از کلاینت جدید
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ListChecks, Bookmark, Eye, Clock, Tv } from 'lucide-react';

export default function MyListsPage() {
  // 👇 تغییر ۲: ساخت نمونه کلاینت سوپابیس (با as any برای جلوگیری از ارور تایپ)
  const supabase = createClient() as any;
  
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'watched' | 'watchlist'>('watched');
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // وضعیت تماشا (برای تب Watched)
  const [watchedStatus, setWatchedStatus] = useState<any>({});
  // تعداد سریال‌های هر بخش (برای نمایش در تب‌ها)
  const [myShowsCount, setMyShowsCount] = useState({ watched: 0, watchlist: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setShows([]); 
      setWatchedStatus({});

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      let uniqueShowIds: number[] = [];
      let allWatchedEps: any[] = [];
      
      // 1. گرفتن آیدی‌های سریال‌ها بر اساس تب
      const { data: watchedIds } = await supabase.from('watched').select('show_id, episode_id').eq('user_id', user.id);
      const { data: watchlistIds } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id);
      
      if (watchedIds) {
        allWatchedEps = watchedIds;
        setMyShowsCount(prev => ({ ...prev, watched: Array.from(new Set(watchedIds.map((item: any) => item.show_id))).length }));
      }
      if (watchlistIds) {
         setMyShowsCount(prev => ({ ...prev, watchlist: watchlistIds.length }));
      }
      
      if (activeTab === 'watched') {
        if (watchedIds) uniqueShowIds = Array.from(new Set(watchedIds.map((item: any) => item.show_id)));
      } else {
        if (watchlistIds) uniqueShowIds = watchlistIds.map((item: any) => item.show_id);
      }
      
      // 2. گرفتن اطلاعات هر سریال از TMDB
      if (uniqueShowIds.length > 0) {
        const showsData = await Promise.all(
          uniqueShowIds.map(async (id) => {
            // جزئیات را کامل می‌گیریم (برای تعداد اپیزودها)
            return await getShowDetails(String(id));
          })
        );
        
        const validShows = showsData.filter(s => s !== null);
        setShows(validShows);

        // 3. محاسبه پیشرفت (فقط برای تب Watched)
        if (activeTab === 'watched') {
            const status: any = {};
            validShows.forEach(show => {
                // مجموع اپیزودهای پخش شده (شامل تمام فصولی که تاریخشان گذشته)
                const totalReleasedEps = show.seasons?.reduce((sum: number, season: any) => {
                    return sum + (season.air_date && new Date(season.air_date) <= new Date() ? season.episode_count : 0);
                }, 0) || 0;
                
                // تعداد اپیزودهای دیده شده کاربر
                const watchedCount = allWatchedEps.filter(ep => ep.show_id === show.id).length;
                
                const percentage = totalReleasedEps > 0 ? Math.round((watchedCount / totalReleasedEps) * 100) : 0;

                status[show.id] = {
                    watchedCount,
                    totalReleasedEps,
                    percentage
                };
            });
            setWatchedStatus(status);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [activeTab]); // وابسته به تغییر تب

  const RenderShowCard = (show: any) => {
    const status = watchedStatus[show.id] || { watchedCount: 0, totalReleasedEps: 0, percentage: 0 };
    const isCompleted = status.percentage >= 100 && status.totalReleasedEps > 0;
    
    return (
        <div 
            key={show.id}
            onClick={() => router.push(`/dashboard/tv/${show.id}`)}
            className="group relative aspect-[2/3] bg-white/5 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300 border border-white/5 hover:border-[#ccff00]/50 shadow-xl"
        >
            <img 
                src={getImageUrl(show.poster_path)} 
                alt={show.name}
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            />
            
            {/* گرادینت پایین */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            
            <div className="absolute bottom-0 p-4 w-full">
                <h3 className="text-lg font-bold text-white line-clamp-1 ltr text-left">{show.name}</h3>
                
                {/* بخش وضعیت/پیشرفت */}
                {activeTab === 'watched' && (
                    <div className="mt-2">
                        {/* نوار پیشرفت */}
                        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
                            <div 
                                className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-cyan-400'}`} 
                                style={{ width: `${status.percentage}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                             {/* وضعیت متنی */}
                             <span className={`font-bold ${isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>
                                {isCompleted ? 'تکمیل شده!' : 'در حال تماشا'}
                             </span>
                             <span className="ltr">
                                {status.watchedCount} / {status.totalReleasedEps} Eps
                             </span>
                        </div>
                    </div>
                )}

                {activeTab === 'watchlist' && (
                    <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
                        <Clock size={14} className="text-purple-400" />
                        <span>{show.number_of_seasons} فصل</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full mx-1"></span>
                        <span className="text-white text-xs">{show.status}</span>
                    </div>
                )}
            </div>
        </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20 pt-28 md:pt-32">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
            <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-black flex items-center gap-2">
            <ListChecks className="text-[#ccff00]" />
            سریال های من
        </h1>
      </div>

      {/* TABS */}
      <div className="flex bg-white/5 p-1 rounded-xl w-full max-w-md mb-8 border border-white/10 mx-auto">
        <button
            onClick={() => setActiveTab('watched')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'watched' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
        >
            <Eye size={18} />
            <span>در حال تماشا ({myShowsCount.watched})</span> 
        </button>
        <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'watchlist' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
        >
            <Bookmark size={18} />
            <span>لیست تماشا ({myShowsCount.watchlist})</span> 
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center mt-20 text-[#ccff00]">
            <Loader2 className="animate-spin" size={40} />
        </div>
      ) : shows.length > 0 ? (
        // Grid نمایش سریال‌ها
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {shows.map(RenderShowCard)}
        </div>
      ) : (
        // حالت خالی (Empty State)
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500 gap-4">
            <Tv size={64} strokeWidth={1} />
            <p className="text-lg">
                {activeTab === 'watched' ? 'هنوز هیچ سریالی رو شروع نکردی!' : 'لیست تماشا خالیه!'}
            </p>
            <button 
                onClick={() => router.push('/dashboard')}
                className="bg-[#ccff00] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#b3e600] transition-colors cursor-pointer"
            >
                پیدا کردن سریال
            </button>
        </div>
      )}

    </div>
  );
}