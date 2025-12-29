import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // سناریو ۱: کاربر لاگین نکرده و می‌خواهد برود داشبورد -> بفرست لاگین
  if (!session && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // سناریو ۲: کاربر لاگین کرده
  if (session) {
    // خواندن متادیتا از سشن (بدون کوئری دیتابیس)
    const isOnboarded = session.user.user_metadata?.onboarding_complete === true;

    // اگر آنبوردینگ نکرده و دارد می‌رود داشبورد -> بفرست آنبوردینگ
    if (!isOnboarded && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
    }

    // (اختیاری ولی توصیه شده) اگر آنبوردینگ کرده و دوباره آمده صفحه آنبوردینگ -> بفرست داشبورد
    if (isOnboarded && pathname === '/onboarding') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding',
  ],
}