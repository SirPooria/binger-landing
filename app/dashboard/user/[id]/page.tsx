"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// مطمئن شو مسیر ایمپورت درست باشه
import { createClient } from '@/lib/supabase';
import { getShowDetails, getBackdropUrl, getImageUrl } from '@/lib/tmdbClient';
import { Loader2, ArrowRight, Zap, Heart, Award, X, Clock, Play, User as UserIcon, Calendar, Lock, CheckCircle, UserPlus, UserCheck, MessageSquare, Twitter, Instagram, Github } from 'lucide-react';

// --- لیست مدال‌های مصوب ---
const ALL_ACHIEVEMENTS = [
    { id: 'tudum', title: 'تودوم', icon: '🍿', desc: 'اولین اپیزود رو تماشا کردی.', threshold: 1, type: 'eps' },
    { id: 'neighbor', title: 'همسایه', icon: '👋', desc: 'اولین نفر رو فالو کردی.', threshold: 1, type: 'following' },
    { id: 'critic', title: 'منتقد', icon: '📝', desc: '۵ تا کامنت گذاشتی.', threshold: 5, type: 'comments' },
    { id: 'tractor', title: 'تراکتور', icon: '🚜', desc: '۵۰ اپیزود رو شخم زدی!', threshold: 50, type: 'eps' },
    { id: 'century', title: 'قرن', icon: '💯', desc: '۱۰۰ اپیزود تماشا کردی.', threshold: 100, type: 'eps' },
    { id: 'binge_r', title: 'بینجر واقعی', icon: '👑', desc: '۵۰۰ اپیزود تماشا کردی.', threshold: 500, type: 'eps' },
    { id: 'famous', title: 'معروف', icon: '😎', desc: '۱۰ نفر فالوت کردن.', threshold: 10, type: 'followers' },
];

export default function UserProfilePage() {
    const supabase = createClient() as any;
  const params = useParams();
  const router = useRouter();
  
  // Safe access to params.id
  const targetUserId = params?.id ? String(params.id) : null;

  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // اطلاعات پروفایل از جدول جدید
  const [userProfile, setUserProfile] = useState<{
      username?: string, 
      bio?: string, 
      full_name?: string, 
      avatar_url?: string 
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // Follow Status
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

  // Modals
  const [activeModal, setActiveModal] = useState<'followers' | 'following' | 'comments' | null>(null);
  const [modalList, setModalList] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  useEffect(() => {
    if (!targetUserId) return;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // اگر کاربر دارد پروفایل خودش را می‌بیند، ریدایرکت شود (اختیاری)
        if (user && user.id === targetUserId) {
            router.replace('/dashboard/profile');
            return;
        }

        // 1. دریافت اطلاعات پروفایل (از جدول استاندارد Profiles)
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();

        if (profileData) {
            setUserProfile(profileData);
        } else {
            // اگر پروفایل هنوز ساخته نشده بود، یک مقدار پیش‌فرض
            setUserProfile({ username: 'کاربر ناشناس', bio: 'هنوز بیوگرافی ننوشته است.' });
        }

        // 2. چک کردن وضعیت فالو
        if (user) {
            const { data: followData } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', targetUserId);
            if (followData && followData.length > 0) setIsFollowing(true);
        }

        // 3. آمار بازدید (Stats)
        const { data: watchedData } = await supabase
            .from('watched')
            .select('show_id, created_at')
            .eq('user_id', targetUserId);
      
        if (watchedData && watchedData.length > 0) {
            setTotalEpisodes(watchedData.length);
        
            // محاسبه زمان تماشا
            const uniqueShowIds = Array.from(new Set(watchedData.map((i: any) => i.show_id)));
            const showsDetailsMap: any = {};
            
            await Promise.all(uniqueShowIds.map(async (id) => {
                try {
                    const d = await getShowDetails(String(id));
                    if (d) showsDetailsMap[String(id)] = d;
                } catch (e) {
                    console.error("Error fetching show details:", id);
                }
            }));

            let totalMinutes = 0;
            watchedData.forEach((item: any) => {
                const show = showsDetailsMap[String(item.show_id)];
                if (show) {
                    const runtime = show?.episode_run_time?.length > 0 
                        ? (show.episode_run_time.reduce((a:number, b:number) => a + b, 0) / show.episode_run_time.length) 
                        : 45; 
                    totalMinutes += runtime;
                }
            });

            const daysTotal = Math.floor(totalMinutes / (24 * 60));
            const hoursTotal = Math.floor((totalMinutes % (24 * 60)) / 60);
            const months = Math.floor(daysTotal / 30);
            const days = daysTotal % 30;

            setTimeStats({ months, days, hours: hoursTotal });

            // کاور و آخرین بازدیدها
            watchedData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            if (watchedData.length > 0) {
                const lastShowId = watchedData[0].show_id;
                if (showsDetailsMap[String(lastShowId)]) {
                    setCoverImage(getBackdropUrl(showsDetailsMap[String(lastShowId)].backdrop_path));
                }
            }

            const recentUniqueIds = Array.from(new Set(watchedData.map((i:any) => i.show_id))).slice(0, 10);
            const recents = recentUniqueIds.map((id) => {
                const d = showsDetailsMap[String(id)];
                if (!d) return null;
                const totalEps = d.number_of_episodes || 1;
                const watchedCount = watchedData.filter((w: any) => w.show_id === id).length;
                const progress = Math.min(100, Math.round((watchedCount / totalEps) * 100));
                return { ...d, progress };
            });
            // رفع ارور تایپ‌اسکریپت با فیلتر دقیق
            setRecentShows(recents.filter((s: any) => s !== null));
        }

        // آمار سوشال
        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId);
        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId);
        const { count: comments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId);
        setSocialStats({ followers: followers || 0, following: following || 0, comments: comments || 0 });

        // علاقه‌مندی‌ها
        const { data: favData } = await supabase.from('favorites').select('show_id').eq('user_id', targetUserId);
        if (favData && favData.length > 0) {
            const favs = await Promise.all(favData.map(async (f: any) => await getShowDetails(String(f.show_id))));
            setFavorites(favs.filter((s: any) => s !== null));
        }

      } catch (err) {
          console.error("Error in Profile Load:", err);
      } finally {
          setLoading(false);
      }
    };

    init();
  }, [targetUserId]);

  const handleToggleFollow = async () => {
      if (!currentUser) {
          router.push('/login');
          return;
      }
      setFollowLoading(true);
      try {
        if (isFollowing) {
            await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
            setIsFollowing(false);
            setSocialStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        } else {
            // حالا که پروفایل داریم، ایمیل رو دقیق‌تر ثبت می‌کنیم یا اصلا ایمیل رو در جدول فالو ذخیره نمی‌کنیم (چون id داریم)
            // اما برای سازگاری با کد فعلی:
            await supabase.from('follows').insert({
                follower_id: currentUser.id,
                following_id: targetUserId,
                follower_email: currentUser.email,
                following_email: userProfile?.username || 'user@binger.app' 
            });
            setIsFollowing(true);
            setSocialStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
      } catch (e) {
          console.error("Follow error", e);
      }
      setFollowLoading(false);
  };

  const openListModal = async (type: 'followers' | 'following' | 'comments') => {
      setActiveModal(type);
      setModalLoading(true);
      setModalList([]);

      try {
        let data: any[] = [];
        
        // نکته: برای نمایش نام دقیق فالوورها بهتره بعدا جدول follows رو با profiles جوین کنیم
        // فعلا برای سادگی از دیتای موجود استفاده می‌کنیم
        if (type === 'followers') {
            const res = await supabase.from('follows').select('follower_id, follower_email').eq('following_id', targetUserId);
            data = res.data?.map((d: any) => ({ 
                id: d.follower_id, 
                title: d.follower_email?.split('@')[0] || 'کاربر', 
                subtitle: 'Follower' 
            })) || [];
        } else if (type === 'following') {
            const res = await supabase.from('follows').select('following_id, following_email').eq('follower_id', targetUserId);
            data = res.data?.map((d: any) => ({ 
                id: d.following_id, 
                title: d.following_email?.split('@')[0] || 'کاربر', 
                subtitle: 'Following' 
            })) || [];
        } else if (type === 'comments') {
            const res = await supabase.from('comments').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false });
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
      } catch (e) {
          console.error(e);
      }
      setModalLoading(false);
  };

  const checkBadgeStatus = (badge: any) => {
      // اینجا می‌تونیم بعدا از جدول user_badges بخونیم
      // فعلا برای اینکه MVP کار کنه از محاسبه آنی استفاده می‌کنیم
      if (badge.type === 'eps') return totalEpisodes >= badge.threshold;
      if (badge.type === 'comments') return socialStats.comments >= badge.threshold;
      if (badge.type === 'followers') return socialStats.followers >= badge.threshold;
      if (badge.type === 'following') return socialStats.following >= badge.threshold;
      return false;
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-0 overflow-x-hidden flex flex-col">
      
      {/* --- BADGE MODAL --- */}
      {selectedBadge && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={() => setSelectedBadge(null)}>
              <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedBadge(null)} className="absolute top-4 left-4 bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={20} /></button>
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 border-4 ${checkBadgeStatus(selectedBadge) ? 'bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.3)]' : 'bg-white/5 border-white/10 grayscale opacity-50'}`}>{selectedBadge.icon}</div>
                  <h3 className="text-2xl font-black mb-2">{selectedBadge.title}</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">{selectedBadge.desc}</p>
                  {checkBadgeStatus(selectedBadge) ? (
                      <div className="bg-[#ccff00]/10 text-[#ccff00] px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><CheckCircle size={18} /> دریافت شده</div>
                  ) : (
                      <div className="bg-white/5 text-gray-500 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2"><Lock size={18} /> قفل است</div>
                  )}
              </div>
          </div>
      )}

      <div className="flex-1">
        {/* --- HERO HEADER --- */}
        <div className="relative w-full h-[55vh]">
            <div className="absolute inset-0">
                {coverImage ? <img src={coverImage} className="w-full h-full object-cover opacity-60" alt="cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-900 to-black"></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent"></div>
            </div>

            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20 mt-16 md:mt-0">
                <button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full transition-all border border-white/5"><ArrowRight size={20} /></button>
            </div>

            <div className="absolute bottom-0 w-full px-6 pb-6 flex flex-col items-center z-20 translate-y-8">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#050505] bg-gradient-to-tr from-gray-700 to-gray-900 shadow-2xl flex items-center justify-center text-4xl md:text-5xl overflow-hidden relative z-10">
                        {/* نمایش آواتار اگر موجود باشد، در غیر این صورت آیکون پیش‌فرض */}
                        {userProfile?.avatar_url ? (
                             <img src={userProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                             "👤"
                        )}
                    </div>
                </div>
                
                {/* نمایش نام کاربری از دیتابیس */}
                <h1 className="text-2xl md:text-3xl font-black mt-3 ltr tracking-tight text-white">
                    {userProfile?.username || userProfile?.full_name || 'Binger User'}
                </h1>
                
                {/* نمایش بیوگرافی */}
                {userProfile?.bio && (
                    <p className="text-gray-400 text-sm mt-2 max-w-md text-center">{userProfile.bio}</p>
                )}
                
                {/* دکمه فالو */}
                {currentUser && currentUser.id !== targetUserId && (
                    <button 
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                        className={`mt-4 px-8 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${isFollowing ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400' : 'bg-[#ccff00] text-black hover:bg-[#b3e600] hover:scale-105'}`}
                    >
                        {followLoading ? <Loader2 className="animate-spin" size={18} /> : (isFollowing ? <><UserCheck size={18} /> دنبال می‌کنید</> : <><UserPlus size={18} /> دنبال کردن</>)}
                    </button>
                )}

                <div className="flex items-center gap-2 mt-6 bg-[#1a1a1a]/80 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
                    <SocialItem count={socialStats.followers} label="Followers" onClick={() => openListModal('followers')} />
                    <div className="w-px h-8 bg-white/10"></div>
                    <SocialItem count={socialStats.following} label="Following" onClick={() => openListModal('following')} />
                    <div className="w-px h-8 bg-white/10"></div>
                    <SocialItem count={socialStats.comments} label="Comments" onClick={() => openListModal('comments')} />
                </div>
            </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="max-w-5xl mx-auto px-4 mt-16 space-y-10 mb-20">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={100} /></div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap className="text-[#ccff00]" size={14} /> زمان کل تماشا</h3>
                    <div className="flex items-end gap-4 ltr">
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.months}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Months</span></div>
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white leading-none">{timeStats.days}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Days</span></div>
                        <div className="flex flex-col"><span className="text-3xl md:text-5xl font-black text-white/50 leading-none">{timeStats.hours}</span><span className="text-[10px] text-gray-500 uppercase font-bold">Hours</span></div>
                    </div>
                </div>

                <div className="bg-[#ccff00] text-black rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-transform group-hover:scale-110"><Play size={120} fill="black" /></div>
                    <h3 className="text-black/60 text-xs font-bold uppercase tracking-wider">اپیزودها</h3>
                    <div className="text-4xl md:text-5xl font-black mt-2">{totalEpisodes}</div>
                    <p className="text-[10px] font-bold mt-1 opacity-60">اپیزود تماشا شده</p>
                </div>

                <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2"><Award className="text-pink-500" size={14} /> ویترین افتخارات ({ALL_ACHIEVEMENTS.filter(b => checkBadgeStatus(b)).length})</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {ALL_ACHIEVEMENTS.map((badge) => {
                            const isUnlocked = checkBadgeStatus(badge);
                            return (
                                <div key={badge.id} onClick={() => setSelectedBadge(badge)} className={`shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[100px] cursor-pointer transition-all hover:scale-105 ${isUnlocked ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}>
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
                    <h2 className="text-xl font-black flex items-center gap-2"><Heart className="text-red-500 fill-red-500" size={20} /> محبوب‌ترین‌های کاربر</h2>
                </div>
                {favorites.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {favorites.map((s) => (
                            <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ring-1 ring-white/10 hover:ring-[#ccff00]/50">
                                <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" alt={s.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3"><span className="text-xs font-bold text-white text-center">{s.name}</span></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500"><Heart size={32} strokeWidth={1.5} /><p className="text-xs">هیچ سریال محبوبی ثبت نشده است.</p></div>
                )}
            </div>

            {/* RECENT ACTIVITY */}
            <div className="pb-10">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar size={20} className="text-cyan-400" /> آخرین بازدیدها</h2>
                {recentShows.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x">
                        {recentShows.map((s) => (
                            <div key={s.id} onClick={() => router.push(`/dashboard/tv/${s.id}`)} className="snap-center shrink-0 w-[120px] md:w-[140px] group cursor-pointer">
                                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3 ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all">
                                    <img src={getImageUrl(s.poster_path)} className="w-full h-full object-cover" alt={s.name} />
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
      </div>

      <DashboardFooter />

      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
            <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414]">
                    <h3 className="font-black text-xl text-white">
                        {activeModal === 'followers' && 'دنبال‌کنندگان'}
                        {activeModal === 'following' && 'کسانی که دنبال می‌کند'}
                        {activeModal === 'comments' && 'نظرات ارسالی کاربر'}
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
                                        <button onClick={() => router.push(item.id ? `/dashboard/user/${item.id}` : '#')} className="text-xs border border-white/20 px-4 py-2 rounded-full hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all font-bold">مشاهده</button>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-600 gap-4"><UserIcon size={48} strokeWidth={1} /><p>لیست خالی است.</p></div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

function SocialItem({ count, label, onClick }: any) {
    return (<button onClick={onClick} className="flex flex-col items-center justify-center w-20 py-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer group"><span className="text-lg font-black text-white group-hover:text-[#ccff00] transition-colors">{count}</span><span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{label}</span></button>);
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
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">تازه ترین ها</a></li>
                            <li><a href="#" className="hover:text-[#ccff00] transition-colors cursor-pointer">برترین های IMDB</a></li>
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