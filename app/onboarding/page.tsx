"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getPopularShows, getImageUrl } from '@/lib/tmdbClient';
import { Check, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Onboarding() {
  const supabase = createClient() as any;
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // State برای مدیریت اسکرول
  const [loading, setLoading] = useState(true); // لودینگ اولیه
  const [loadingMore, setLoadingMore] = useState(false); // لودینگ اسکرول
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Observer برای تشخیص رسیدن به ته لیست
  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastShowElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // دریافت اطلاعات کاربر
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUser(user);
    };
    getUser();
  }, []);

  // دریافت سریال‌ها (اجرا با تغییر page)
  useEffect(() => {
    const loadShows = async () => {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        // دریافت دیتا با شماره صفحه
        const newShows = await getPopularShows(page);

        setShows(prevShows => {
          // ترکیب لیست قبلی با لیست جدید و حذف تکراری‌ها
          const combined = [...prevShows, ...newShows];
          const uniqueShows = combined.filter((show, index, self) => 
            index === self.findIndex((t) => t.id === show.id)
          );
          return uniqueShows;
        });

        // اگر دیتایی نیامد یعنی به ته لیست API رسیدیم
        if (newShows.length === 0) setHasMore(false);

      } catch (error) {
        console.error("Error fetching shows:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadShows();
  }, [page]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const handleFinish = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);

    try {
        const records = Array.from(selectedIds).map(id => ({
            user_id: user.id,
            show_id: id
        }));
        
        // ذخیره در دیتابیس با بررسی خطا
        const { error } = await supabase
            .from('watchlist')
            .upsert(records, { onConflict: 'user_id, show_id' });

        if (error) throw error;

        // موفقیت‌آمیز بود:
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
            router.replace('/dashboard');
        }, 1500);

    } catch (error: any) {
        console.error("Error saving watchlist:", error);
        alert("خطا در ذخیره اطلاعات: " + (error.message || "مشکل ناشناخته"));
        setSubmitting(false); // توقف چرخش دکمه
    }
  };

  if (loading && page === 1) return <div className="h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]"><Loader2 className="animate-spin" size={48} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] p-6 pb-32">
      
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mt-10 mb-12 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto border border-[#ccff00]/20 mb-6">
              <Sparkles size={32} className="text-[#ccff00]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black">چی دوست داری؟</h1>
          <p className="text-gray-400 text-lg">چند تا از سریال‌های مورد علاقه‌ت رو انتخاب کن تا هوش مصنوعی بینجر دستش بیاد چی بهت پیشنهاد بده.</p>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 md:gap-6">
          {shows.map((show, index) => {
              const isSelected = selectedIds.has(show.id);
              
              // بررسی اینکه آیا این آخرین آیتم است؟ اگر بله، ref را به آن متصل می‌کنیم
              const isLastElement = shows.length === index + 1;

              return (
                  <div 
                    ref={isLastElement ? lastShowElementRef : null}
                    key={`${show.id}-${index}`} // ایندکس اضافه شد تا از خطای تکراری احتمالی جلوگیری شود
                    onClick={() => toggleSelect(show.id)}
                    className={`relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 animate-in fade-in zoom-in-95 ${isSelected ? 'ring-4 ring-[#ccff00] scale-95' : 'hover:scale-105'}`}
                  >
                      <img src={getImageUrl(show.poster_path)} className={`w-full h-full object-cover transition-all ${isSelected ? 'opacity-40 grayscale' : ''}`} loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                      
                      {/* Checkmark Overlay */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                          <div className="w-12 h-12 bg-[#ccff00] rounded-full flex items-center justify-center shadow-lg">
                              <Check size={24} className="text-black" strokeWidth={4} />
                          </div>
                      </div>

                      <div className="absolute bottom-0 p-3 w-full text-center">
                          <span className="text-xs font-bold line-clamp-1">{show.name}</span>
                      </div>
                  </div>
              )
          })}
      </div>

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#ccff00]" size={32} />
        </div>
      )}

      {/* Bottom Bar (Floating) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-50 flex justify-center">
          <button 
            onClick={handleFinish}
            disabled={selectedIds.size === 0 || submitting}
            className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-black text-lg transition-all shadow-2xl ${
                selectedIds.size > 0 
                ? 'bg-[#ccff00] text-black hover:bg-[#b3e600] scale-100' 
                : 'bg-white/10 text-gray-500 cursor-not-allowed scale-95 opacity-50'
            }`}
          >
              {submitting ? <Loader2 className="animate-spin" /> : (
                  <>
                      <span>{selectedIds.size} تا انتخاب شد، بریم؟</span>
                      <ArrowLeft strokeWidth={3} />
                  </>
              )}
          </button>
      </div>

    </div>
  );
}