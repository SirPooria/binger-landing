export interface AiRecommendation {
  tmdb_id: number;
  reason: string;
  score?: number;
  based_on_show_id?: number;
}
