'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div dir="rtl" className="h-screen w-full bg-[#101010] text-white font-['Vazirmatn'] flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto text-center bg-black/20 border border-red-500/30 rounded-2xl p-8">
        
        <div className="mx-auto w-fit bg-red-900/50 p-3 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-red-400">خطا در ورود</h1>
        <p className="text-gray-400 mt-2 mb-6 text-sm">
          متاسفانه در تایید هویت شما مشکلی پیش آمد. لینک ورود ممکن است منقضی شده یا نامعتبر باشد.
        </p>

        <Link href="/login">
          <button className="w-full bg-[#ccff00] text-black py-3 rounded-xl font-black text-base hover:bg-[#b3e600] transition-all active:scale-95">
            تلاش دوباره
          </button>
        </Link>

      </div>
    </div>
  );
}
