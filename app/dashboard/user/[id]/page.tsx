"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { Loader2, ArrowRight, Zap, Users, MessageSquare, Heart, Award, UserPlus, UserCheck, Calendar, Clock, Play } from 'lucide-react';

// لیست مدال‌ها (همان لیست پروفایل اصلی برای محاسبه)
const ALL_ACHIEVEMENTS = [
    { id: 'newbie', title: 'تازه‌وارد', icon: '🐣', desc: 'اولین اپیزود رو تماشا کردی.', threshold: 1, type: 'eps' },
    { id: 'starter', title: 'استارت قوی', icon: '🚀', desc: '۱۰ اپیزود تماشا کردی.', threshold: 10, type: 'eps' },
    { id: 'fan', title: 'طرفدار', icon: '📺', desc: '۲۵ اپیزود تماشا کردی.', threshold: 25, type: 'eps' },
    { id: 'tractor', title: 'تراکتور', icon: '🚜', desc: '۵۰ اپیزود رو شخم زدی!', threshold: 50, type: 'eps' },
    { id: 'century', title: 'قرن', icon: '💯', desc: '۱۰۰ اپیزود تماشا کردی.', threshold: 100, type: 'eps' },
    { id: 'binge_r', title: 'بینجر واقعی', icon: '🍿', desc: '۲۵۰ اپیزود تماشا کردی.', threshold: 250, type: 'eps' },
    { id: 'zombie', title: 'زامبی', icon: '🧟‍♂️', desc: '۵۰۰ اپیزود! خواب نداری؟', threshold: 500, type: 'eps' },
    { id: 'legend', title: 'اسطوره', icon: '👑', desc: '۱۰۰۰ اپیزود. تو یه افسانه‌ای.', threshold: 1000, type: 'eps' },
    { id: 'critic_jr', title: 'منتقد جوان', icon: '📝', desc: '۵ تا کامنت گذاشتی.', threshold: 5, type: 'comments' },
    { id: 'famous', title: 'معروف', icon: '😎', desc: '۱۰ نفر فالوت کردن.', threshold: 10, type: 'followers' },
];

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const targetUserId = params.id as string; // آیدی کاربری که داریم می‌بینیم

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetUserEmail, setTargetUserEmail] = useState("کاربر");
  const [loading, setLoading] = useState(true);
  
  // وضعیت فالو
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });
  
  // Lists
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentShows, setRecentShows] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setCurrentUser(user);

      // اگر کاربر پروفایل خودش را باز کرده، ریدارکت کن به پروفایل اصلی
      if (user.id === targetUserId) {
          router.push('/dashboard/profile');
          return;
      }

      // 1. چک کردن وضعیت فالو
      const { data: followData } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', targetUserId);
      if (followData && followData.length > 0) setIsFollowing(true);

      // 2. گرفتن اطلاعات کاربر هدف (از روی کامنت‌ها یا فالوورها سعی میکنیم ایمیلش رو پیدا کنیم چون جدول یوزر نداریم)
      // ترفند: آخرین کامنت یا فالوی این کاربر رو پیدا میکنیم تا ایمیلش رو برداریم
      const { data: userData } = await supabase.from('comments').select('email').eq('user_id', targetUserId).limit(1);
      if (userData && userData.length > 0) setTargetUserEmail(userData[0].email.split('@')[0]);
      else {
          // تلاش دوم از جدول فالو
          const { data: fData } = await supabase.from('follows').select('follower_email').eq('follower_id', targetUserId).limit(1);
          if (fData && fData.length > 0) setTargetUserEmail(fData[0].follower_email.split('@')[0]);
      }

      // 3. آمار تماشا (Target User)
      const { data: watchedData } = await supabase.from('watched').select('show_id, episode_id, created_at').eq('user_id', targetUserId);
      
      if (watchedData) {
        setTotalEpisodes(watchedData.length);
        const totalMinutes = watchedData.length * 40;
        setTimeStats({
            months: Math.floor(totalMinutes / (30 * 24 * 60)),
            days: Math.floor((totalMinutes % (30 * 24 * 60)) / (24 * 60)),
            hours: Math.floor((totalMinutes % (24 * 60)) / 60)
        });

        if (watchedData.length > 0) {
            // کاور
            const lastShowId = watchedData[watchedData.length - 1].show_id;
            const showDetails = await getShowDetails(String(lastShowId));
            if (showDetails) setCoverImage(getBackdropUrl(showDetails.backdrop_path));

            // لیست اخیر
            const uniqueIds = Array.from(new Set(watchedData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((i:any) => i.show_id))).slice(0, 10);
            const recents = await Promise.all(uniqueIds.map(async (id) => {
                const d = await getShowDetails(String(id));
                if (!d) return null;
                // محاسبه درصد برای نمایش
                const totalReleased = d.seasons?.reduce((sum: number, season: any) => sum + (season.air_date && new Date(season.air_date) <= new Date() ? season.episode_count : 0), 0) || 0;
                const watchedCount = watchedData.filter((w: any) => w.show_id === id).length;
                const progress = totalReleased > 0 ? Math.round((watchedCount / totalReleased) * 100) : 0;
                return { ...d, progress };
            }));
            setRecentShows(recents.filter(s => s !== null));
        }
      }

      // 4. آمار اجتماعی
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId);
      const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId);
      
      setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });

      // 5. Favorites
      const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', targetUserId);
      if (favData && favData.length > 0) {
          const favs = await Promise.all(favData.map(async (f: any) => await getShowDetails(String(f.show_id))));
          setFavorites(favs.filter(s => s !== null));
      }

      setLoading(false);
    };

    init();
  }, [targetUserId]);

  // --- اکشن فالو/آنفالو ---
  const handleToggleFollow = async () => {
      setFollowLoading(true);
      if (isFollowing) {
          // Unfollow
          await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
          setIsFollowing(false);
          setSocialStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
          // Follow
          await supabase.from('follows').insert({
              follower_id: currentUser.id,
              following_id: targetUserId,
              follower_email: currentUser.email,
              following_email: targetUserEmail + '@gmail.com' // حدودی، چون ایمیل دقیق رو نداریم تو این جدول
          });
          setIsFollowing(true);
          setSocialStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
      setFollowLoading(false);
  };

  // چک کردن مدال
  const checkBadgeStatus = (badge: any) => {
      if (badge.type === 'eps') return totalEpisodes >= badge.threshold;
      if (badge.type === 'comments') return socialStats.comments >= badge.threshold;
      if (badge.type === 'followers') return socialStats.followers >= badge.threshold;
      return false;
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-24 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="relative w-full h-[55vh]">
          <div className="absolute inset-0">
              {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black"></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent"></div>
          </div>

          <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
              <button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full transition-all border border-white/5"><ArrowRight size={20} /></button>
          </div>

          <div className="absolute bottom-0 w-full px-6 pb-10 flex flex-col items-center z-20 translate-y-12">
              <div className="relative">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-700 to-gray-900 shadow-2xl flex items-center justify-center text-5xl overflow-hidden relative z-10">👤</div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black mt-4 ltr tracking-tight">{targetUserEmail}</h1>
              
              {/* دکمه فالو/آنفالو */}
              <button 
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`mt-4 px-8 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg ${isFollowing ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400' : 'bg-[#ccff00] text-black hover:bg-[#b3e600] hover:scale-105'}`}
              >
                  {followLoading ? <Loader2 className="animate-spin" size={18} /> : (isFollowing ? <><UserCheck size={18} /> دنبال می‌کنید</> : <><UserPlus size={18} /> دنبال کردن</>)}
              </button>

              <div className="flex items-center gap-2 mt-6 bg-white/5 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
                  <div className="flex flex-col items-center justify-center w-20 py-2"><span className="text-lg font-black text-white">{socialStats.followers}</span><span className="text-[10px] uppercase font-bold text-gray-500">Followers</span></div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex flex-col items-center justify-center w-20 py-2"><span className="text-lg font-black text-white">{socialStats.following}</span><span className="text-[10px] uppercase font-bold text-gray-500">Following</span></div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex flex-col items-center justify-center w-20 py-2"><span className="text-lg font-black text-white">{socialStats.comments}</span><span className="text-[10px] uppercase font-bold text-gray-500">Comments</span></div>
              </div>
          </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 mt-20 space-y-10">
          
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={100} /></div>
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمان کل تماشا</h3>
                  <div className="flex items-end gap-3 ltr">
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white leading-none">{timeStats.months}</span><span className="text-xs text-gray-500 uppercase font-bold">Months</span></div>
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white leading-none">{timeStats.days}</span><span className="text-xs text-gray-500 uppercase font-bold">Days</span></div>
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-xs text-gray-500 uppercase font-bold">Hours</span></div>
                  </div>
              </div>
              <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                  <div className="absolute -right-4 -bottom-4 opacity-10"><Play size={120} fill="black" /></div>
                  <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">اپیزودها</h3>
                  <div className="text-5xl font-black mt-2">{totalEpisodes}</div>
                  <p className="text-[10px] font-bold mt-1 opacity-60">اپیزود تماشا شده</p>
              </div>
              
              {/* TROPHY CASE (Read Only) */}
              <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><Award className="text-pink-500" size={14} /> افتخارات کاربر</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                      {ALL_ACHIEVEMENTS.filter(b => checkBadgeStatus(b)).length > 0 ? ALL_ACHIEVEMENTS.filter(b => checkBadgeStatus(b)).map((badge) => (
                          <div key={badge.id} className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[100px] bg-white/10 border-white/20">
                              <div className="text-4xl drop-shadow-md">{badge.icon}</div>
                              <span className="text-[10px] font-bold text-white">{badge.title}</span>
                          </div>
                      )) : <p className="text-gray-500 text-sm">هنوز مدالی دریافت نکرده است.</p>}
                  </div>
              </div>
          </div>

          {/* FAVORITES */}
          <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3"><Heart className="text-red-500 fill-red-500" size={24} /> سریال‌های محبوب</h2>
              {favorites.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                      {favorites.map((s) => (
                          <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                              <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3"><span className="text-xs font-bold text-white text-center">{s.name}</span></div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500"><Heart size={40} strokeWidth={1.5} /><p className="text-sm">لیست خالی است.</p></div>
              )}
          </div>

          {/* RECENT ACTIVITY */}
          <div className="pb-10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar size={20} className="text-cyan-400" /> آخرین بازدیدها</h2>
              {recentShows.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x">
                      {recentShows.map((s) => (
                          <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="snap-center shrink-0 w-[140px] md:w-[160px] group cursor-pointer">
                              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all">
                                  <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div className="h-full bg-cyan-400" style={{ width: `${s.progress}%` }}></div></div>
                              </div>
                              <p className="text-xs font-bold text-center truncate px-1 group-hover:text-cyan-400 transition-colors">{s.name}</p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <p className="text-gray-500 text-sm">هیچ فعالیتی ثبت نشده است.</p>
              )}
          </div>

      </div>
    </div>
  );
}