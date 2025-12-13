"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEpisodeDetails, getImageUrl } from '@/lib/tmdbClient';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRight, Star, Calendar, Clock, Loader2, CheckCircle, MessageSquare, Send, User } from 'lucide-react';

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  
  // گرفتن پارامترها از آدرس
  const showId = params.id as string;
  const seasonNum = params.season as string;
  const episodeNum = params.episode as string;

  const [ep, setEp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isWatched, setIsWatched] = useState(false);
  
  // کامنت‌ها
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      // 1. گرفتن اطلاعات اپیزود از TMDB
      const epData = await getEpisodeDetails(showId, seasonNum, episodeNum);
      setEp(epData);

      if (epData) {
        // 2. چک کردن وضعیت تماشا (از روی ID اپیزود که TMDB میده)
        const { data: watchedData } = await supabase
            .from('watched')
            .select('*')
            .eq('user_id', user.id)
            .eq('episode_id', epData.id); // شناسه یکتای اپیزود
        
        if (watchedData && watchedData.length > 0) setIsWatched(true);

        // 3. گرفتن کامنت‌های مخصوص این اپیزود (فیلتر روی episode_id)
        const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .eq('episode_id', epData.id) // <--- مهم: فقط کامنت‌های همین قسمت
            .order('created_at', { ascending: false });
        
        if (commentsData) setComments(commentsData);
      }
      setLoading(false);
    };

    initData();
  }, [showId, seasonNum, episodeNum]);

  // تابع تیک زدن (تکی)
  const toggleWatched = async () => {
    if (!ep) return;
    if (isWatched) {
        await supabase.from('watched').delete().eq('user_id', user.id).eq('episode_id', ep.id);
        setIsWatched(false);
    } else {
        await supabase.from('watched').insert([{ user_id: user.id, show_id: Number(showId), episode_id: ep.id }]);
        setIsWatched(true);
    }
  };

  // تابع ارسال کامنت
  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);

    const commentObj = {
        user_id: user.id,
        show_id: Number(showId),
        episode_id: ep.id, // <--- مهم: وصل کردن کامنت به اپیزود
        content: newComment,
        email: user.email
    };

    const { data, error } = await supabase.from('comments').insert([commentObj]).select();
    if (!error && data) {
        setComments([data[0], ...comments]);
        setNewComment("");
    }
    setCommentLoading(false);
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;
  if (!ep) return <div className="text-white text-center mt-20">اپیزود پیدا نشد!</div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-20">
      
      {/* HEADER IMAGE */}
      <div className="relative w-full h-[40vh]">
        <img src={getImageUrl(ep.still_path)} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
        
        <button onClick={() => router.back()} className="absolute top-6 right-6 bg-black/40 p-3 rounded-full hover:bg-white/20 transition-all border border-white/10 cursor-pointer">
            <ArrowRight size={24} />
        </button>

        <div className="absolute bottom-0 w-full p-6 md:p-12">
            <h2 className="text-[#ccff00] font-bold text-lg mb-1 ltr text-right">S{seasonNum} | E{episodeNum}</h2>
            <h1 className="text-3xl md:text-5xl font-black mb-4 ltr text-right">{ep.name}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-400 justify-end md:justify-start flex-row-reverse md:flex-row">
                <div className="flex items-center gap-1"><Star size={14} className="text-[#ccff00]" /> {ep.vote_average.toFixed(1)}</div>
                <div className="flex items-center gap-1"><Clock size={14} /> {ep.runtime} min</div>
                <div className="flex items-center gap-1"><Calendar size={14} /> {ep.air_date}</div>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
        
        {/* RIGHT: INFO */}
        <div className="md:col-span-2 space-y-8">
            {/* Overview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-gray-300 leading-relaxed text-justify">{ep.overview || "توضیحاتی برای این قسمت ثبت نشده است."}</p>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-2xl p-4">
                <span className="text-[#ccff00] font-bold">این قسمت رو دیدی؟</span>
                <button 
                    onClick={toggleWatched}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        isWatched ? 'bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                >
                    <CheckCircle size={20} />
                    <span>{isWatched ? 'دیده شده' : 'تیک بزن'}</span>
                </button>
            </div>

            {/* Cast & Crew (جدید: فقط در این صفحه) */}
            <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                     <User className="text-[#ccff00]" size={20} />
                     بازیگران مهمان و عوامل
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {ep.guest_stars?.map((person: any) => (
                        <div key={person.id} className="min-w-[100px] flex flex-col items-center text-center">
                            <img src={getImageUrl(person.profile_path)} className="w-20 h-20 rounded-full object-cover border-2 border-white/10 mb-2" />
                            <span className="text-xs font-bold text-white line-clamp-1">{person.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1">{person.character}</span>
                        </div>
                    ))}
                    {ep.crew?.filter((c:any) => c.job === "Director" || c.job === "Writer").map((person: any) => (
                        <div key={person.id + person.job} className="min-w-[100px] flex flex-col items-center text-center">
                            {person.profile_path ? (
                                <img src={getImageUrl(person.profile_path)} className="w-20 h-20 rounded-full object-cover border-2 border-cyan-500/30 mb-2" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-cyan-500/30 mb-2 text-xs">No Image</div>
                            )}
                            <span className="text-xs font-bold text-cyan-400 line-clamp-1">{person.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1">{person.job}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* LEFT: COMMENTS */}
        <div className="md:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sticky top-8 h-[500px] flex flex-col">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#ccff00]" />
                    بحث و گفتگو
                </h3>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-4">
                    {comments.length > 0 ? (
                        comments.map((c) => (
                            <div key={c.id} className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 ltr">{c.email.split('@')[0]}</span>
                                    <span className="text-[8px] text-gray-600">{new Date(c.created_at).toLocaleDateString('fa-IR')}</span>
                                </div>
                                <p className="text-xs text-gray-200 leading-relaxed">{c.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs text-center opacity-50">
                            <MessageSquare size={32} className="mb-2" />
                            <p>هنوز کسی نظری نداده.<br/>اولین باش!</p>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="relative shrink-0">
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="نظر شما..."
                        className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-3 text-xs text-white focus:outline-none focus:border-[#ccff00] pr-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    />
                    <button 
                        onClick={handleSendComment}
                        disabled={commentLoading || !newComment.trim()}
                        className="absolute left-1.5 top-1.5 p-1.5 bg-[#ccff00] text-black rounded-lg hover:bg-[#b3e600] disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {commentLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}