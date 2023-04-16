<script lang="ts">
	import createAuthClient from './auth_service';
	import type { Auth0Client, User } from '@auth0/auth0-spa-js';
	import { onMount } from 'svelte';

	var authClient: Auth0Client;
	export var isAuthenticated: boolean;
	export var userProfile: User | undefined;
	export var accessToken: string;

	onMount(async () => {
		authClient = await createAuthClient(window.location.origin);

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
	});

	async function login() {
		authClient.loginWithRedirect();
	}

	async function logout() {
		authClient.logout();
		isAuthenticated = await authClient.isAuthenticated();
		userProfile = await authClient.getUser();
		accessToken = await authClient.getTokenSilently();
	}
</script>

{#if isAuthenticated}
	<button on:click={logout}>Logout</button>
{:else}
	<button on:click={login}>Login</button>
{/if}
