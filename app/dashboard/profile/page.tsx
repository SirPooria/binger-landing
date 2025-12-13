"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Zap, Settings, Users, MessageSquare, Heart, Plus, Award, X, Clock, Play, User as UserIcon, Calendar, Lock, CheckCircle } from 'lucide-react';

// --- لیست کامل مدال‌ها (20+ آیتم) ---
const ALL_ACHIEVEMENTS = [
    { id: 'newbie', title: 'تازه‌وارد', icon: '🐣', desc: 'اولین اپیزود رو تماشا کردی.', threshold: 1, type: 'eps' },
    { id: 'starter', title: 'استارت قوی', icon: '🚀', desc: '۱۰ اپیزود تماشا کردی.', threshold: 10, type: 'eps' },
    { id: 'fan', title: 'طرفدار', icon: '📺', desc: '۲۵ اپیزود تماشا کردی.', threshold: 25, type: 'eps' },
    { id: 'tractor', title: 'تراکتور', icon: '🚜', desc: '۵۰ اپیزود رو شخم زدی!', threshold: 50, type: 'eps' },
    { id: 'century', title: 'قرن', icon: '💯', desc: '۱۰۰ اپیزود تماشا کردی.', threshold: 100, type: 'eps' },
    { id: 'binge_r', title: 'بینجر واقعی', icon: '🍿', desc: '۲۵۰ اپیزود تماشا کردی.', threshold: 250, type: 'eps' },
    { id: 'zombie', title: 'زامبی', icon: '🧟‍♂️', desc: '۵۰۰ اپیزود! خواب نداری؟', threshold: 500, type: 'eps' },
    { id: 'legend', title: 'اسطوره', icon: '👑', desc: '۱۰۰۰ اپیزود. تو یه افسانه‌ای.', threshold: 1000, type: 'eps' },
    { id: 'alien', title: 'فرازمینی', icon: '👽', desc: '۲۰۰۰ اپیزود. از کدوم سیاره اومدی؟', threshold: 2000, type: 'eps' },
    { id: 'critic_jr', title: 'منتقد جوان', icon: '📝', desc: '۵ تا کامنت گذاشتی.', threshold: 5, type: 'comments' },
    { id: 'critic_pro', title: 'منتقد حرفه‌ای', icon: '✍️', desc: '۲۰ تا کامنت گذاشتی.', threshold: 20, type: 'comments' },
    { id: 'social', title: 'اجتماعی', icon: '🗣️', desc: '۵۰ تا کامنت گذاشتی.', threshold: 50, type: 'comments' },
    { id: 'famous', title: 'معروف', icon: '😎', desc: '۱۰ نفر فالوت کردن.', threshold: 10, type: 'followers' },
    { id: 'influencer', title: 'اینفلوئنسر', icon: '💎', desc: '۵۰ نفر فالوت کردن.', threshold: 50, type: 'followers' },
    { id: 'night_owl', title: 'جغد شب', icon: '🦉', desc: 'تماشا بین ساعت ۲ تا ۵ صبح.', threshold: 1, type: 'special' }, // نیاز به لاجیک خاص
    { id: 'early_bird', title: 'سحرخیز', icon: '🐓', desc: 'تماشا بین ساعت ۶ تا ۹ صبح.', threshold: 1, type: 'special' },
    { id: 'weekend', title: 'تعطیلات', icon: '🏖️', desc: 'تماشا در روز جمعه.', threshold: 1, type: 'special' },
    { id: 'marathon', title: 'ماراتن', icon: '🏃', desc: 'تماشای ۱۰ قسمت در یک روز.', threshold: 1, type: 'special' },
    { id: 'genre_scifi', title: 'دانشمند', icon: '🧪', desc: 'عاشق ژانر علمی تخیلی.', threshold: 1, type: 'special' },
    { id: 'genre_comedy', title: 'بمب خنده', icon: '😂', desc: 'عاشق ژانر کمدی.', threshold: 1, type: 'special' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [timeStats, setTimeStats] = useState({ months: 0, days: 0, hours: 0 });
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, comments: 0 });
  
  // Lists
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentShows, setRecentShows] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Modals & Popups
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'comments' | null>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [selectedBadge, setSelectedBadge] = useState<any>(null); // برای پاپ آپ مدال

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      // 1. Data Fetching
      const { data: watchedData } = await supabase.from('watched').select('show_id, created_at');
      
      if (watchedData) {
        setTotalEpisodes(watchedData.length);
        const totalMinutes = watchedData.length * 40;
        setTimeStats({
            months: Math.floor(totalMinutes / (30 * 24 * 60)),
            days: Math.floor((totalMinutes % (30 * 24 * 60)) / (24 * 60)),
            hours: Math.floor((totalMinutes % (24 * 60)) / 60)
        });

        if (watchedData.length > 0) {
            // Sort by recent
            watchedData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // Cover Image
            const lastShowId = watchedData[0].show_id;
            const showDetails = await getShowDetails(String(lastShowId));
            if (showDetails) setCoverImage(getBackdropUrl(showDetails.backdrop_path));

            // Recent Shows
            const uniqueIds = Array.from(new Set(watchedData.map((i:any) => i.show_id))).slice(0, 10);
            const recents = await Promise.all(uniqueIds.map(async (id) => {
                const d = await getShowDetails(String(id));
                if (!d) return null;
                const totalReleased = d.seasons?.reduce((sum: number, season: any) => sum + (season.air_date && new Date(season.air_date) <= new Date() ? season.episode_count : 0), 0) || 0;
                const watchedCount = watchedData.filter((w: any) => w.show_id === id).length;
                const progress = totalReleased > 0 ? Math.round((watchedCount / totalReleased) * 100) : 0;
                return { ...d, progress };
            }));
            setRecentShows(recents.filter(s => s !== null));
        }
      }

      // Social Stats
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
      const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      
      setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });

      // Favorites
      const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', user.id);
      if (favData && favData.length > 0) {
          const favs = await Promise.all(favData.map(async (f: any) => await getShowDetails(String(f.show_id))));
          setFavorites(favs.filter(s => s !== null));
      }

      setLoading(false);
    };

    fetchProfileData();
  }, []);

  const openListModal = async (type: 'followers' | 'following' | 'comments') => {
      setActiveModal(type);
      setModalLoading(true);
      setModalList([]);

      let data: any[] = [];
      if (type === 'followers') {
          // برای فالوورها آیدی هم میگیریم که بشه رفت تو پروفایلشون
          const res = await supabase.from('follows').select('follower_id, follower_email').eq('following_id', user.id);
          data = res.data?.map(d => ({ id: d.follower_id, title: d.follower_email.split('@')[0], subtitle: 'Follower' })) || [];
      } else if (type === 'following') {
          const res = await supabase.from('follows').select('following_id, following_email').eq('follower_id', user.id);
          data = res.data?.map(d => ({ id: d.following_id, title: d.following_email.split('@')[0], subtitle: 'Following' })) || [];
      } else if (type === 'comments') {
          const res = await supabase.from('comments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (res.data) {
             const uniqueShowIds = Array.from(new Set(res.data.map((c: any) => c.show_id)));
             const showsInfo = await Promise.all(uniqueShowIds.map(async (id) => {
                  const details = await getShowDetails(String(id));
                  return { id, name: details?.name || 'Unknown' };
             }));
             data = res.data.map((c:any) => ({
                 title: showsInfo.find(s => s.id === c.show_id)?.name,
                 subtitle: new Date(c.created_at).toLocaleDateString('fa-IR'),
                 content: c.content
             }));
          }
      }
      setModalList(data);
      setModalLoading(false);
  };

  // چک کردن وضعیت مدال
  const checkBadgeStatus = (badge: any) => {
      if (badge.type === 'eps') return totalEpisodes >= badge.threshold;
      if (badge.type === 'comments') return socialStats.comments >= badge.threshold;
      if (badge.type === 'followers') return socialStats.followers >= badge.threshold;
      return false; // برای special ها فعلا قفل
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-24 overflow-x-hidden">
      
      {/* --- BADGE DETAIL POPUP --- */}
      {selectedBadge && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={() => setSelectedBadge(null)}>
              <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
                  
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${checkBadgeStatus(selectedBadge) ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' : 'bg-white/5 border-white/10 grayscale opacity-50'}`}>
                      {selectedBadge.icon}
                  </div>
                  
                  <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
                  
                  {checkBadgeStatus(selectedBadge) ? (
                      <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                          <CheckCircle size={18} /> دریافت شده
                      </div>
                  ) : (
                      <div className="bg-white/5 text-gray-500 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                          <Lock size={18} /> قفل است
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- HEADER --- */}
      <div className="relative w-full h-[55vh]">
          <div className="absolute inset-0">
              {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black"></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent"></div>
          </div>

          <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
              <button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full transition-all border border-white/5"><ArrowRight size={20} /></button>
              {/* دکمه تنظیمات (فعلا الرت میده تا پیاده بشه) */}
              <button onClick={() => alert("بخش تنظیمات در مرحله بعدی ساخته می‌شود!")} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full transition-all border border-white/5"><Settings size={20} /></button>
          </div>

          <div className="absolute bottom-0 w-full px-6 pb-10 flex flex-col items-center z-20 translate-y-12">
              <div className="relative group cursor-pointer">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-800 to-gray-600 shadow-2xl flex items-center justify-center text-5xl overflow-hidden relative z-10">😎</div>
                  <div className="absolute inset-0 bg-[#ccff00] blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black mt-4 ltr tracking-tight">{user?.email?.split('@')[0]}</h1>
              {/* دکمه ویرایش پروفایل (هنوز کار نمیکنه طبق نقشه) */}
              <button onClick={() => alert("ویرایش پروفایل بزودی!")} className="text-gray-400 text-xs mt-2 font-medium bg-white/5 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-all">ویرایش پروفایل</button>

              <div className="flex items-center gap-2 mt-6 bg-white/5 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
                  <SocialItem count={socialStats.followers} label="Followers" onClick={() => openListModal('followers')} />
                  <div className="w-px h-8 bg-white/10"></div>
                  <SocialItem count={socialStats.following} label="Following" onClick={() => openListModal('following')} />
                  <div className="w-px h-8 bg-white/10"></div>
                  <SocialItem count={socialStats.comments} label="Comments" onClick={() => openListModal('comments')} />
              </div>
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-5xl mx-auto px-4 mt-20 space-y-10">
          
          {/* STATS & TROPHY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={100} /></div>
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمان کل تماشا</h3>
                  <div className="flex items-end gap-3 ltr">
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white leading-none">{timeStats.months}</span><span className="text-xs text-gray-500 uppercase font-bold">Months</span></div>
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white leading-none">{timeStats.days}</span><span className="text-xs text-gray-500 uppercase font-bold">Days</span></div>
                      <div className="flex flex-col"><span className="text-4xl md:text-6xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-xs text-gray-500 uppercase font-bold">Hours</span></div>
                  </div>
              </div>

              <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-transform group-hover:scale-110"><Play size={120} fill="black" /></div>
                  <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">اپیزودها</h3>
                  <div className="text-5xl font-black mt-2">{totalEpisodes}</div>
                  <p className="text-[10px] font-bold mt-1 opacity-60">اپیزود تماشا شده</p>
              </div>

              {/* TROPHY CASE (UPDATED) */}
              <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><Award className="text-pink-500" size={14} /> ویترین افتخارات ({ALL_ACHIEVEMENTS.filter(b => checkBadgeStatus(b)).length})</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                      {ALL_ACHIEVEMENTS.map((badge) => {
                          const isUnlocked = checkBadgeStatus(badge);
                          return (
                              <div 
                                key={badge.id} 
                                onClick={() => setSelectedBadge(badge)}
                                className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[100px] cursor-pointer transition-all hover:scale-105 ${isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}
                              >
                                  <div className="text-4xl drop-shadow-md">{badge.icon}</div>
                                  <span className={`text-[10px] font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.title}</span>
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>

          {/* FAVORITES */}
          <div>
              <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-3"><Heart className="text-red-500 fill-red-500" size={28} /> محبوب‌ترین‌های من</h2>
                  {/* دکمه افزودن لیست - فعلا الرت */}
                  <button onClick={() => alert("بخش ساخت لیست در مرحله بعدی!")} className="text-xs bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-white/10"><Plus size={14} /> مدیریت لیست</button>
              </div>
              
              {favorites.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                      {favorites.map((s) => (
                          <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ring-1 ring-white/10 hover:ring-[#ccff00]/50">
                              <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3"><span className="text-xs font-bold text-white text-center">{s.name}</span></div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500"><Heart size={40} strokeWidth={1.5} /><p className="text-sm">هنوز هیچ سریالی را به محبوب‌ها اضافه نکردید.</p></div>
              )}
          </div>

          {/* RECENT ACTIVITY */}
          <div className="pb-10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar size={20} className="text-cyan-400" /> سریال‌های مشاهده شده</h2>
              {recentShows.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x">
                      {recentShows.map((s) => (
                          <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="snap-center shrink-0 w-[140px] md:w-[160px] group cursor-pointer">
                              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all">
                                  <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div className="h-full bg-cyan-400" style={{ width: `${s.progress}%` }}></div></div>
                              </div>
                              <p className="text-xs font-bold text-center truncate px-1 group-hover:text-cyan-400 transition-colors">{s.name}</p>
                              <p className="text-[10px] text-gray-500 text-center mt-0.5 ltr">{s.progress}% Watched</p>
                          </div>
                      ))}
                  </div>
              ) : (
                  <p className="text-gray-500 text-sm">هیچ فعالیتی ثبت نشده است.</p>
              )}
          </div>

      </div>

      {/* --- LARGE MODAL (User List / Comments) --- */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
            <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
                    <h3 className="font-black text-xl text-white">
                        {activeModal === 'followers' && 'دنبال‌کنندگان شما'}
                        {activeModal === 'following' && 'کسانی که دنبال می‌کنید'}
                        {activeModal === 'comments' && 'نظرات ارسالی شما'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 hover:text-red-400 transition-all"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
                    {modalLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#ccff00]" size={32} /></div>
                    ) : modalList.length > 0 ? (
                        modalList.map((item, idx) => (
                            <div key={idx} className="bg-white/[0.03] hover:bg-white/[0.06] p-4 rounded-2xl flex items-start gap-4 border border-white/5 transition-colors cursor-default">
                                {activeModal === 'comments' ? (
                                    <>
                                        <div className="bg-white/10 p-3 rounded-xl"><MessageSquare size={20} className="text-[#ccff00]" /></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded-md">{item.title || 'Unknown Show'}</span>
                                                <span className="text-[10px] text-gray-500">{item.subtitle}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 leading-relaxed">"{item.content}"</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/10">👤</div>
                                        <div className="flex-1 flex flex-col justify-center h-12">
                                            <span className="text-base font-bold text-white ltr text-left">{item.title}</span>
                                            <span className="text-xs text-gray-500 ltr text-left">{item.subtitle}</span>
                                        </div>
                                        {/* دکمه اصلاح شده */}
                                        <button 
                                            onClick={() => router.push(item.id ? `/dashboard/user/${item.id}` : '#')}
                                            className="text-xs border border-white/20 px-4 py-2 rounded-full hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all font-bold"
                                        >
                                            مشاهده پروفایل
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-4">
                            <UserIcon size={48} strokeWidth={1} />
                            <p>لیست خالی است.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// --- COMPONENTS ---
function SocialItem({ count, label, onClick }: any) {
    return (
        <button onClick={onClick} className="flex flex-col items-center justify-center w-20 py-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group">
            <span className="text-lg font-black text-white group-hover:text-[#ccff00] transition-colors">{count}</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{label}</span>
        </button>
    );
}