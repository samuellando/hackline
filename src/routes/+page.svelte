<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import Auth from '$lib/components/Auth.svelte';
	import { auth } from '$lib/Auth';
	import type { authDef } from '$lib/types';

	var authDef: authDef = {
		authClient: undefined,
		isAuthenticated: false,
		userProfile: undefined,
		accessToken: undefined
	};

	var loading = true;

	onMount(async () => {
		authDef = await auth();
		loading = false;
	});

	afterUpdate(() => {
		if (authDef.isAuthenticated) {
			window.location.pathname = '/timeline';
		}
	});
</script>

<h1>HackLine.io</h1>
{#if !loading}
	<Auth bind:authDef /> <br />
{:else}
	Loading...
{/if}
