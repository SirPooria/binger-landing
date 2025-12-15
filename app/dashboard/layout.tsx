"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, List, User, LogOut, Calendar as CalIcon, X, Sparkles, Menu, Loader2, Star, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { searchShows, getImageUrl } from '@/lib/tmdbClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // --- States ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  // --- Search States ---
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Logout Logic ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // --- Live Search Logic (Debounce) ---
  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchQuery.length > 1) {
              setIsSearching(true);
              const results = await searchShows(searchQuery);
              setSearchResults(results);
              setIsSearching(false);
          } else {
              setSearchResults([]);
          }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // بستن منو وقتی صفحه عوض میشه
  useEffect(() => {
      setIsSidebarOpen(false);
      setShowSearchOverlay(false);
  }, [pathname]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] flex flex-col relative overflow-x-hidden">
      
      {/* 🔍 SEARCH OVERLAY (لایه جستجوی تمام صفحه) */}
      {showSearchOverlay && (
          <div className="fixed inset-0 z-[200] bg-[#050505]/95 backdrop-blur-xl p-6 animate-in fade-in duration-200 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                  {/* Search Input Header */}
                  <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#050505]/95 p-4 rounded-2xl border border-white/10 z-10 shadow-2xl">
                      <Search className="text-[#ccff00]" />
                      <input 
                          autoFocus
                          type="text" 
                          placeholder="نام سریال را تایپ کنید..." 
                          className="bg-transparent text-white text-xl font-bold flex-1 outline-none placeholder:text-gray-600"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <button onClick={() => {setShowSearchOverlay(false); setSearchQuery(''); setSearchResults([]);}} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer"><X /></button>
                  </div>

                  {/* Results */}
                  {isSearching ? (
                      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#ccff00]" size={40} /></div>
                  ) : searchResults.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-20">
                          {searchResults.map((show) => (
                              <div 
                                key={show.id} 
                                onClick={() => { setShowSearchOverlay(false); router.push(`/dashboard/tv/${show.id}`); }} 
                                className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-[#ccff00]/50 transition-all hover:scale-105"
                              >
                                  <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 p-3 w-full bg-gradient-to-t from-black via-black/80 to-transparent">
                                      <h3 className="text-xs font-bold text-white line-clamp-1">{show.name}</h3>
                                      <span className="text-[10px] text-[#ccff00] flex items-center gap-1 mt-1"><Star size={8} fill="currentColor"/> {show.vote_average?.toFixed(1)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : searchQuery.length > 1 ? (
                      <p className="text-center text-gray-500 mt-10">موردی یافت نشد :(</p>
                  ) : (
                      <div className="text-center text-gray-600 mt-20 opacity-50">
                          <Search size={48} className="mx-auto mb-4" />
                          <p>دنبال چی میگردی؟</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 🔥 SIDEBAR DRAWER (منوی کشویی) */}
      <div 
        className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside 
        className={`fixed top-0 right-0 h-full w-72 bg-[#0a0a0a] border-l border-white/10 z-[160] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col py-6 px-4 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
               <img src="/Logo.png" alt="Binger Logo" className="w-20 h-20 object-contain" />
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full border border-white/5"><X size={20} /></button>
        </div>
        
        <nav className="flex-1 w-full space-y-2">
          <MenuItem icon={<Home size={20} />} label="ویترین" active={pathname === '/dashboard'} onClick={() => router.push('/dashboard')} />
          <MenuItem icon={<CalIcon size={20} />} label="تقویم پخش" active={pathname === '/dashboard/calendar'} onClick={() => router.push('/dashboard/calendar')} />
          <MenuItem icon={<List size={20} />} label="کتابخانه من" active={pathname === '/dashboard/lists'} onClick={() => router.push('/dashboard/lists')} />
          <MenuItem icon={<Sparkles size={20} className="text-purple-400" />} label="تراپیست هوشمند" active={pathname === '/dashboard/mood'} onClick={() => router.push('/dashboard/mood')} />
          <MenuItem icon={<User size={20} />} label="پروفایل" active={pathname === '/dashboard/profile'} onClick={() => router.push('/dashboard/profile')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-white/5 w-full p-3 rounded-xl transition-all font-bold text-sm bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 cursor-pointer">
                <LogOut size={18} /> خروج از حساب
            </button>
        </div>
      </aside>


      {/* 🔥 HEADER (ثابت و شفاف) */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full px-4 py-4 md:px-8 md:py-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent transition-all h-24 pointer-events-none">
          
          {/* دکمه منو + لوگو */}
          <div className="flex items-center gap-4 pointer-events-auto">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-xl border border-white/10 transition-all active:scale-95 group shadow-lg cursor-pointer"
              >
                  <Menu size={24} className="text-white group-hover:text-[#ccff00]" />
              </button>

              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/dashboard')}>
               <img src="/Logo.png" alt="Binger Logo" className="w-20 h-20 object-contain" />
              </div>
          </div>

          {/* دکمه جستجوی جدید (لایه بازشو) */}
          <div className="pointer-events-auto">
            <button 
                onClick={() => setShowSearchOverlay(true)}
                className="flex items-center gap-2 px-4 py-3 bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:border-[#ccff00]/50 transition-all group cursor-pointer shadow-lg"
            >
                <Search size={20} className="text-gray-400 group-hover:text-[#ccff00] transition-colors" />
                <span className="text-xs text-gray-400 font-bold hidden md:inline group-hover:text-white">جستجوی سریال...</span>
            </button>
          </div>
      </header>

      {/* --- PAGE CONTENT --- */}
      <main className="flex-1 w-full relative">
          {children}
      </main>

      {/* --- BOTTOM NAV (MOBILE ONLY) --- */}
      <div className="md:hidden fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 flex justify-around p-4 z-50 pb-6 safe-area-pb">
          <Home size={24} className={`cursor-pointer transition-colors ${pathname === '/dashboard' ? "text-[#ccff00]" : "text-gray-500"}`} onClick={() => router.push('/dashboard')} />
          <CalIcon size={24} className={`cursor-pointer transition-colors ${pathname === '/dashboard/calendar' ? "text-[#ccff00]" : "text-gray-500"}`} onClick={() => router.push('/dashboard/calendar')} />
          <List size={24} className={`cursor-pointer transition-colors ${pathname === '/dashboard/lists' ? "text-[#ccff00]" : "text-gray-500"}`} onClick={() => router.push('/dashboard/lists')} />
          <Sparkles size={24} className={`cursor-pointer transition-colors ${pathname === '/dashboard/mood' ? "text-purple-400" : "text-gray-500"}`} onClick={() => router.push('/dashboard/mood')} />
          <User size={24} className={`cursor-pointer transition-colors ${pathname === '/dashboard/profile' ? "text-[#ccff00]" : "text-gray-500"}`} onClick={() => router.push('/dashboard/profile')} />
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