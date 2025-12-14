"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, Film, X, Cpu, Star } from 'lucide-react';
import { getImageUrl, getShowsByGenre } from '@/lib/tmdbClient'; // 🔥 تابع جدید ایمپورت شد
import { useRouter } from 'next/navigation';

const MOOD_MAP: Record<string, number> = {
  // درام (18)
  'غم': 18, 'ناراحت': 18, 'دلم گرفت': 18, 'گریه': 18, 'افسرده': 18, 'تنها': 18,
  // کمدی (35)
  'خنده': 35, 'شاد': 35, 'بخندم': 35, 'طنز': 35, 'بی‌حوصله': 35, 'باحال': 35,
  // اکشن (28)
  'انرژی': 28, 'اکشن': 28, 'بزن بزن': 28, 'جنگ': 10752, 'هیجان': 28, 'خشن': 28,
  // جنایی (80) & معمایی (9648)
  'استرس': 9648, 'ترس': 27, 'جنایی': 80, 'پلیسی': 80, 'معما': 9648, 'راز': 9648,
  // عاشقانه (10749)
  'عشق': 10749, 'رومانتیک': 10749, 'دوست': 10749, 'احساسی': 10749,
  // علمی تخیلی (10765)
  'فکر': 10765, 'پیچیده': 9648, 'علمی': 10765, 'تخیلی': 10765, 'فضا': 10765,
  // مستند (99)
  'خسته': 99, 'مستند': 99, 'واقعی': 99, 'آموزش': 99
};

export default function MoodChatPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { role: 'bot', text: 'سلام! من هسته هوشمندِ بینجرم ⚡️\nحس و حالتو بگو تا دقیق‌ترین سریال رو برات پیدا کنم.' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input; 
    const userMsg = { role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 1. تشخیص هوشمند ژانر
    let selectedGenreId = null;
    for (const [key, id] of Object.entries(MOOD_MAP)) {
        if (userText.includes(key)) {
            selectedGenreId = id;
            break;
        }
    }

    // 2. درخواست امن از طریق tmdbClient
    setTimeout(async () => {
        // 🔥 استفاده از تابع جدید که مشکل فیلترینگ ندارد
        let shows = await getShowsByGenre(selectedGenreId);
        
        let botText = "";
        
        if (shows.length > 0) {
            if (selectedGenreId) {
                botText = "پردازش انجام شد 🧠. اینا با مودِ الانِت هماهنگن:";
            } else {
                botText = "دقیق متوجه نشدم، ولی الگوریتم‌ها میگن اینا الان خیلی داغن، شاید خوشت بیاد:";
            }
        } else {
            // تلاش مجدد با فال‌بک (ترندها) اگر نتیجه‌ای نیامد
            shows = await getShowsByGenre(null); 
            botText = "ارتباط با مرکز داده کمی ضعیفه، ولی این لیست برگزیده رو فعلاً داشته باش:";
        }

        const botMsg = { role: 'bot', text: botText, suggestions: shows.slice(0, 10) };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
    }, 800);
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] flex flex-col pb-20 md:pb-0 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* HEADER */}
      <header className="p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between shadow-2xl z-20 sticky top-0">
          <div className="flex items-center gap-3">
              <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#ccff00] to-green-400 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                      <Cpu size={22} className="text-black" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full animate-pulse"></span>
              </div>
              <div>
                  <h1 className="font-black text-base flex items-center gap-2">
                      Binger AI <span className="bg-white/10 text-[9px] px-1.5 py-0.5 rounded text-gray-400 font-mono">BETA</span>
                  </h1>
                  <p className="text-[10px] text-gray-400">موتور پیشنهاد هوشمند</p>
              </div>
          </div>
          
          <button onClick={() => router.back()} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 hover:border-red-500/50 hover:text-red-400 group cursor-pointer">
              <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
      </header>

      {/* CHAT AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth z-10 no-scrollbar">
          {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-gray-800' : 'bg-gradient-to-br from-[#ccff00] to-green-500'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Zap size={16} className="text-black fill-black" />}
                  </div>

                  <div className={`flex flex-col gap-3 max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-gray-800 text-white rounded-tr-none' : 'bg-[#151515] border border-white/10 text-gray-200 rounded-tl-none'}`}>
                          {msg.text}
                      </div>

                      {/* CAROUSEL */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="w-full overflow-x-auto pb-2 no-scrollbar">
                              <div className="flex gap-3 w-max px-1">
                                  {msg.suggestions.map((show: any) => (
                                      <div key={show.id} onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="relative w-28 aspect-[2/3] bg-[#111] rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#ccff00] transition-all group shrink-0">
                                          <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={show.name} />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                                          <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-[#ccff00] flex items-center gap-0.5 shadow-sm">
                                              <Star size={8} fill="currentColor" /> {show.vote_average?.toFixed(1)}
                                          </div>
                                          <div className="absolute bottom-0 w-full p-2 text-right">
                                              <h4 className="text-[9px] font-bold line-clamp-2 text-white group-hover:text-[#ccff00] transition-colors leading-tight">{show.name}</h4>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          ))}
          
          {loading && (
              <div className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[#151515] border border-white/10 flex items-center justify-center"><Bot size={16} className="text-gray-500" /></div>
                  <div className="flex items-center gap-1 h-8 px-3 bg-[#151515] rounded-xl rounded-tl-none border border-white/5">
                      <span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce delay-200"></span>
                  </div>
              </div>
          )}
      </div>

      {/* INPUT */}
      <div className="p-4 bg-[#0a0a0a]/90 border-t border-white/10 backdrop-blur-lg z-20">
          <div className="relative flex items-center group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#ccff00]/20 to-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                type="text" 
                placeholder="اینجا تایپ کن... (مثلا: دلم یه سریال اکشن میخواد)" 
                className="relative w-full bg-[#151515] border border-white/10 rounded-full py-3.5 pr-5 pl-14 text-sm focus:outline-none focus:border-[#ccff00]/50 focus:bg-[#1a1a1a] transition-all text-white placeholder:text-gray-600 shadow-inner"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute left-2 p-2 bg-[#ccff00] rounded-full text-black hover:bg-[#b3e600] disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(204,255,0,0.4)]"
              >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "translate-x-0.5 translate-y-0.5" : ""} />}
              </button>
          </div>
      </div>
    </div>
  );
}