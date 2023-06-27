<script lang="ts">
	import type { authDef } from '$lib/types';
	import Button from '$lib/components/Button.svelte';

	export var authDef: authDef;
	export var primary: string;
	export var secondary: string;

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
	<Button {primary} {secondary} onClick={logout} text="Logout" />
{:else}
	<Button {primary} {secondary} onClick={login} text="Login" />
{/if}
