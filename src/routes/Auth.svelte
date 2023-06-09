<script lang="ts">
	import type { authDef } from './types';

	export var authDef: authDef;

	async function login() {
		authDef.authClient.loginWithRedirect();
	}

	async function logout() {
		authDef.authClient.logout();
		authDef.isAuthenticated = await authDef.authClient.isAuthenticated();
		authDef.userProfile = await authDef.authClient.getUser();
		authDef.accessToken = await authDef.authClient.getTokenSilently();
	}

	$: authenticated = typeof authDef !== 'undefined' && authDef.isAuthenticated;
</script>

{#if authenticated}
	<button on:click={logout}>Logout</button>
{:else}
	<button on:click={login}>Login</button>
{/if}
