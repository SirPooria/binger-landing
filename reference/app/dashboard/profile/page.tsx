"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getShowDetails, getImageUrl } from '@/lib/tmdbClient';
import { 
  LogOut, LayoutGrid, History, 
  Tv, PlayCircle 
} from 'lucide-react';

// --- SKELETON LOADER ---
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-[#050505] p-6 pt-24 animate-pulse">
      <div className="flex flex-col items-center gap-4 mb-12">
          <div className="w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="w-40 h-6 bg-white/10 rounded"></div>
          <div className="flex gap-4">
               <div className="w-24 h-12 bg-white/5 rounded-xl"></div>
               <div className="w-24 h-12 bg-white/5 rounded-xl"></div>
          </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl"></div>)}
      </div>
  </div>
);

export default function ProfilePage() {
  const supabase = createClient() as any;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ watchedCount: 0, watchlistCount: 0 });
  
  const [activeTab, setActiveTab] = useState<'history' | 'watchlist'>('history');
  
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        setUser(user);

        // 1. Get Stats
        const { count: wCount } = await supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const { count: lCount } = await supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setStats({ watchedCount: wCount || 0, watchlistCount: lCount || 0 });

        // 2. Get Watchlist
        const { data: wListRaw } = await supabase.from('watchlist').select('show_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
        
        if (wListRaw && wListRaw.length > 0) {
            const promises = wListRaw.map((item: any) => getShowDetails(String(item.show_id)));
            const results = await Promise.all(promises);
            setWatchlist(results.filter(r => r)); 
        }

        // 3. Get History & FIX PROGRESS LOGIC
        const { data: allWatched } = await supabase.from('watched').select('show_id').eq('user_id', user.id);
        
        if (allWatched && allWatched.length > 0) {
            const watchedCounts: any = {};
            allWatched.forEach((item: any) => {
                watchedCounts[item.show_id] = (watchedCounts[item.show_id] || 0) + 1;
            });

            // Get unique shows (Top 20)
            const uniqueShowIds = Array.from(new Set(allWatched.map((item: any) => item.show_id).reverse())).slice(0, 20);
            const promises = uniqueShowIds.map((id: any) => getShowDetails(String(id)));
            const resultsRaw = await Promise.all(promises);
            
            const historyWithProgress = resultsRaw
                .filter(r => r)
                .map((show: any) => {
                    const watched = watchedCounts[show.id] || 0;
                    
                    // 👇👇👇 FIX START: محاسبه دقیق و سخت‌گیرانه 👇👇👇
                    let realTotal = 0;

                    // بررسی می‌کنیم که آیا لیست فصل‌ها وجود دارد؟
                    if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
                        realTotal = show.seasons
                            // فیلتر کردن فصل 0 (Specials) - تبدیل به عدد برای اطمینان
                            .filter((s: any) => Number(s.season_number) > 0 && s.name !== "Specials")
                            .reduce((acc: number, curr: any) => acc + (curr.episode_count || 0), 0);
                        
                        // برای دیباگ: اگر عدد پرت بود تو کنسول نشون بده
                        console.log(`Binger Calc for ${show.name}: Seasons=${show.seasons.length}, RealTotal=${realTotal}, TMDB_Total=${show.number_of_episodes}`);
                    }

                    // اگر محاسبه ما درست کار کرد (بیشتر از 0 شد) از اون استفاده کن، وگرنه برگرد به عدد کلی
                    const total = realTotal > 0 ? realTotal : (show.number_of_episodes || 1);
                    
                    // محاسبه درصد (سقف 100)
                    let progress = Math.round((watched / total) * 100);
                    if (progress > 100) progress = 100; // جلوگیری از باگ 101%

                    return { ...show, progress, watchedCount: watched, totalEpisodes: total };
                    // 👆👆👆 FIX END 👆👆👆
                });

            setHistory(historyWithProgress);
        }

      } catch (e) {
        console.error("Profile load error", e);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.replace('/login');
  };

  const getInitials = (email: string) => {
      return email ? email.substring(0, 2).toUpperCase() : 'ME';
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-24">
        
        {/* --- HEADER --- */}
        <div className="relative pt-24 pb-8 px-6 flex flex-col items-center bg-gradient-to-b from-[#1a1a1a] to-[#050505] border-b border-white/5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#ccff00] to-green-400 p-1 mb-4 shadow-[0_0_30px_rgba(204,255,0,0.3)]">
                <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center text-3xl font-black text-white">
                    {getInitials(user?.email)}
                </div>
            </div>
            
            <h1 className="text-xl font-bold mb-1">{user?.email?.split('@')[0]}</h1>
            <p className="text-xs text-gray-500 mb-6">{user?.email}</p>

            <div className="flex gap-4 w-full max-w-sm">
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 mb-1"> تا به امروز </span>
                    <span className="text-2xl font-black text-[#ccff00]">{stats.watchedCount}</span>
                    <span className="text-[10px] text-gray-400 mt-1">قسمت سریال دیدی</span>
                </div>
                <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 mb-1"> توی لیست تماشات </span>
                    <span className="text-2xl font-black text-[#ccff00]">{stats.watchlistCount}</span>
                    <span className="text-[10px] text-gray-400 mt-1"> تا سریال داری </span>
                </div>
            </div>
        </div>

        {/* --- TABS --- */}
        <div className="max-w-7xl mx-auto px-6 mt-8">
            <div className="flex bg-white/5 p-1 rounded-xl mb-8 border border-white/5">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <History size={16} /> در حال تماشا
                </button>
                <button 
                    onClick={() => setActiveTab('watchlist')}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'watchlist' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutGrid size={16} /> لیست تماشا
                </button>
            </div>

            {/* --- CONTENT --- */}
            <div className="animate-in fade-in slide-in-from-bottom-4">
                
                {/* 1. HISTORY TAB */}
                {activeTab === 'history' && (
                     history.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-6 md:gap-6">
                            {history.map((show: any) => (
                                <div key={show.id} onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="cursor-pointer group flex flex-col">
                                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 group-hover:border-[#ccff00]/50 transition-all">
                                        <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        
                                        {/* بج درصد */}
                                        <div className={`absolute top-2 left-2 backdrop-blur-md text-[9px] font-bold px-1.5 py-0.5 rounded ${show.progress === 100 ? 'bg-green-500 text-black' : 'bg-black/60 text-white'}`}>
                                            {show.progress === 100 ? 'تکمیل' : `${show.progress}%`}
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full shadow-[0_0_10px] ${show.progress === 100 ? 'bg-green-500 shadow-green-500' : 'bg-[#ccff00] shadow-[#ccff00]'}`}
                                            style={{ width: `${show.progress}%` }}
                                        ></div>
                                    </div>

                                    <h4 className="text-xs text-gray-300 mt-1.5 line-clamp-1 text-center group-hover:text-[#ccff00]">{show.name}</h4>
                                    <span className="text-[9px] text-gray-500 text-center">
                                        {/* اینجا هم هوشمندانه نشون میدیم */}
                                        {show.progress === 100 ? 'تمام قسمت‌ها' : `${show.watchedCount} / ${show.totalEpisodes}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="هنوز چیزی ندیدی؟" desc="شروع کن به تیک زدن اپیزودهایی که دیدی." icon={<PlayCircle size={48} />} />
                    )
                )}

                {/* 2. WATCHLIST TAB */}
                {activeTab === 'watchlist' && (
                    watchlist.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-6 md:gap-6">
                            {watchlist.map(show => (
                                <div key={show.id} onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="cursor-pointer group">
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 group-hover:border-[#ccff00]/50 transition-all relative">
                                        <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute top-2 right-2 bg-[#ccff00] text-black text-[9px] font-bold px-1.5 py-0.5 rounded">
                                            {show.vote_average.toFixed(1)}
                                        </div>
                                    </div>
                                    <h4 className="text-xs text-gray-300 mt-2 line-clamp-1 text-center group-hover:text-[#ccff00]">{show.name}</h4>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState title="لیستت خالیه!" desc="هنوز سریالی به لیستت اضافه نکردی." icon={<Tv size={48} />} />
                    )
                )}
            </div>
        </div>

        {/* --- LOGOUT --- */}
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5">
            <button 
                onClick={handleLogout}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 px-6 py-4 rounded-xl transition-all font-bold text-sm"
            >
                <LogOut size={18} /> خروج از حساب کاربری
            </button>
            <p className="text-center text-[10px] text-gray-600 mt-8">نسخه MVP 1.0.0 | ساخته شده با ❤️ و ☕</p>
        </div>
    </div>
  );
}

const EmptyState = ({ title, desc, icon }: any) => (
    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
        <div className="mb-4 text-gray-400">{icon}</div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{desc}</p>
    </div>
);