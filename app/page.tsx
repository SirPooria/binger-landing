"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye, Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

// --- تنظیمات ---
const API_URL = "https://sheetdb.io/api/v1/3irxkg0opxkbd"; 

export default function BingerLandingPage() {
  // متغیرهای وضعیت (State)
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  // تابع ارسال فرم با اعتبارسنجی و اتصال به گوگل شیت
  const handleSubmit = async () => {
    // 1. پاک کردن پیام‌های قبلی
    setMessage("");
    setStatus('idle');

    // 2. اعتبارسنجی شماره موبایل (فرمت ایران: 09xxxxxxxxx)
    const iranMobileRegex = /^09[0-9]{9}$/;
    if (!iranMobileRegex.test(phone)) {
      setStatus('error');
      setMessage("شماره موبایل نامعتبر است (مثلاً ۰۹۱۲...)");
      return;
    }

    // 3. شروع ارسال
    setStatus('loading');

    try {
      // ارسال به گوگل شیت
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              phone: phone, // شماره موبایل
              date: new Date().toLocaleString("fa-IR"), // تاریخ شمسی
              source: "Landing Page", // منبع (برای تحلیل‌های بعدی)
            },
          ],
        }),
      });

      // 4. بررسی نتیجه
      if (response.ok) {
        setStatus('success');
        setMessage("تبریک! جایگاهت رزرو شد. به محض انتشار خبرت می‌کنیم.");
        setPhone(""); // پاک کردن فیلد برای زیبایی
      } else {
        setStatus('error');
        setMessage("مشکلی در سرور پیش آمد. لطفاً دوباره تلاش کنید.");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus('error');
      setMessage("ارور شبکه. لطفاً اتصال اینترنت را چک کنید.");
    }
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#050505] text-white font-['Vazirmatn'] overflow-hidden relative selection:bg-[#ccff00] selection:text-black flex flex-col">
      
      {/* Background Glows */}
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#ccff00]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* --- Header --- */}
      <nav className="w-full z-50 flex justify-between items-center px-8 py-6">
        <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <span className="text-[10px] text-gray-400 hidden sm:block">اپلیکیشن ردیابی سریال</span>
        </div>
        <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
          ورود اعضا
        </button>
      </nav>

      {/* --- Main Layout --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 grid grid-cols-12 gap-4 items-center h-full pb-20">
        
        {/* RIGHT SIDE: Text & Inputs */}
        <div className="col-span-12 md:col-span-5 flex flex-col justify-center space-y-6 z-20 text-right md:-mt-32">
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#ccff00] w-fit"
          >
            <Sparkles size={14} />
            <span> وارد لیست انتظار شو ( ظرفیت محدود ) </span>
          </motion.div>
          
          <h1 className="text-4xl lg:text-7xl font-black leading-tight">
           دیگه یادت نمیره <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">قسمت چندی !</span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed max-w-md">
           اولین دستیار شخصیِ فیلم‌بازها در ایران. نقد کن، لیستت رو بساز <br className="hidden md:block"/>
           و بدون ترس از اسپویل نقد بخون ! 
          </p>

          {/* --- INPUT BOX OR SUCCESS MESSAGE --- */}
          <div className="mt-4 w-full max-w-sm relative group">
            
            {status !== 'success' ? (
              // حالت اول: فرم ورودی
              <div className="relative h-16">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ccff00] to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative flex p-1.5 bg-[#0a0a0a] border border-white/10 rounded-xl h-full items-center">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="شماره موبایل (۰۹۱۲...)" 
                    disabled={status === 'loading'}
                    className="flex-1 bg-transparent border-none outline-none text-white px-3 font-medium text-right dir-rtl placeholder:text-gray-600 h-full w-full"
                  />
                  <button 
                    onClick={handleSubmit}
                    disabled={status === 'loading'}
                    className="bg-[#ccff00] hover:bg-[#b3e600] disabled:bg-gray-600 text-black font-bold h-full px-5 rounded-lg transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    {status === 'loading' ? (
                      <>
                        <span>صبر کنید</span>
                        <Loader2 className="animate-spin" size={16} />
                      </>
                    ) : (
                      <>
                        <span>رزرو جایگاه</span>
                        <ArrowLeft size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // حالت دوم: پیام موفقیت
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-16 bg-[#ccff00]/10 border border-[#ccff00]/50 rounded-xl flex items-center justify-center gap-3 text-[#ccff00]"
              >
                <CheckCircle size={24} />
                <span className="font-bold text-lg">شما رزرو شدید! 🎉</span>
              </motion.div>
            )}

            {/* پیام وضعیت (ارور یا موفقیت تکمیلی) */}
            {message && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 text-xs font-bold text-center ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}
              >
                {message}
              </motion.p>
            )}

          </div>
          
        </div>

        {/* CENTER: 3D Phones */}
        <div className="col-span-12 md:col-span-7 relative h-full flex items-center justify-center md:-mt-10 min-h-[300px]">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-cyan-500/10 blur-[60px] md:blur-[80px] rounded-full"></div>
             
             <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2, duration: 0.8 }}
               className="relative w-full h-full flex items-center justify-center"
             >
                <img 
                  src="/Phone1.png" 
                  alt="Mystery Screen 1" 
                  className="absolute left-4 md:left-20 w-[160px] md:w-[280px] z-10 opacity-80 scale-90 object-contain"
                  style={{ transform: 'rotate(-5deg)' }} 
                />
                
                <img 
                  src="/Phone2.png" 
                  alt="Mystery Screen 2" 
                  className="relative z-20 w-[140px] md:w-[250px] drop-shadow-2xl object-contain"
                  style={{ transform: 'rotate(5deg)' }} 
                />
             </motion.div>
        </div>

      </main>

      {/* --- Footer Features --- */}
      <div className="relative md:absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-6 z-30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* کارت بینجی */}
            <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-cyan-500/30 backdrop-blur-md group overflow-visible min-h-[70px]">
                <div className="absolute -top-6 -right-2 w-16 md:w-24 transition-transform group-hover:scale-110 drop-shadow-2xl z-40">
                    <img src="/bingy.png" className="w-full h-full object-contain" alt="Bingy Mascot" />
                </div>
                <div className="w-12 md:w-20 shrink-0"></div> 
                <div className="text-right z-10 flex-1">
                    <h3 className="text-sm font-bold text-white leading-tight"> تنها نبین! </h3>
                    <p className="text-xs text-cyan-400 mt-0.5"> با هزاران نفر همراه شو. اینجا سینما تعطیل نیست. </p>
                </div>
            </div>

            <FeatureCard 
                icon={<Eye className="text-[#ccff00]" size={20} />} 
                title="آرشیوِ مغزت رو خالی کن"
                desc=" مهم نیست کی دیدی، ما دقیق یادمونه کجای سریالی. "
            />
            <FeatureCard 
                icon={<Users className="text-pink-500" size={20} />} 
                title=" منطقه امن (بدون اسپویل) "
                desc=" هر اپیزودی که ببینی، به نظراتش دسترسی پیدا میکنی! "
            />
        </div>
      </div>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors min-h-[70px]">
      <div className="w-10 h-10 min-w-[40px] rounded-lg bg-black/50 flex items-center justify-center border border-white/10 overflow-hidden p-1">
        {icon}
      </div>
      <div className="text-right flex-1">
        <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}