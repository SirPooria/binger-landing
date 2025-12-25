"use client";

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

// Simple Google Icon SVG
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.792C34.857 5.253 29.734 3 24 3C12.955 3 4 11.955 4 23s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 11 24 11c3.059 0 5.842 1.154 7.961 3.039L38.802 8.792C34.857 5.253 29.734 3 24 3C16.586 3 10.133 6.913 6.306 12.691z"></path>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.41 44 31.891 44 26c0-1.341-.138-2.65-.389-3.917z"></path>
    </svg>
);


export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // --- Handler for Magic Link ---
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // This is the URL to which the user will be redirected after clicking the magic link.
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      setMessage('لینک ورود به ایمیل شما ارسال شد! لطفا صندوق ورودی (و پوشه اسپم) خود را چک کنید.');

    } catch (error: any) {
      setMessage(`خطا: ${error.error_description || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Handler for Google OAuth ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('در حال انتقال به صفحه ورود گوگل...');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // This is where the user will be sent back FROM Google
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
            },
    });
    // The user is redirected to Google, so no need to setLoading(false) here.
  };

  return (
    <div dir="rtl" className="h-screen w-full bg-[#101010] text-white font-['Vazirmatn'] flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">

        <Link href="/" className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
            بازگشت به صفحه اصلی
        </Link>
        
        <div className="bg-black/20 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black">ورود یا ثبت‌نام</h1>
            <p className="text-gray-500 mt-2 text-sm">با ایمیل یا حساب گوگل خود وارد شوید.</p>
          </div>

          {/* --- Google Login Button --- */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl font-bold text-base hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <GoogleIcon />}
            ورود با گوگل
          </button>

          {/* --- Divider --- */}
          <div className="flex items-center gap-4 my-6">
            <hr className="w-full border-white/10" />
            <span className="text-xs text-gray-500">یا</span>
            <hr className="w-full border-white/10" />
          </div>
          
          {/* --- Magic Link Form --- */}
          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mr-2 mb-1 block">ایمیل</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-[#ccff00] focus:outline-none transition-colors text-left ltr"
                placeholder="example@mail.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] disabled:opacity-50"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Mail size={20} />}
              ارسال لینک ورود
            </button>
          </form>

          {message && (
            <p className="text-center text-sm mt-6 text-[#ccff00] bg-lime-900/50 border border-lime-500/30 rounded-lg p-3">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
