export interface AuthUser {
  id: string;
  email: string;
  onboarding_complete: boolean;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export interface DbUser {
  id: string;
  email: string;
  google_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
}
