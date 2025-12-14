export const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
export const BASE_URL = 'https://api.themoviedb.org/3';

// 1. گرفتن سریال‌های ترند هفته (برای دشبورد)
// 1. گرفتن سریال‌های ترند هفته (با قابلیت صفحه بندی)
export const getTrendingShows = async (page: number = 1) => {
  try {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=${page}`);
    const data = await res.json();
    return data.results; 
  } catch (error) {
    console.error("TMDB Error:", error);
    return [];
  }
};

// 2. ساختن آدرس عکس
export const getImageUrl = (path: string | null) => {
  if (!path) return '/placeholder.png'; 
  return `https://image.tmdb.org/t/p/w500${path}`;
};
export const getBackdropUrl = (path: string | null) => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/original${path}`;
};

// 3. جستجوی سریال
export const searchShows = async (query: string) => {
  try {
    if (!query) return [];
    const res = await fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};

// دریافت جزئیات سریال (با اولویت فارسی + فال‌بک انگلیسی)
export const getShowDetails = async (id: string) => {
  try {
    // 1. تلاش برای دریافت دیتای فارسی
    const resFa = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=fa-IR`);
    const dataFa = await resFa.json();

    // 2. اگر توضیحات (Overview) فارسی خالی بود، انگلیسی را بگیر
    if (!dataFa.overview || dataFa.overview.trim() === "") {
       const resEn = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`);
       const dataEn = await resEn.json();
       
       dataFa.overview = dataEn.overview; // توضیحات انگلیسی جایگزین شود
       dataFa.tagline = dataEn.tagline;   // شعار سریال هم همینطور
       
       // اگر حتی اسم فارسی هم نداشت (خیلی نادر)، اسم انگلیسی بگذار
       if (!dataFa.name) dataFa.name = dataEn.name;
    }

    return dataFa;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// این کد را جایگزین getSeasonDetails قبلی کنید
export const getSeasonDetails = async (id: string, seasonNumber: number) => {
  try {
    // تلاش ۱: دریافت نسخه فارسی
    const resFa = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}&language=fa-IR`);
    
    if (!resFa.ok) return null;

    const dataFa = await resFa.json();

    // تلاش ۲: اگر اپیزودها توضیحات نداشتند، نسخه انگلیسی را بگیر (چون امتیازات vote_average در انگلیسی کامل‌تره)
    // این لاجیک باعث میشه نبض سریال برای بریکینگ بد و ... پر بشه
    if (dataFa.episodes && dataFa.episodes.length > 0 && !dataFa.episodes[0].overview) {
        const resEn = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
        const dataEn = await resEn.json();
        return dataEn; // دیتای انگلیسی رو برگردون که امتیازاتش دقیقه
    }

    return dataFa;
  } catch (error) {
    console.error("Season Details Error:", error);
    return null;
  }
};

// 6. گرفتن جزئیات کامل یک اپیزود خاص
export const getEpisodeDetails = async (showId: string, seasonNum: string, episodeNum: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/season/${seasonNum}/episode/${episodeNum}?api_key=${API_KEY}&language=en-US&append_to_response=credits,images`);
    const data = await res.json();
    return data;
  } catch (error) {
    return null;
  }
};

// 7. گرفتن سریال‌های در حال پخش جهانی (گسترده‌ترین فیلتر)
export const getGlobalAiringShows = async () => {
  try {
    // API 1: سریال‌هایی که در 7 روز آینده پخش خواهند شد (On The Air)
    const res1 = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=en-US`);
    const data1 = await res1.json();
    
    // API 2: سریال‌هایی که همین امروز اپیزود دارند (Airing Today)
    const res2 = await fetch(`${BASE_URL}/tv/airing_today?api_key=${API_KEY}&language=en-US`);
    const data2 = await res2.json();

    // ترکیب دو لیست
    const combinedData = [...data1.results, ...data2.results];
    
    // حذف تکراری‌ها (با استفاده از Map برای دقت)
    const uniqueShowsMap = new Map();
    combinedData.forEach(s => {
        if (!uniqueShowsMap.has(s.id)) {
            uniqueShowsMap.set(s.id, s);
        }
    });

    // حالا برای هر سریال، جزئیات را می‌گیریم تا ببینیم قسمت بعدی کِی است
    const allUniqueIds = Array.from(uniqueShowsMap.keys());

    const detailedShows = await Promise.all(
        allUniqueIds.map(async (id) => {
            return await getShowDetails(String(id));
        })
    );

    // فیلتر نهایی: فقط آینده + پوستر داشته باشند
    return detailedShows.filter((s: any) => 
        s && s.next_episode_to_air && 
        new Date(s.next_episode_to_air.air_date) >= new Date() &&
        s.poster_path 
    );

  } catch (error) {
    console.error("TMDB Global Airing Error:", error);
    return [];
  }
};

// 8. گرفتن سریال‌های مشابه
export const getSimilarShows = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${id}/similar?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    // فقط 5 تای اول رو برمیگردونیم
    return data.results.slice(0, 5); 
  } catch (error) {
    return [];
  }
};

// 8. جدیدترین انیمه‌ها (ژاپن + انیمیشن)
export const getLatestAnime = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=first_air_date.desc&with_genres=16&with_origin_country=JP&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results;
  } catch (error) { return []; }
};

// 9. جدیدترین‌های آسیای شرقی (کره، چین - بدون انیمیشن)
export const getAsianDramas = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=first_air_date.desc&with_origin_country=KR|CN|TW&without_genres=16&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results;
  } catch (error) { return []; }
};

// 10. برترین‌های جهانی (امتیاز بالا)
// 10. جدیدترین‌های جهانی (در حال پخش واقعی)
// این تابع سریال‌هایی که الان فصل جدیدشان در حال پخش است را می‌گیرد
export const getNewestGlobal = async () => {
  try {
    // استفاده از اندپوینت on_the_air و مرتب‌سازی بر اساس محبوبیت
    const res = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=1`);
    const data = await res.json();
    return data.results; 
  } catch (error) {
    console.error("TMDB Error:", error);
    return [];
  }
};

// 11. دریافت سریال‌های ایرانی (اختصاصی)
export const getIranianShows = async () => {
  try {
    // سورت بر اساس محبوبیت، محصول ایران
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=fa-IR&sort_by=popularity.desc&with_origin_country=IR`);
    const data = await res.json();
    
    // فیلتر: حتما پوستر داشته باشند
    return data.results.filter((s: any) => s.poster_path);
  } catch (error) {
    console.error("Iranian Fetch Error:", error);
    return [];
  }
};
// 12. جدیدترین سریال‌های ایرانی (مرتب‌سازی بر اساس تاریخ انتشار)
export const getNewestIranianShows = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=fa-IR&sort_by=first_air_date.desc&with_origin_country=IR&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results.filter((s: any) => s.poster_path);
  } catch (error) {
    return [];
  }
};
// اضافه کردن به lib/tmdbClient.ts

export const getShowReviews = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${id}/reviews?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
};
// --- اضافه کردن به انتهای فایل lib/tmdbClient.ts ---

// تابع اختصاصی برای هوش مصنوعی (پیشنهاد بر اساس ژانر)
export const getShowsByGenre = async (genreId: number | null) => {
  try {
    // اگر ژانر داشتیم، دیسکاور کن. اگر نه، ترندها رو بده (حالت Fallback)
    const url = genreId 
      ? `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1&include_null_first_air_dates=false`
      : `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`;

    const res = await fetch(url);
    
    if (!res.ok) {
      console.error(`TMDB Error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return [];
  }
};