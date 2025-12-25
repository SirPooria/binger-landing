"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Tv, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getTrendingShows, getImageUrl } from '@/lib/tmdbClient';

export default function WelcomePage() {
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    
    const fetchPosters = async () => {
      const showsPage1 = await getTrendingShows(1);
      const showsPage2 = await getTrendingShows(2);
      const allShows = [...showsPage1, ...showsPage2];
      
      const posterUrls = allShows
        .map(show => getImageUrl(show.poster_path))
        .filter(url => url !== '/placeholder.png');

      setPosters(posterUrls);
    };

    checkUser();
    fetchPosters();
  }, []);

  const displayPosters = posters.length > 0 ? posters : new Array(12).fill("/placeholder.png");

  return (
    <div dir="rtl" className="h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] overflow-hidden relative flex flex-col items-center justify-center">
      
      {/* --- BACKGROUND POSTER WALL (Marquee Effect) --- */}
      <div className="absolute inset-0 z-0 opacity-40 grayscale-[50%] brightness-[0.4] pointer-events-none overflow-hidden">
         {/* ردیف اول */}
         <div className="absolute -top-20 -left-20 w-[200%] flex gap-4 rotate-12 animate-marquee-slow">
             {[...displayPosters, ...displayPosters, ...displayPosters].map((src, i) => (
                 <div key={`r1-${i}`} className="w-40 h-60 md:w-56 md:h-80 bg-gray-800 rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-2xl">
                    <img src={src} className="w-full h-full object-cover" alt="Poster" />
                 </div>
             ))}
         </div>
         
         {/* ردیف دوم */}
         <div className="absolute top-40 md:top-60 -left-20 w-[200%] flex gap-4 rotate-12 animate-marquee-reverse">
             {[...displayPosters, ...displayPosters, ...displayPosters].map((src, i) => (
                 <div key={`r2-${i}`} className="w-40 h-60 md:w-56 md:h-80 bg-gray-800 rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-2xl">
                    <img src={src} className="w-full h-full object-cover" alt="Poster" />
                 </div>
             ))}
         </div>

         {/* ماسک گرادینت */}
         <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent"></div>
      </div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 w-full max-w-md px-8 text-center space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, delay: 0.2 }}
          className="w-24 h-24 bg-[#ccff00] rounded-[2.5rem] mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(204,255,0,0.3)] mb-6"
        >
            <Tv size={48} className="text-black" strokeWidth={2.5} />
        </motion.div>

        <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              دستیار شخصیِ <br/>
              <span className="text-[#ccff00] drop-shadow-lg">خوره‌های سریال</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
              لیستت رو بساز، اپیزودها رو تیک بزن و بدون ترس از اسپویل نقد بخون.
            </p>
        </div>

        <div className="space-y-4 pt-4 w-full">
            {loading ? (
                <div className="w-full h-14 bg-white/10 rounded-2xl animate-pulse"></div>
            ) : user ? (
               <Link href="/dashboard" className="block w-full">
                  <button className="w-full bg-[#ccff00] text-black py-4 rounded-2xl font-black text-lg hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                    <User size={24} />
                    برگشت به داشبورد 
                  </button>
               </Link>
            ) : (
               <div className="space-y-4">
                 <Link href="/login" className="block w-full">
                    <button className="w-full bg-[#ccff00] text-black py-4 rounded-2xl font-black text-lg hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.4)] group">
                      شروع کنیم 
                      <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                 </Link>
                 
                 <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span>همیشه رایگان</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>بدون تبلیغات</span>
                 </div>
               </div>
            )}
        </div>

      </div>
    </div>
  );
}
