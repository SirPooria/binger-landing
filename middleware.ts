
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // اگر کاربر لاگین نکرده و می‌خواهد به داشبورد برود، او را به صفحه لاگین بفرست
  if (!session && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // اگر کاربر لاگین کرده، چک کن که آیا مرحله آنبوردینگ را تکمیل کرده است یا نه
  if (session) {
    // به جای چک کردن پروفایل، بررسی می‌کنیم که آیا کاربر سریالی در لیست خود دارد یا خیر
    const { count } = await supabase
      .from('watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    const hasCompletedOnboarding = count && count > 0;

    // اگر لیست سریال‌های کاربر خالی بود و در صفحه آنبوردینگ نبود، او را به آن صفحه بفرست
    if (!hasCompletedOnboarding && pathname !== '/onboarding') {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
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

