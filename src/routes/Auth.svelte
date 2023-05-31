<script lang="ts">
	import { auth } from './Auth';
	import type { authDef } from './types';
	import { onMount } from 'svelte';

	export var authDef: authDef;

	onMount(async () => {
		authDef = await auth();
		console.log(authDef);
	});

	async function login() {
		authDef.authClient.loginWithRedirect();
	}

	async function logout() {
		authDef.authClient.logout();
		authDef.isAuthenticated = await authDef.authClient.isAuthenticated();
		authDef.userProfile = await authDef.authClient.getUser();
		authDef.accessToken = await authDef.authClient.getTokenSilently();
	}
</script>

{#if authDef.isAuthenticated}
	<button on:click={logout}>Logout</button>
{:else}
	<button on:click={login}>Login</button>
{/if}
