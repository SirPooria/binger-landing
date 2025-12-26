export const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
export const BASE_URL = 'https://api.themoviedb.org/3';

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

// --- NEW: دریافت پرطرفدارترین سریال‌های تاریخ (برای Onboarding) ---
export const getPopularShows = async (page: number = 1) => {
  try {
    // مرتب‌سازی بر اساس تعداد رای (vote_count) معمولاً سریال‌های مشهور تاریخ را نشان می‌دهد
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=vote_count.desc&page=${page}&vote_count.gte=1000`);
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error("Popular Shows Error:", error);
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

export const getShowDetails = async (id: string) => {
  try {
    const resFa = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=fa-IR`);
    const dataFa = await resFa.json();

    if (!dataFa.overview || dataFa.overview.trim() === "") {
       const resEn = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`);
       const dataEn = await resEn.json();
       dataFa.overview = dataEn.overview;
       dataFa.tagline = dataEn.tagline;
       if (!dataFa.name) dataFa.name = dataEn.name;
    }

    return dataFa;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getSeasonDetails = async (id: string, seasonNumber: number) => {
  try {
    const resFa = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}&language=fa-IR`);
    if (!resFa.ok) return null;
    const dataFa = await resFa.json();

    if (dataFa.episodes && dataFa.episodes.length > 0 && !dataFa.episodes[0].overview) {
        const resEn = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`);
        const dataEn = await resEn.json();
        return dataEn;
    }
    return dataFa;
  } catch (error) {
    console.error("Season Details Error:", error);
    return null;
  }
};

export const getEpisodeDetails = async (showId: string, seasonNum: string, episodeNum: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/season/${seasonNum}/episode/${episodeNum}?api_key=${API_KEY}&language=en-US&append_to_response=credits,images`);
    const data = await res.json();
    return data;
  } catch (error) { return null; }
};

export const getGlobalAiringShows = async () => {
  try {
    const res1 = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=en-US`);
    const data1 = await res1.json();
    const res2 = await fetch(`${BASE_URL}/tv/airing_today?api_key=${API_KEY}&language=en-US`);
    const data2 = await res2.json();
    const combinedData = [...data1.results, ...data2.results];
    const uniqueShowsMap = new Map();
    combinedData.forEach(s => { if (!uniqueShowsMap.has(s.id)) { uniqueShowsMap.set(s.id, s); } });
    const allUniqueIds = Array.from(uniqueShowsMap.keys());
    const detailedShows = await Promise.all(allUniqueIds.map(async (id) => { return await getShowDetails(String(id)); }));
    return detailedShows.filter((s: any) => s && s.next_episode_to_air && new Date(s.next_episode_to_air.air_date) >= new Date() && s.poster_path);
  } catch (error) { console.error("TMDB Global Airing Error:", error); return []; }
};

export const getSimilarShows = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${id}/similar?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    return data.results.slice(0, 5); 
  } catch (error) { return []; }
};

export const getLatestAnime = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=first_air_date.desc&with_genres=16&with_origin_country=JP&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results;
  } catch (error) { return []; }
};

export const getAsianDramas = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=first_air_date.desc&with_origin_country=KR|CN|TW&without_genres=16&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results;
  } catch (error) { return []; }
};

export const getNewestGlobal = async () => {
  try {
    const res = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&page=1`);
    const data = await res.json();
    return data.results; 
  } catch (error) { console.error("TMDB Error:", error); return []; }
};

export const getIranianShows = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=fa-IR&sort_by=popularity.desc&with_origin_country=IR`);
    const data = await res.json();
    return data.results.filter((s: any) => s.poster_path);
  } catch (error) { console.error("Iranian Fetch Error:", error); return []; }
};

export const getNewestIranianShows = async () => {
  try {
    const res = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=fa-IR&sort_by=first_air_date.desc&with_origin_country=IR&air_date.lte=${new Date().toISOString().split('T')[0]}`);
    const data = await res.json();
    return data.results.filter((s: any) => s.poster_path);
  } catch (error) { return []; }
};

export const getShowReviews = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${id}/reviews?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await res.json();
    return data.results || [];
  } catch (error) { console.error("Error fetching reviews:", error); return []; }
};

export const getShowsByGenre = async (genreId: number | null) => {
  try {
    const url = genreId 
      ? `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1&include_null_first_air_dates=false`
      : `${BASE_URL}/trending/tv/week?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`TMDB Error: ${res.status}`); return []; }
    const data = await res.json();
    return data.results || [];
  } catch (error) { console.error("AI Fetch Error:", error); return []; }
};

export const getRecommendations = async (showId: number) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/recommendations?api_key=${API_KEY}&language=fa-IR&page=1`);
    const data = await res.json();
    if (!data.results || data.results.length < 5) {
        const resEn = await fetch(`${BASE_URL}/tv/${showId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`);
        const dataEn = await resEn.json();
        return dataEn.results || [];
    }
    return data.results || [];
  } catch (error) { console.error("Error fetching recommendations:", error); return []; }
};
