import { createServerClient, type CookieOptions } from '@supabase/ssr'; // ۱. اضافه کردن تایپ CookieOptions
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // ۲. اضافه کردن await برای کوکی‌ها (مخصوص Next.js 15)
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // ۳. اضافه کردن تایپ برای options
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          // ۴. اضافه کردن تایپ برای options
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // ریدایرکت موفقیت‌آمیز
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // در صورت بروز خطا
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}