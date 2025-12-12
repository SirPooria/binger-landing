"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye, Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

// --- تنظیمات ---
// آدرس SheetDB خودت را اینجا جایگذاری کن:
const API_URL = "https://sheetdb.io/api/v1/3irxkg0opxkbd"; 

export default function BingerLandingPage() {
  // این متغیرها وضعیت (State) را نگه می‌دارند
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // این تابع وقتی دکمه زده میشه اجرا میشه
  const handleSubmit = async () => {
    if (!phone || phone.length < 10) {
      alert("لطفاً شماره موبایل صحیح وارد کنید");
      return;
    }

    setLoading(true);

    try {
      // ارسال داده به گوگل شیت
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              phone: phone,
              date: new Date().toLocaleString("fa-IR"), // تاریخ شمسی
            },
          ],
        }),
      });

      if (response.ok) {
        setSubmitted(true); // موفقیت!
      } else {
        alert("مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("ارور شبکه. لطفاً اتصال اینترنت را چک کنید.");
    } finally {
      setLoading(false);
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
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
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
            <span>ظرفیت محدود لیست انتظار</span>
          </motion.div>
          
          <h1 className="text-5xl lg:text-7xl font-black leading-tight">
            کنترل دنیای <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">سریال‌ها</span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed max-w-md">
            اولین پلتفرم هوشمند ردیابی و کل‌کل سینمایی در ایران. <br/>
            قبل از بقیه، هم‌قبیله‌هات رو پیدا کن.
          </p>

          {/* --- INPUT BOX OR SUCCESS MESSAGE --- */}
          <div className="mt-4 w-full max-w-sm relative group h-16">
            
            {!submitted ? (
              // حالت اول: فرم ورودی
              <>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ccff00] to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative flex p-1.5 bg-[#0a0a0a] border border-white/10 rounded-xl h-full items-center">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="شماره موبایل..." 
                    disabled={loading}
                    className="flex-1 bg-transparent border-none outline-none text-white px-3 font-medium text-right dir-rtl placeholder:text-gray-600 h-full"
                  />
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[#ccff00] hover:bg-[#b3e600] disabled:bg-gray-600 text-black font-bold h-full px-5 rounded-lg transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                  >
                    {loading ? (
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
              </>
            ) : (
              // حالت دوم: پیام موفقیت
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full bg-[#ccff00]/10 border border-[#ccff00]/50 rounded-xl flex items-center justify-center gap-3 text-[#ccff00]"
              >
                <CheckCircle size={24} />
                <span className="font-bold text-lg">شما رزرو شدید! 🎉</span>
              </motion.div>
            )}

          </div>
          
          {submitted && (
             <p className="text-xs text-gray-500 animate-pulse">
               لینک دعوت اختصاصی شما به زودی پیامک می‌شود.
             </p>
          )}

        </div>

        {/* CENTER: 3D Phones */}
        <div className="col-span-12 md:col-span-7 relative h-full flex items-center justify-center md:-mt-10">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[80px] rounded-full"></div>
             
             <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2, duration: 0.8 }}
               className="relative w-full h-full flex items-center justify-center"
             >
                <img 
                  src="/phone1.png" 
                  alt="Mystery Screen 1" 
                  className="absolute left-10 md:left-20 w-[200px] md:w-[280px] z-10 opacity-80 scale-90"
                  style={{ transform: 'rotate(-5deg)' }} 
                />
                
                <img 
                  src="/phone2.png" 
                  alt="Mystery Screen 2" 
                  className="relative z-20 w-[220px] md:w-[300px] drop-shadow-2xl"
                  style={{ transform: 'rotate(5deg)' }} 
                />
             </motion.div>
        </div>

      </main>

      {/* --- Footer Features --- */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-6 px-6 z-30">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4">
            
            {/* کارت بینجی */}
            <div className="relative flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-cyan-500/30 backdrop-blur-md group overflow-visible">
                <div className="absolute -top-8 -right-4 w-20 md:w-24 transition-transform group-hover:scale-110 drop-shadow-2xl z-40">
                    <img src="/bingy.png" className="w-full h-full object-contain" alt="Bingy Mascot" />
                </div>
                <div className="w-12 md:w-16 shrink-0"></div> 
                <div className="text-right hidden md:block z-10">
                    <h3 className="text-sm font-bold text-white leading-tight">دستیار هوشمند</h3>
                    <p className="text-xs text-cyan-400 mt-0.5 line-clamp-1">بینجی هوای احساساتت رو داره.</p>
                </div>
            </div>

            <FeatureCard 
                icon={<Eye className="text-[#ccff00]" />} 
                title="ردیابی دقیق"
                desc="تایم‌لاین دقیق تماشا."
            />
            <FeatureCard 
                icon={<Users className="text-pink-500" />} 
                title="کل‌کل سینمایی"
                desc="بحث داغ بدون اسپویل."
            />
        </div>
      </div>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
      <div className="w-10 h-10 min-w-[40px] rounded-lg bg-black/50 flex items-center justify-center border border-white/10 overflow-hidden p-1">
        {icon}
      </div>
      <div className="text-right hidden md:block">
        <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>
      </div>
    </div>
  );
}