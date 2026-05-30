import {
  MOOD_BOT_VARIANTS,
  MOOD_GENRE_MAP,
  MOOD_SIMILARITY_TRIGGERS,
  MOOD_STOP_WORDS,
  MOOD_THEMES,
  type MoodChatResponse,
} from '../constants/moodChat.js';
import * as tmdb from './tmdb.js';

const MAX_SUGGESTIONS = 10;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectGenreId(text: string): number | null {
  for (const key of Object.keys(MOOD_GENRE_MAP)) {
    if (text.includes(key)) return MOOD_GENRE_MAP[key]!;
  }
  return null;
}

function extractSimilarityQuery(text: string): string | null {
  const trigger = MOOD_SIMILARITY_TRIGGERS.find((t: string) => text.includes(t));
  if (!trigger) return null;
  let q = text.replace(trigger, '');
  for (const word of MOOD_STOP_WORDS) {
    q = q.replace(new RegExp(word, 'g'), '');
  }
  q = q.trim();
  return q.length > 1 ? q : null;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Rule-based mood / similarity matcher (TMDB only; not LLM). */
export async function handleMoodChatMessage(rawMessage: string): Promise<MoodChatResponse> {
  const message = rawMessage.trim().slice(0, 400);

  const similarQuery = extractSimilarityQuery(message);
  if (similarQuery) {
    const hits = await tmdb.searchShows(similarQuery);
    if (hits.length > 0) {
      const target = hits[0];
      const similar = await tmdb.getRecommendations(target.id);
      const suggestions = shuffle(similar).slice(0, MAX_SUGGESTIONS) as object[];
      return {
        text: `اگه «${target.name}» رو دوست داری، احتمالاً عاشق اینایی:`,
        suggestions,
        theme: MOOD_THEMES.default,
        match: 'similar',
        genreId: null,
      };
    }
  }

  const genreId = detectGenreId(message);
  const page = Math.floor(Math.random() * 10) + 1;

  if (genreId) {
    let shows = await tmdb.getShowsByGenre(genreId, page);
    if (shows.length > 0) {
      const picked = shuffle(shows).slice(0, MAX_SUGGESTIONS) as object[];
      return {
        text: pick(MOOD_BOT_VARIANTS.success),
        suggestions: picked,
        theme: MOOD_THEMES[String(genreId)] ?? MOOD_THEMES.default,
        match: 'genre',
        genreId,
      };
    }
    const fallbackShows = shuffle(await tmdb.getShowsByGenre(null, 1)).slice(0, MAX_SUGGESTIONS) as object[];
    return {
      text: 'متوجه شدم چی میخوای ولی لیست خالی بود. فعلاً این ترندها رو ببین:',
      suggestions: fallbackShows,
      theme: MOOD_THEMES.default,
      match: 'fallback',
      genreId,
    };
  }

  const shows = shuffle(await tmdb.getShowsByGenre(null, page)).slice(0, MAX_SUGGESTIONS) as object[];
  return {
    text: pick(MOOD_BOT_VARIANTS.fallback),
    suggestions: shows,
    theme: MOOD_THEMES.default,
    match: 'fallback',
    genreId: null,
  };
}
