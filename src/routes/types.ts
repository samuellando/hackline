export interface log {
  title: string;
  start: number;
  end: number;
  id: string;
}

export interface runnning {
  title: string;
  start: number;
  end?: number;
  fallback?: string;
}

export interface settings {
  [key: string]: any;
}

import type { Auth0Client, User } from '@auth0/auth0-spa-js';

export interface authDef {
  authClient: Auth0Client | undefined,
  isAuthenticated: boolean,
  userProfile: User | undefined,
  accessToken: string | undefined
}
