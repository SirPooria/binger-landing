export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      comments: {
        Row: {
          id: number
          created_at: string
          user_id: string
          show_id: number | null
          content: string | null
          episode_id: number | null
          parent_id: number | null
          // فعلاً ایمیل را اینجا نگه می‌داریم چون کد قدیمی به آن نیاز دارد
          email: string | null 
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: string
          show_id?: number | null
          content?: string | null
          episode_id?: number | null
          parent_id?: number | null
          email?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          user_id?: string
          show_id?: number | null
          content?: string | null
          episode_id?: number | null
          parent_id?: number | null
          email?: string | null
        }
      }
      watched: {
        Row: {
          id: number
          created_at: string
          user_id: string
          show_id: number
          episode_id: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: string
          show_id: number
          episode_id?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          user_id?: string
          show_id?: number
          episode_id?: number | null
        }
      }
      favorites: {
        Row: {
          id: number
          created_at: string
          user_id: string
          show_id: number
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: string
          show_id: number
        }
        Update: {
          id?: number
          created_at?: string
          user_id?: string
          show_id?: number
        }
      }
      follows: {
        Row: {
          id: number
          created_at: string
          follower_id: string
          following_id: string
          follower_email: string | null
          following_email: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          follower_id: string
          following_id: string
          follower_email?: string | null
          following_email?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          follower_id?: string
          following_id?: string
          follower_email?: string | null
          following_email?: string | null
        }
      }
    }
    Functions: {
      get_global_leaderboard: {
        Args: Record<string, never> // یعنی آرگومانی نمی‌گیرد
        Returns: {
          user_id: string
          email: string
          score: number
        }[]
      }
      get_scores_for_users: {
        Args: {
          user_ids: string[]
        }
        Returns: {
          user_id: string
          email: string
          score: number
        }[]
      }
    }
  }
}