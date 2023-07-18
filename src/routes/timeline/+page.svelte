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
	import Button from '$lib/components/Button.svelte';
	import Live from '$lib/components/Live.svelte';
	import { goto } from '$app/navigation';

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
		primary = apiClient.getSetting('background-color') || '#b3b0ad';
		secondary = apiClient.getSetting('text-color') || '#FFF1D0';
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

	let primary: string;
	let secondary: string;
</script>

{#if loading}
	<h2>loading</h2>
{:else}
	<div
		id="timeline-container"
		style="
background-color: {primary};
color: {secondary};
font-family: {apiClient.getSetting('text-font') || 'courier, monospace'};
"
        class="
            text-center
        "
	>
		<div id="title-container">
			<h1>HackLine.io</h1>

			<div id="navigation-container">
				<Button text="Settings" {primary} {secondary} onClick={() => goto('/settings')} />

				<Auth {primary} {secondary} {authDef} />
			</div>
		</div>

		<div id="running">
			<Running bind:apiClient />
		</div>

		<div id="top-of-timeline">
			<div id="live">
				<Live bind:live />
			</div>

			<div id="range-selector">
				<RangeSelector bind:rangeStartM bind:rangeEndM bind:live {primary} {secondary} />
			</div>
		</div>

		<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />

		<Summary bind:apiClient bind:rangeStartM bind:rangeEndM {primary} {secondary} />
	</div>
{/if}
