<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import Auth from '$lib/components/Auth.svelte';
	import { auth } from '$lib/Auth';
	import { ApiClient } from '$lib/Api';
	import type { authDef } from '$lib/types';
	import Timeline from '$lib/components/Timeline.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Running from '$lib/components/Running.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';

	let apiUrl: string;
	let apiClient: ApiClient;
	let authDef: authDef;

	var interval: ReturnType<typeof setInterval>;

	let loading = true;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		authDef = await auth();
		apiClient = new ApiClient(apiUrl, authDef.accessToken);
		await apiClient.ready();
		interval = setInterval(() => {
			if (live && !apiClient.isPreview()) {
				rangeEndM = new Date().getTime();
			}
		}, 1000);
		loading = false;
	});

	onDestroy(() => {
		if (apiClient === undefined) return;
		apiClient.close();
		clearInterval(interval);
	});

	afterUpdate(() => {
		if (
			typeof authDef !== 'undefined' &&
			typeof authDef.authClient !== 'undefined' &&
			!authDef.isAuthenticated
		) {
			window.location.pathname = '/';
		}
	});

	var rangeStartM: number;
	var rangeEndM: number;

	let live: boolean;
</script>

<h1>HackLine.io</h1>
{#if loading}
	<h2>loading</h2>
{:else}
	<Auth {authDef} /> <br />

	<a href="/settings">settings</a>

	<Running bind:apiClient />

	<RangeSelector bind:rangeStartM bind:rangeEndM bind:live />

	<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />

	<h2>Summary</h2>
	<Summary bind:apiClient bind:rangeStartM bind:rangeEndM />
{/if}
