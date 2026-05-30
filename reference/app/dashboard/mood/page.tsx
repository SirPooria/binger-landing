"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, X, Cpu, Star, HelpCircle } from 'lucide-react';
import { getImageUrl, getShowsByGenre, searchShows, getSimilarShows } from '@/lib/tmdbClient'; 
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const MOOD_MAP: Record<string, number> = {
  // ⛩️ انیمه (16)
  'انیمه': 16, 'انیمیشن': 16, 'کارتون': 16, 'اوتاکو': 16, 'مانگا': 16, 
  'ژاپنی': 16, 'انیمه ای': 16, 'نقاشی': 16, 'بچه': 16, 'کودک': 16,

  // 😂 کمدی (35)
  'خنده': 35, 'شاد': 35, 'بخندم': 35, 'طنز': 35, 'بی‌حوصله': 35, 'باحال': 35,
  'کمدی': 35, 'فان': 35, 'جوک': 35, 'مسخره': 35, 'شادی': 35, 'خنده‌دار': 35,
  'بگو بخند': 35, 'روحیه': 35, 'حال خوب': 35, 'کمدین': 35, 'سیتکام': 35,
  'پکیدم': 35, 'جر خوردم': 35, 'قهقهه': 35, 'بامزه': 35, 'نمک': 35,

  // 😭 درام (18)
  'غم': 18, 'ناراحت': 18, 'دلم گرفت': 18, 'گریه': 18, 'افسرده': 18, 'تنها': 18,
  'درام': 18, 'سنگین': 18, 'جدی': 18, 'تلخ': 18, 'بغض': 18, 'اشک': 18,
  'شکست': 18, 'عاطفی': 18, 'داغون': 18, 'تاریک': 18, 'سیاه': 18, 'غمگین': 18,
  'بدبخت': 18, 'بیچاره': 18, 'رنج': 18, 'غصه': 18, 'دلگیر': 18, 'دپرس': 18,

  // 💥 اکشن (28)
  'انرژی': 28, 'اکشن': 28, 'بزن بزن': 28, 'جنگ': 10752, 'هیجان': 28, 'خشن': 28,
  'دعوا': 28, 'کتک': 28, 'تفنگ': 28, 'شلیک': 28, 'بمب': 28, 'انفجار': 28,
  'سریع': 28, 'تعقیب': 28, 'گریز': 28, 'مبارزه': 28, 'رزمی': 28,

  // 🕵️ جنایی & معمایی (80, 9648)
  'استرس': 9648, 'ترس': 27, 'جنایی': 80, 'پلیسی': 80, 'معما': 9648, 'راز': 9648,
  'کاراگاه': 80, 'قتل': 80, 'قاتل': 80, 'دزد': 80, 'سرقت': 80, 'مافیا': 80,
  'گنگستر': 80, 'زندان': 80, 'جرم': 80, 'خلاف': 80, 'مواد': 80, 'باند': 80,
  'مرموز': 9648, 'پیچیده': 9648, 'عجیب': 9648, 'ذهنی': 9648, 'پازل': 9648,
  'معمایی': 9648, 'هیجانی': 9648, 'تعلیق': 9648, 'شرلوک': 9648,

  // 👻 ترسناک (27)
  'ترسناک': 27, 'وحشت': 27, 'جن': 27, 'روح': 27, 'شبح': 27, 'خون': 27,
  'زامبی': 27, 'اسلشر': 27, 'سکته': 27, 'جیغ': 27, 'کابوس': 27, 'شیطان': 27,
  'تسخیر': 27, 'طلسم': 27, 'جادو': 10765, 'خوناشام': 10765,

  // ❤️ عاشقانه (10749)
  'عشق': 10749, 'رومانتیک': 10749, 'دوست': 10749, 'احساسی': 10749, 'لاو': 10749,
  'عاشقی': 10749, 'بوسه': 10749, 'ازدواج': 10749, 'نامزد': 10749, 'کرایش': 10749,

  // 👽 علمی تخیلی (10765)
  'فکر': 10765, 'علمی': 10765, 'تخیلی': 10765, 'فضا': 10765, 'آینده': 10765,
  'ربات': 10765, 'تکنولوژی': 10765, 'سایبرپانک': 10765, 'مریخ': 10765, 'بیگانگان': 10765,
  'آدم فضایی': 10765, 'زمان': 10765, 'سفر در زمان': 10765,

  // 📚 مستند (99)
  'خسته': 99, 'مستند': 99, 'واقعی': 99, 'آموزش': 99, 'حیوانات': 99,
  'راز بقا': 99, 'طبیعت': 99, 'تاریخی': 99, 'بیوگرافی': 99
};

const THEMES: any = {
    default: "from-purple-600/10 to-cyan-600/10",
    18: "from-blue-900/20 to-gray-900/20",
    35: "from-yellow-400/10 to-orange-500/10",
    28: "from-red-600/10 to-orange-600/10",
    27: "from-red-900/20 to-black",
    10749: "from-pink-500/10 to-rose-500/10",
    16: "from-indigo-500/10 to-purple-500/10",
};

const BOT_VARIANTS: any = {
    fallback: [
        "دقیق نگرفتم چی میخوای، ولی اینا الان خیلی ترندن:",
        "سیگنال ضعیفه! ولی فکر کنم از اینا خوشت بیاد:",
        "یه کم گیج شدم، ولی این لیست برگزیده رو ببین:",
    ],
    success: [
        "فهمیدم! اینا دقیقاً خوراک خودته:",
        "اوه، سلیقه‌ت عالیه. اینا رو ببین:",
        "پردازش شد 🧠. بهترین گزینه‌ها برای مودِ الانِت:",
        "پیداشون کردم! فکر کنم عاشق اینا بشی:",
    ]
};

const QUICK_CHIPS = [
    { label: "😂 میخوام بترکم", text: "یه سریال کمدی و خنده دار میخوام" },
    { label: "😭 دلم گرفته", text: "خیلی ناراحتم و دلم گرفته" },
    { label: "🤯 مغزم رو بپکون", text: "یه سریال معمایی و پیچیده میخوام" },
    { label: "👺 انیمه خوب", text: "چند تا انیمه خفن معرفی کن" },
    { label: "🩸 خون و خونریزی", text: "دلم اکشن و بزن بزن میخواد" },
    { label: "❤️ عاشقانه", text: "یه سریال رمانتیک و احساسی" },
];

const SIMILARITY_TRIGGERS = ['شبیه', 'مثل', 'سبک', 'تو مایه های', 'عین', 'مانند'];
const STOP_WORDS = ['سریال', 'فیلم', 'یه', 'معرفی', 'کن', 'میخوام', 'به', 'رو', 'چی', 'داری', 'بهم', 'بگو', 'هست', 'باشه', 'دارین', 'دوست دارم', 'خوشم میاد'];

export default function MoodChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { role: 'bot', text: 'سلام! من هسته هوشمندِ بینجرم ⚡️\nحس و حالتو بگو یا بگو شبیه چه سریالی دوست داری تا بهت پیشنهاد بدم.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES.default);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const getRandomResponse = (type: 'success' | 'fallback') => {
      const list = BOT_VARIANTS[type];
      return list[Math.floor(Math.random() * list.length)];
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // --- 1. Similarity Check ---
    const similarityTrigger = SIMILARITY_TRIGGERS.find(t => textToSend.includes(t));
    
    if (similarityTrigger) {
        let query = textToSend;
        query = query.replace(similarityTrigger, "");
        STOP_WORDS.forEach(word => query = query.replace(new RegExp(word, 'g'), ""));
        query = query.trim();

        if (query.length > 1) {
            try {
                const searchResults = await searchShows(query);
                if (searchResults && searchResults.length > 0) {
                    const targetShow = searchResults[0];
                    const similarShows = await getSimilarShows(targetShow.id);
                    
                    setTimeout(() => {
                        const botText = `اگه «${targetShow.name}» رو دوست داری، احتمالاً عاشق اینایی:`;
                        const botMsg = { role: 'bot', text: botText, suggestions: similarShows.slice(0, 10) };
                        setMessages(prev => [...prev, botMsg]);
                        setLoading(false);
                    }, 800);
                    return;
                }
            } catch (e) { console.error(e); }
        }
    }

    // --- 2. Mood/Genre Check ---
    let selectedGenreId = null;

    for (const [key, id] of Object.entries(MOOD_MAP)) {
        if (textToSend.includes(key)) {
            selectedGenreId = id;
            break;
        }
    }

    setTimeout(async () => {
        let shows = [];
        let botText = "";
        
        // 🔥 رندوم سازی صفحه (بین 1 تا 10)
        const randomPage = Math.floor(Math.random() * 10) + 1;

        if (selectedGenreId) {
            // دریافت با صفحه رندوم
            shows = await getShowsByGenre(selectedGenreId, randomPage);
            
            // 🔥 چک کردن اینکه آیا واقعا سریالی پیدا شد؟
            if (shows && shows.length > 0) {
                 // شافل کردن نتایج برای تنوع بیشتر
                 shows = shows.sort(() => 0.5 - Math.random());
                 
                 botText = getRandomResponse('success');
                 const newTheme = THEMES[selectedGenreId] || THEMES.default;
                 setCurrentTheme(newTheme);
            } else {
                 // اگه ژانر پیدا شد ولی لیست خالی بود (خیلی نادره ولی ممکنه)
                 shows = await getShowsByGenre(null, 1);
                 botText = "متوجه شدم چی میخوای ولی متاسفانه سرور یاری نکرد. اینا رو فعلاً ببین:";
            }

        } else {
            shows = await getShowsByGenre(null, randomPage); // ترندهای رندوم
            botText = getRandomResponse('fallback');
            setCurrentTheme(THEMES.default);
            try {
                await supabase.from('ai_logs').insert([{ query: textToSend, status: 'failed' }] as any);
            } catch (e) { }
        }

        const botMsg = { role: 'bot', text: botText, suggestions: shows.slice(0, 10) };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
    }, 800);
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] flex flex-col pb-20 md:pb-0 relative overflow-hidden pt-24 transition-colors duration-1000">
      
      {/* Dynamic Background */}
      <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-br ${currentTheme} blur-[100px] opacity-40 pointer-events-none transition-all duration-1000`}></div>

      {/* MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHelpModal(false)}></div>
            <div className="bg-[#1a1a1a] border border-[#ccff00]/30 w-full max-w-md rounded-3xl p-6 relative z-10 shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                <button onClick={() => setShowHelpModal(false)} className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer text-gray-400 hover:text-white"><X size={20} /></button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#ccff00]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccff00]/20">
                        <HelpCircle size={32} className="text-[#ccff00]" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">راهنمای هوش مصنوعی</h3>
                </div>
                <div className="space-y-6 text-right">
                    <div>
                        <h4 className="font-bold text-[#ccff00] mb-2 text-sm flex items-center gap-2"><Zap size={16}/> بر اساس حس و حال</h4>
                        <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                            کافیه بگی الان چه حسی داری. مثلاً:
                            <br/>• "خیلی <span className="text-white font-bold">ناراحتم</span> و دلم گرفته"
                            <br/>• "یه چیز <span className="text-white font-bold">خنده‌دار</span> میخوام که بترکم"
                            <br/>• "دلم هیجان و <span className="text-white font-bold">اکشن</span> میخواد"
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-400 mb-2 text-sm flex items-center gap-2"><Star size={16}/> بر اساس شباهت</h4>
                        <p className="text-gray-300 text-xs leading-6 bg-white/5 p-3 rounded-xl border border-white/5">
                            اسم سریالی که دوست داری رو بگو تا شبیهش رو پیدا کنم:
                            <br/>• "یه سریال <span className="text-white font-bold">شبیه بریکینگ بد</span> معرفی کن"
                            <br/>• "چیزی تو مایه‌های <span className="text-white font-bold">فرندز</span> داری؟"
                        </p>
                    </div>
                    <p className="text-center text-[10px] text-gray-500 pt-4 border-t border-white/5">یادت باشه من هنوز در مرحله BETA هستم و دارم یاد می‌گیرم! 🤖</p>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <header className="p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between shadow-2xl z-20 relative">
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
          <button onClick={() => setShowHelpModal(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all cursor-pointer"><HelpCircle size={20} /></button>
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
                      {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="w-full overflow-x-auto pb-2 no-scrollbar">
                              <div className="flex gap-3 w-max px-1">
                                  {msg.suggestions.map((show: any) => (
                                      <div key={show.id} onClick={() => router.push(`/dashboard/tv/${show.id}`)} className="relative w-28 aspect-[2/3] bg-[#111] rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#ccff00] transition-all group shrink-0">
                                          <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={show.name} />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60"></div>
                                          <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-[#ccff00] flex items-center gap-0.5 shadow-sm"><Star size={8} fill="currentColor" /> {show.vote_average?.toFixed(1)}</div>
                                          <div className="absolute bottom-0 w-full p-2 text-right"><h4 className="text-[9px] font-bold line-clamp-2 text-white group-hover:text-[#ccff00] transition-colors leading-tight">{show.name}</h4></div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          ))}
          {loading && (
              <div className="flex gap-3 animate-pulse"><div className="w-8 h-8 rounded-lg bg-[#151515] border border-white/10 flex items-center justify-center"><Bot size={16} className="text-gray-500" /></div><div className="flex items-center gap-1 h-8 px-3 bg-[#151515] rounded-xl rounded-tl-none border border-white/5"><span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce delay-100"></span><span className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-bounce delay-200"></span></div></div>
          )}
      </div>

      {/* INPUT + CHIPS */}
      <div className="bg-[#0a0a0a]/90 border-t border-white/10 backdrop-blur-lg z-20 flex flex-col gap-2 pb-2">
          <div className="overflow-x-auto no-scrollbar py-2 px-4">
               <div className="flex gap-2 w-max">
                   {QUICK_CHIPS.map((chip, idx) => (
                       <button 
                         key={idx}
                         onClick={() => handleSend(chip.text)}
                         disabled={loading}
                         className="bg-white/5 hover:bg-[#ccff00]/20 hover:text-[#ccff00] hover:border-[#ccff00]/50 border border-white/10 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                       >
                           {chip.label}
                       </button>
                   ))}
               </div>
          </div>
          <div className="relative flex items-center group px-4 pb-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                type="text" 
                placeholder="تایپ کن... (مثلا: یه سریال شبیه بریکینگ بد)" 
                className="relative w-full bg-[#151515] border border-white/10 rounded-full py-3.5 pr-5 pl-14 text-sm focus:outline-none focus:border-[#ccff00]/50 focus:bg-[#1a1a1a] transition-all text-white placeholder:text-gray-600 shadow-inner"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="absolute left-6 p-2 bg-[#ccff00] rounded-full text-black hover:bg-[#b3e600] disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(204,255,0,0.4)]"
              >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "translate-x-0.5 translate-y-0.5" : ""} />}
              </button>
          </div>
      </div>
    </div>
  );
}