"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, List, User, LogOut, Calendar as CalIcon, X, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
        router.push(`/dashboard?q=${searchQuery}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    // کانتینر اصلی: تمام صفحه، بدون اسکرول کلی
    <div dir="rtl" className="flex h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] overflow-hidden">
      
      {/* 1. SIDEBAR (ثابت سمت راست) */}
      <aside className="hidden md:flex w-64 min-w-[16rem] bg-black/40 border-l border-white/5 flex-col py-6 overflow-y-auto shrink-0 z-50">
        <div className="px-6 mb-8 flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
           <div className="w-10 h-10 bg-[#ccff00] rounded-xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(204,255,0,0.4)]">B</div>
           <span className="text-xl font-black tracking-tight">Binger</span>
        </div>
        
        <nav className="flex-1 w-full space-y-1 px-3">
          <MenuItem icon={<Home size={20} />} label="ویترین" active={pathname === '/dashboard'} onClick={() => router.push('/dashboard')} />
          <MenuItem icon={<CalIcon size={20} />} label="تقویم پخش" active={pathname === '/dashboard/calendar'} onClick={() => router.push('/dashboard/calendar')} />
          <MenuItem icon={<List size={20} />} label="کتابخانه من" active={pathname === '/dashboard/lists'} onClick={() => router.push('/dashboard/lists')} />
          <MenuItem icon={<Sparkles size={20} className="text-purple-400" />} label="تراپیست هوشمند" active={pathname === '/dashboard/mood'} onClick={() => router.push('/dashboard/mood')} />
          <MenuItem icon={<User size={20} />} label="پروفایل" active={pathname === '/dashboard/profile'} onClick={() => router.push('/dashboard/profile')} />
        </nav>

        <div className="p-4 mt-auto">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all font-bold text-sm bg-red-500/5 hover:bg-red-500/10 border border-red-500/10">
                <LogOut size={18} /> خروج
            </button>
        </div>
      </aside>

      {/* 2. MAIN WRAPPER (سمت چپ - شامل هدر و محتوا) */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#050505] relative">
        
        {/* 🔥 HEADER (ثابت بالا) */}
        <header className="h-16 md:h-20 shrink-0 w-full px-4 md:px-8 flex items-center justify-between z-40 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent backdrop-blur-sm border-b border-white/5 md:border-none">
            
            {/* Logo (موبایل) */}
            <div className="md:hidden flex items-center gap-2" onClick={() => router.push('/dashboard')}>
                <div className="w-8 h-8 bg-[#ccff00] rounded-lg flex items-center justify-center text-black font-black">B</div>
            </div>

            {/* 🔍 SEARCH BAR (اصلاح شده) */}
            <div className={`relative flex items-center h-10 md:h-12 transition-all duration-500 ease-out bg-[#151515] border border-white/10 rounded-full overflow-hidden ${isSearchOpen ? 'w-full md:w-96 shadow-[0_0_15px_rgba(204,255,0,0.15)] border-[#ccff00]/50' : 'w-10 md:w-12 justify-center cursor-pointer hover:bg-white/10'} mr-auto`}>
                
                {/* آیکون ذره‌بین */}
                <div 
                    className="h-full aspect-square flex items-center justify-center cursor-pointer z-10"
                    onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                >
                    <Search className={`transition-colors duration-300 ${isSearchOpen ? 'text-[#ccff00]' : 'text-gray-400'}`} size={20} />
                </div>

                {/* اینپوت (فقط وقتی باز است دیده شود) */}
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    placeholder="جستجو فیلم، سریال..." 
                    className={`bg-transparent border-none outline-none text-white text-sm h-full w-full px-2 transition-all duration-300 ${isSearchOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 w-0'}`}
                    autoFocus={isSearchOpen}
                />

                {/* دکمه بستن */}
                {isSearchOpen && (
                    <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="h-full px-3 text-gray-500 hover:text-red-400 transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>
        </header>

        {/* 3. SCROLLABLE CONTENT (فقط این بخش اسکرول میخورد) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-24 md:pb-10 relative w-full">
            {children}
        </main>

        {/* BOTTOM NAV (موبایل) */}
        <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex justify-around p-4 z-50 safe-area-pb">
            <Home size={24} className={pathname === '/dashboard' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard')} />
            <CalIcon size={24} className={pathname === '/dashboard/calendar' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/calendar')} />
            <List size={24} className={pathname === '/dashboard/lists' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/lists')} />
            <Sparkles size={24} className={pathname === '/dashboard/mood' ? "text-purple-400" : "text-gray-500"} onClick={() => router.push('/dashboard/mood')} />
            <User size={24} className={pathname === '/dashboard/profile' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/profile')} />
        </div>

      </div>
    </div>
  );
}

function MenuItem({ icon, label, active = false, onClick }: any) {
    return (
        <div onClick={onClick} className={`flex items-center gap-3 p-3 mx-2 rounded-xl cursor-pointer transition-all duration-200 group ${active ? 'bg-[#ccff00] text-black font-bold shadow-lg shadow-[#ccff00]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <span className={`transition-transform group-hover:scale-110 ${active ? 'scale-110' : ''}`}>{icon}</span>
            <span className="text-sm">{label}</span>
            {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-black"></div>}
        </div>
    );
}