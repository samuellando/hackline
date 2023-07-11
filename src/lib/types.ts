export interface interval {
  title: string;
  start: number;
  end: number;
  id: string;
}

export type timeline = interval[];

export interface running {
  title: string;
  start: number;
  end?: number;
  fallback?: string;
}

export interface settings {
  [key: string]: any;
}

export interface apiKey {
  apiKey: string;
}

import type { Auth0Client, User } from '@auth0/auth0-spa-js';

export interface authDef {
  authClient: Auth0Client | undefined,
  isAuthenticated: boolean,
  userProfile: User | undefined,
  accessToken: string | undefined
}
