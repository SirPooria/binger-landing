"use client";

import React, { useState } from 'react';
// 👇 تغییر ۱: استفاده از کلاینت جدید
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  // 👇 تغییر ۲: ساخت نمونه کلاینت سوپابیس
  const supabase = createClient();
  
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // تابع ورود / ثبت‌نام
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. اول تلاش می‌کنیم وارد شویم (Login)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // 2. اگر ورود ناموفق بود (شاید کاربر جدیده؟)، تلاش می‌کنیم ثبت‌نام کنیم (Sign Up)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // این متا دیتاها بعداً در جدول پروفایل استفاده می‌شوند
            data: {
              full_name: email.split('@')[0], 
              avatar_url: '',
            }
          }
        });

        if (signUpError) {
          throw signUpError; // اگر ثبت‌نام هم نشد، ارور واقعی رو نشون بده
        } else {
          setMessage('ثبت‌نام انجام شد! در حال ورود...');
          router.push('/onboarding');
        }
      } else {
        // اگر ورود موفق بود
        setMessage('خوش آمدید! در حال انتقال...');
        router.push('/dashboard');
      }

    } catch (error: any) {
      setMessage('خطا: ' + (error.message || 'مشکلی پیش آمد'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#050505] text-white flex items-center justify-center p-4">
      
      <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden">
        
        {/* نئون پشت زمینه */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/20 blur-[50px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col items-center mb-6 z-10 relative">
          <div className="w-12 h-12 bg-[#ccff00] rounded-xl flex items-center justify-center text-black font-black text-2xl mb-3">B</div>
          <h1 className="text-2xl font-bold">ورود به دنیای بینجر</h1>
          <p className="text-gray-400 text-sm mt-1">ایمیل و رمز عبور خود را وارد کنید</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 z-10 relative">
          
          <div>
            <label className="text-xs text-gray-500 mr-2 mb-1 block">ایمیل</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-left ltr"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mr-2 mb-1 block">رمز عبور</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-left ltr"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p className="text-xs text-[#ccff00] text-center font-bold">{message}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
            <span>ورود / ثبت‌نام</span>
          </button>
        </form>

      </div>
    </div>
  );
}