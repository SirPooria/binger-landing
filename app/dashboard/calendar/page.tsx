"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl, getGlobalAiringShows, getBackdropUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar as CalIcon, ArrowRight, Clock, Zap, AlertCircle, CheckCircle, PlayCircle } from 'lucide-react';
import EpisodeModal from '../components/EpisodeModal';

export default function CalendarPage() {
  const router = useRouter();
  // استفاده از as any برای جلوگیری از ارورهای تایپ‌اسکریپت
  const supabase = createClient() as any;
  
  const [loading, setLoading] = useState(true);
  const [myEpisodes, setMyEpisodes] = useState<any[]>([]);
  const [globalEpisodes, setGlobalEpisodes] = useState<any[]>([]);
  const [selectedEpData, setSelectedEpData] = useState<any>(null);

  useEffect(() => {
    const fetchCalendar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      // 1. دریافت لیست سریال‌های کاربر
      const p1 = supabase.from('watched').select('show_id').eq('user_id', user.id);
      const p2 = supabase.from('watchlist').select('show_id').eq('user_id', user.id);
      const [wRes, lRes] = await Promise.all([p1, p2]);

      const myShowIds = new Set<number>();
      wRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      lRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      
      const uniqueMyIds = Array.from(myShowIds);

      // 2. دریافت جزئیات سریال‌های من و فیلتر کردن اپیزودهای آینده
      let myUpcoming: any[] = [];
      if (uniqueMyIds.length > 0) {
        // برای جلوگیری از کندی، فقط ۲۰ تای آخر را می‌گیریم (در نسخه واقعی باید صفحه‌بندی شود)
        const recentIds = uniqueMyIds.slice(0, 20);
        const showsData = await Promise.all(recentIds.map(async (id) => await getShowDetails(String(id))));
        
        myUpcoming = showsData
          .filter((s: any) => s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date())
          .map((s: any) => ({ ...s, isMine: true }));
      }

      // 3. دریافت ترندهای جهانی در حال پخش
      const globalData = await getGlobalAiringShows();
      const trending = globalData
        .filter((s: any) => !myShowIds.has(s.id)) // حذف تکراری‌ها (اگر کاربر خودش فالو کرده)
        .map((s: any) => ({ ...s, isMine: false }));
      
      // مرتب‌سازی بر اساس تاریخ پخش (نزدیک‌ترین اول)
      const sortFn = (a: any, b: any) => new Date(a.next_episode_to_air.air_date).getTime() - new Date(b.next_episode_to_air.air_date).getTime();

      setMyEpisodes(myUpcoming.sort(sortFn));
      setGlobalEpisodes(trending.sort(sortFn));
      setLoading(false);
    };

    fetchCalendar();
  }, []);

  const openModal = (item: any) => {
    setSelectedEpData({
        showId: item.id,
        season: item.next_episode_to_air.season_number,
        number: item.next_episode_to_air.episode_number
    });
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-[#050505] flex justify-center items-center pt-20 text-[#ccff00]">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );
  }

  return (
    // 👇 اصلاح لی‌اوت: اضافه کردن پدینگ بالا برای جلوگیری از تداخل با هدر
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20 pt-28 md:pt-32">
      
      {/* MODAL */}
      {selectedEpData && (
        <EpisodeModal 
            showId={selectedEpData.showId}
            seasonNum={selectedEpData.season}
            episodeNum={selectedEpData.number}
            onClose={() => setSelectedEpData(null)}
            onWatchedChange={() => {}}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
          <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
              <ArrowRight size={20} />
          </button>
          <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                  <CalIcon className="text-[#ccff00]" />
                  تقویم پخش
              </h1>
              <p className="text-xs text-gray-400 mt-1">برنامه زمانی پخش سریال‌های شما و جهان</p>
          </div>
      </div>

      {myEpisodes.length === 0 && globalEpisodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-10 text-gray-500 gap-4 text-center bg-white/5 p-10 rounded-3xl border border-white/5 border-dashed">
            <AlertCircle size={64} strokeWidth={1} />
            <p className="text-lg">هیچ قسمت جدیدی تو راه نیست!</p>
            <button 
                onClick={() => router.push('/dashboard')}
                className="bg-[#ccff00] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#b3e600] transition-colors mt-4 cursor-pointer"
            >
                پیدا کردن سریال جدید
            </button>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-12">
            
            {/* 1. لیست سریال‌های من (اولویت بالا) */}
            {myEpisodes.length > 0 && (
                <section className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-6 border-r-4 border-[#ccff00] pr-3">
                        <CheckCircle className="text-[#ccff00]" size={24} />
                        <h2 className="text-xl font-black text-white">سریال‌های من</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {myEpisodes.map((item) => (
                            <LandscapeCard key={item.id} item={item} onClick={() => openModal(item)} isMine={true} />
                        ))}
                    </div>
                </section>
            )}

            {/* 2. لیست جهانی (پیشنهادی) */}
            {globalEpisodes.length > 0 && (
                <section className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="flex items-center gap-2 mb-6 border-r-4 border-red-500 pr-3">
                        <Zap className="text-red-500 fill-red-500" size={24} />
                        <h2 className="text-xl font-black text-white">پخش جهانی (پیشنهادی)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {globalEpisodes.map((item) => (
                            <LandscapeCard key={item.id} item={item} onClick={() => openModal(item)} isMine={false} />
                        ))}
                    </div>
                </section>
            )}

        </div>
      )}

    </div>
  );
}

// --- کامپوننت کارت افقی جدید (Landscape) ---
const LandscapeCard = ({ item, onClick, isMine }: any) => {
    const ep = item.next_episode_to_air;
    
    // محاسبه زمان باقی‌مانده
    const getDaysLeft = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (isToday) return { text: "پخش: امروز! 🔥", color: "bg-[#ccff00] text-black" };
        if (diffDays === 1) return { text: "پخش: فردا", color: "bg-white text-black" };
        if (diffDays <= 7) return { text: `${diffDays} روز دیگر`, color: "bg-white/20 text-white" };
        return { text: new Date(dateString).toLocaleDateString('fa-IR'), color: "bg-white/10 text-gray-300" };
    };

    const status = getDaysLeft(ep.air_date);

    return (
        <div 
            onClick={onClick}
            className={`group relative aspect-video w-full rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 hover:scale-[1.02] shadow-xl ${isMine ? 'border-[#ccff00]/30 hover:border-[#ccff00]' : 'border-white/5 hover:border-white/20'}`}
        >
            {/* تصویر پس‌زمینه (Backdrop) */}
            <img 
                src={getBackdropUrl(item.backdrop_path || item.poster_path)} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* گرادینت برای خوانایی متن */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

            {/* بج وضعیت زمان */}
            <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1 ${status.color}`}>
                <Clock size={12} /> {status.text}
            </div>

            {/* محتوای متنی پایین */}
            <div className="absolute bottom-0 left-0 w-full p-4 md:p-5">
                <h3 className="text-lg md:text-xl font-black text-white leading-tight mb-1 drop-shadow-md group-hover:text-[#ccff00] transition-colors line-clamp-1">{item.name}</h3>
                
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-200 flex items-center gap-2">
                            {ep.name || `Episode ${ep.episode_number}`}
                        </span>
                        <span className="text-xs text-gray-400 ltr text-right font-mono mt-0.5">
                            S{ep.season_number} | E{ep.episode_number}
                        </span>
                    </div>

                    <div className="bg-white/10 p-2 rounded-full backdrop-blur-md group-hover:bg-[#ccff00] group-hover:text-black transition-colors">
                        <PlayCircle size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};