import createAuthClient from '$lib/auth_service';
import type { authDef } from '$lib/types';

export async function auth(): Promise<authDef> {
  let authDef: authDef = {
    authClient: await createAuthClient(window.location.origin),
    isAuthenticated: false,
    userProfile: undefined,
    accessToken: undefined
  }

  if (authDef.authClient === undefined) {
    console.error("Could not create auth client.")
    throw ("Could not create auth client");
  }

  if (
    location.search.includes('state=') &&
    (location.search.includes('code=') || location.search.includes('error='))
  ) {
    await authDef.authClient.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
    authDef.isAuthenticated = await authDef.authClient.isAuthenticated();
    authDef.userProfile = await authDef.authClient.getUser();
    authDef.accessToken = await authDef.authClient.getTokenSilently();
  } else {
    try {
      authDef.accessToken = await authDef.authClient.getTokenSilently();
      authDef.isAuthenticated = await authDef.authClient.isAuthenticated();
      authDef.userProfile = await authDef.authClient.getUser();
    } catch {
      console.log('Login required.');
    }
  }

  return authDef;
}

