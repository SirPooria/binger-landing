"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getTrendingShows, getIranianShows, getNewestIranianShows,
  getLatestAnime, getAsianDramas, getNewestGlobal, getImageUrl 
} from '@/lib/tmdbClient';
import { Loader2, ArrowRight, Star, Calendar } from 'lucide-react';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  
  // اطمینان از اینکه id حتما string است
  const categoryId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId) return;

      setLoading(true);
      let data: any[] = [];
      let title = "";

      try {
        // --- منطق انتخاب دسته‌بندی ---
        // این کیس‌ها باید با categoryId هایی که در فایل Dashboard دادی یکی باشند
        switch (categoryId) {
          case 'new-iranian':
            data = await getNewestIranianShows();
            title = "تازه‌های نمایش خانگی ایران";
            break;
            
          case 'pop-iranian':
            data = await getIranianShows();
            title = "پرطرفدارترین‌های ایرانی";
            break;
            
          case 'trending':
            data = await getTrendingShows();
            title = "پربازدیدترین‌های هفته (جهان)";
            break;
            
          case 'new-global':
            data = await getNewestGlobal();
            title = "جدیدترین‌های دنیا";
            break;
            
          case 'anime':
            data = await getLatestAnime();
            title = "دنیای انیمه";
            break;
            
          case 'asian':
            data = await getAsianDramas();
            title = "سریال‌های کره‌ای و آسیایی";
            break;
            
          // اگر دسته‌بندی ناشناخته بود یا 'top' (که لاجیک پیچیده داشت)
          default:
            data = await getTrendingShows();
            title = "لیست سریال‌ها";
        }
      } catch (error) {
        console.error("Error fetching category:", error);
      } finally {
        setShows(data || []);
        setPageTitle(title);
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
        <button 
          onClick={() => router.back()} 
          className="bg-white/5 hover:bg-[#ccff00] hover:text-black p-3 rounded-xl transition-all active:scale-95 cursor-pointer border border-white/10"
        >
          <ArrowRight size={20} />
        </button>
        <div>
           <h1 className="text-xl md:text-3xl font-black text-[#ccff00] drop-shadow-lg">{pageTitle}</h1>
           <p className="text-gray-500 text-xs md:text-sm mt-1">مشاهده لیست کامل</p>
        </div>
      </div>

      {/* --- CONTENT --- */}
      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-[#ccff00]">
          <Loader2 className="animate-spin" size={48} />
          <p className="text-sm font-bold animate-pulse">در حال دریافت لیست...</p>
        </div>
      ) : shows.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {shows.map((show) => (
            <div 
              key={show.id} 
              onClick={() => router.push(`/dashboard/tv/${show.id}`)}
              className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00] transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10"
            >
              <img 
                src={getImageUrl(show.poster_path)} 
                alt={show.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                loading="lazy" 
              />
              
              {/* گرادینت روی عکس */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-[#000000]/40 to-transparent opacity-80"></div>
              
              {/* اطلاعات کارت */}
              <div className="absolute bottom-0 p-3 w-full flex flex-col gap-1">
                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1 text-right" dir="auto">
                  {show.name}
                </h3>
                
                <div className="flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-gray-300 flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded">
                      <Calendar size={10} />
                      {show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'}
                    </span>
                    <span className="text-[10px] text-[#ccff00] font-bold flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded border border-[#ccff00]/30">
                      <Star size={10} fill="#ccff00" /> 
                      {show.vote_average ? show.vote_average.toFixed(1) : '0'}
                    </span>
                </div>
              </div>

              {/* برچسب کشور (اختیاری) */}
              {show.origin_country?.includes('IR') && (
                <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md">
                    IR
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>موردی در این دسته‌بندی یافت نشد.</p>
            <button onClick={() => router.back()} className="mt-4 text-[#ccff00] underline">بازگشت</button>
        </div>
      )}
    </div>
  );
}