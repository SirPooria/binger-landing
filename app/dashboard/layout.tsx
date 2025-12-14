"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, List, User, LogOut, Calendar as CalIcon, X, Sparkles, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
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
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex flex-col relative overflow-x-hidden">
      
      {/* 🔥 SIDEBAR DRAWER (منوی کشویی موبایل و دسکتاپ) */}
      <div 
        className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside 
        className={`fixed top-0 right-0 h-full w-72 bg-[#0a0a0a] border-l border-white/10 z-[160] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col py-6 px-4 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
               {/* 🖼️ LOGO IMAGE */}
               <img src="/logo.png" alt="Binger Logo" className="w-30 h-30 object-contain drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]" />
               
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full border border-white/5"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 w-full space-y-2">
          <MenuItem icon={<Home size={20} />} label="ویترین" active={pathname === '/dashboard'} onClick={() => { router.push('/dashboard'); setIsSidebarOpen(false); }} />
          <MenuItem icon={<CalIcon size={20} />} label="تقویم پخش" active={pathname === '/dashboard/calendar'} onClick={() => { router.push('/dashboard/calendar'); setIsSidebarOpen(false); }} />
          <MenuItem icon={<List size={20} />} label="کتابخانه من" active={pathname === '/dashboard/lists'} onClick={() => { router.push('/dashboard/lists'); setIsSidebarOpen(false); }} />
          <MenuItem icon={<Sparkles size={20} className="text-purple-400" />} label="تراپیست هوشمند" active={pathname === '/dashboard/mood'} onClick={() => { router.push('/dashboard/mood'); setIsSidebarOpen(false); }} />
          <MenuItem icon={<User size={20} />} label="پروفایل" active={pathname === '/dashboard/profile'} onClick={() => { router.push('/dashboard/profile'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all font-bold text-sm bg-red-500/5 hover:bg-red-500/10 border border-red-500/10">
                <LogOut size={18} /> خروج از حساب
            </button>
        </div>
      </aside>


      {/* 🔥 HEADER (شفاف و شناور) */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full px-4 py-4 md:px-8 md:py-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-all pointer-events-none h-24">
          
          {/* سمت راست: دکمه منو + لوگو */}
          <div className="flex items-center gap-4 pointer-events-auto">
              
              {/* دکمه همبرگری */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all active:scale-95 group shadow-lg"
              >
                  <Menu size={24} className="text-white group-hover:text-[#ccff00]" />
              </button>

              {/* لوگو (کنار دکمه منو) */}
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push('/dashboard')}>
                  {/* 🖼️ LOGO IMAGE HEADER */}
                  <img src="/logo.png" alt="Binger Logo" className="w-30 h-30 object-contain drop-shadow-[0_0_10px_rgba(204,255,0,0.3)] group-hover:scale-110 transition-transform" />
                  {/* نام برند فقط در دسکتاپ */}
                  
              </div>
          </div>

          {/* سمت چپ: جستجو */}
          <div className="pointer-events-auto">
            <div className={`relative flex items-center h-10 md:h-12 transition-all duration-500 ease-out bg-black/40 backdrop-blur-md border border-white/10 rounded-full overflow-hidden ${isSearchOpen ? 'w-full md:w-96 shadow-[0_0_20px_rgba(204,255,0,0.1)] border-[#ccff00]/50' : 'w-10 md:w-12 justify-center cursor-pointer hover:bg-white/10'}`}>
                
                {/* آیکون ذره‌بین (وسط‌چین دقیق) */}
                <div 
                    className="absolute right-0 top-0 h-full w-10 md:w-12 flex items-center justify-center z-10"
                    onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                >
                    <Search className={`transition-colors duration-300 ${isSearchOpen ? 'text-[#ccff00]' : 'text-gray-200'}`} size={20} />
                </div>

                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    placeholder="جستجو..." 
                    className={`bg-transparent border-none outline-none text-white text-sm h-full w-full pl-3 pr-10 md:pr-12 transition-all duration-300 ${isSearchOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 w-0'}`}
                    autoFocus={isSearchOpen}
                />

                {isSearchOpen && (
                    <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="absolute left-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors z-20">
                        <X size={16} />
                    </button>
                )}
            </div>
          </div>
      </header>

      {/* --- PAGE CONTENT --- */}
      <main className="flex-1 w-full relative">
          {children}
      </main>

      {/* --- BOTTOM NAV (MOBILE) --- */}
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex justify-around p-4 z-50 pb-6 safe-area-pb">
          <Home size={24} className={pathname === '/dashboard' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard')} />
          <CalIcon size={24} className={pathname === '/dashboard/calendar' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/calendar')} />
          <List size={24} className={pathname === '/dashboard/lists' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/lists')} />
          <Sparkles size={24} className={pathname === '/dashboard/mood' ? "text-purple-400" : "text-gray-500"} onClick={() => router.push('/dashboard/mood')} />
          <User size={24} className={pathname === '/dashboard/profile' ? "text-[#ccff00]" : "text-gray-500"} onClick={() => router.push('/dashboard/profile')} />
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