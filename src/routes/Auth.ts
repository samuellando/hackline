import createAuthClient from './auth_service';

export async function auth() {
  let authClient;
  let isAuthenticated;
  let userProfile;
  let accessToken;
  try {
    authClient = await createAuthClient(window.location.origin);
    accessToken = await authClient.getTokenSilently();
    isAuthenticated = await authClient.isAuthenticated();
    userProfile = await authClient.getUser();
  } catch {
    console.log('Login required.');
    return undefined;
  }

  if (
    location.search.includes('state=') &&
    (location.search.includes('code=') || location.search.includes('error='))
  ) {
    await authClient.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
    isAuthenticated = await authClient.isAuthenticated();
    userProfile = await authClient.getUser();
    accessToken = await authClient.getTokenSilently();
  }
  return {
    accessToken: accessToken,
    userProfile: userProfile,
    isAuthenticated: isAuthenticated,
    authClient: authClient
  };
}

