"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getShowDetails, getImageUrl, getGlobalAiringShows } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar as CalIcon, ArrowRight, List, Grid, Zap, AlertCircle } from 'lucide-react';
import EpisodeModal from '../components/EpisodeModal';

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allUpcomingEpisodes, setAllUpcomingEpisodes] = useState<any[]>([]);
  const [selectedEpData, setSelectedEpData] = useState<any>(null);
  const [myShowsCount, setMyShowsCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); 
  const [hasGlobalTrends, setHasGlobalTrends] = useState(false); 

  useEffect(() => {
    const fetchCalendar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      // 1. گرفتن دیتای تماشای کاربر برای محاسبه درصد
      const { data: watchedData } = await supabase.from('watched').select('show_id');
      const watchedMap: any = {};
      watchedData?.forEach((w: any) => {
          watchedMap[w.show_id] = (watchedMap[w.show_id] || 0) + 1;
      });

      const p1 = supabase.from('watched').select('show_id').eq('user_id', user.id);
      const p2 = supabase.from('watchlist').select('show_id').eq('user_id', user.id);
      const [wRes, lRes] = await Promise.all([p1, p2]);

      const myShowIds = new Set<number>();
      wRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      lRes.data?.forEach((i: any) => myShowIds.add(i.show_id));
      
      const uniqueMyIds = Array.from(myShowIds);

      // 2. سریال‌های من (با محاسبه پیشرفت)
      let myUpcoming: any[] = [];
      if (uniqueMyIds.length > 0) {
        const showsData = await Promise.all(uniqueMyIds.map(async (id) => await getShowDetails(String(id))));
        
        myUpcoming = showsData
          .filter((s: any) => s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date())
          .map((s: any) => {
              // محاسبه پیشرفت
              const totalReleased = s.seasons?.reduce((sum: number, season: any) => sum + (season.air_date && new Date(season.air_date) <= new Date() ? season.episode_count : 0), 0) || 0;
              const userWatched = watchedMap[s.id] || 0;
              const progress = totalReleased > 0 ? Math.round((userWatched / totalReleased) * 100) : 0;

              return { ...s, isMine: true, progress };
          });
      }
      setMyShowsCount(myUpcoming.length);

      // 3. ترند جهانی (بدون پیشرفت)
      const globalData = await getGlobalAiringShows();
      const trending: any[] = globalData.map((s: any) => ({ ...s, isMine: false, progress: 0 }));
      
      const allShowsMap = new Map();
      myUpcoming.forEach(s => allShowsMap.set(s.id, s));
      
      trending.forEach(s => {
          if (!myShowIds.has(s.id)) {
              allShowsMap.set(s.id, s);
          }
      });
      
      if (allShowsMap.size > myUpcoming.length) {
          setHasGlobalTrends(true);
      }
      
      const finalSortedList = Array.from(allShowsMap.values()).sort((a: any, b: any) => 
        new Date(a.next_episode_to_air.air_date).getTime() - new Date(b.next_episode_to_air.air_date).getTime()
      );

      setAllUpcomingEpisodes(finalSortedList);
      setLoading(false);
    };

    fetchCalendar();
  }, []);

  const getDaysLeft = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "پخش: همین امروز! 🔥";
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays === 1) return "پخش: فردا";
    if (diffDays <= 7) return `پخش: ${diffDays} روز دیگر`;
    
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const openModal = (item: any) => {
    setSelectedEpData({
        showId: item.id,
        season: item.next_episode_to_air.season_number,
        number: item.next_episode_to_air.episode_number
    });
  };

  const RenderEpisodeCard = (item: any) => {
    const dateText = getDaysLeft(item.next_episode_to_air.air_date);
    const isToday = dateText.includes("امروز");
    
    // نوار پیشرفت (فقط برای سریال‌های من)
    const ProgressBar = () => item.isMine && (
        <div className="mt-3 w-full h-1 bg-white/5 rounded-full overflow-hidden flex items-center gap-2">
             <div className={`h-full ${item.progress >= 90 ? 'bg-green-500' : 'bg-cyan-400'}`} style={{ width: `${item.progress}%` }}></div>
        </div>
    );

    if (viewMode === 'list') {
        return (
            <div 
                key={item.id}
                onClick={() => openModal(item)}
                className="bg-white/5 border border-white/5 hover:border-cyan-500/50 hover:bg-white/10 rounded-2xl p-4 flex gap-4 transition-all cursor-pointer group shadow-lg"
            >
                <img src={getImageUrl(item.poster_path)} className="w-16 h-24 object-cover rounded-xl shadow-md shrink-0" />
                
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <h3 className="font-black text-lg text-white line-clamp-1">{item.name}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${isToday ? 'bg-red-500/20 text-red-400' : 'bg-[#ccff00]/10 text-[#ccff00]'}`}>
                            {dateText}
                        </span>
                    </div>
                    
                    <div className="mt-2 text-gray-400 text-sm ltr text-right flex items-center justify-end gap-2">
                        <span className="font-medium">{item.next_episode_to_air.name}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>S{item.next_episode_to_air.season_number} | E{item.next_episode_to_air.episode_number}</span>
                    </div>
                    
                    <div className="mt-2 text-[10px] text-gray-500 flex justify-between items-center">
                        <span>{item.isMine ? "شما این سریال را دنبال می‌کنید" : "ترند جهانی"}</span>
                        {item.isMine && <span>{item.progress}% دیده شده</span>}
                    </div>
                    <ProgressBar />
                </div>
            </div>
        );
    }
    
    return (
        <div 
            key={item.id}
            onClick={() => openModal(item)}
            className="group relative aspect-[2/3] bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300 border border-white/5 hover:border-cyan-500/50"
        >
            <img 
                src={getImageUrl(item.poster_path)} 
                alt={item.name}
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
            
            <div className="absolute bottom-0 p-3 w-full">
                <h3 className="text-sm font-bold text-white line-clamp-1 ltr text-left">{item.name}</h3>
                <div className="flex justify-between items-center mt-1">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-red-400' : 'text-[#ccff00]'}`}>{dateText}</span>
                    {item.isMine && <span className="text-[10px] text-cyan-400">{item.progress}%</span>}
                </div>
                {item.isMine && <div className="mt-1 w-full h-0.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${item.progress}%` }}></div></div>}
            </div>
        </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-4 md:p-8 pb-20">
      
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

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer">
              <ArrowRight size={20} />
          </button>
          <h1 className="text-2xl font-black flex items-center gap-2">
              <CalIcon className="text-[#ccff00]" />
              مرکز پخش {myShowsCount > 0 ? `(${myShowsCount} سریال)` : ''}
          </h1>
        </div>

        {/* دکمه‌های حالت نمایش */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#ccff00] text-black' : 'text-gray-400 hover:bg-white/10'}`}
            >
                <List size={20} />
            </button>
            <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[#ccff00] text-black' : 'text-gray-400 hover:bg-white/10'}`}
            >
                <Grid size={20} />
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20 text-[#ccff00]"><Loader2 className="animate-spin" size={40} /></div>
      ) : allUpcomingEpisodes.length > 0 ? (
        <div className="max-w-4xl mx-auto space-y-4">
            
            <p className="text-gray-400 text-sm text-center max-w-2xl mx-auto mb-10">
                اینجا تمام اپیزودهایی که به زودی پخش می‌شوند، به ترتیب زمانی نمایش داده شده‌اند.
            </p>

            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
                {allUpcomingEpisodes.map((item, index) => (
                    <React.Fragment key={item.id}>
                        
                        {!item.isMine && index > 0 && allUpcomingEpisodes[index-1].isMine && (
                            <div className={`my-8 ${viewMode === 'grid' ? 'col-span-full' : 'w-full'}`}>
                                <div className="flex items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink mx-4 text-gray-500 text-sm flex items-center gap-2">
                                        <Zap size={16} className="text-red-400" />
                                        سریال‌های در حال پخش جهانی
                                    </span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>
                            </div>
                        )}
                        
                        {RenderEpisodeCard(item)}
                    </React.Fragment>
                ))}
            </div>
            
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500 gap-4 text-center">
            <AlertCircle size={64} strokeWidth={1} />
            <p className="text-lg">هیچ قسمت جدیدی تو راه نیست! سریال جدیدی را به واچ‌لیست خود اضافه کنید.</p>
            <button 
                onClick={() => router.push('/dashboard')}
                className="bg-[#ccff00] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#b3e600] transition-colors mt-4 cursor-pointer"
            >
                پیدا کردن سریال
            </button>
        </div>
      )}

    </div>
  );
}