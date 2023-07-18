<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import Auth from '$lib/components/Auth.svelte';
	import { auth } from '$lib/Auth';
	import { ApiClient } from '$lib/Api';
	import type { authDef } from '$lib/types';
	import Timeline from '$lib/components/Timeline.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
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
        "
		class="
            font-mono
            w-screen
            h-screen
        "
	>
		<div class="pt-5 pr-10 flex gap-10 justify-end">
			<Button text="Settings" {primary} {secondary} onClick={() => goto('/settings')} />

			<Auth {primary} {secondary} {authDef} />
		</div>
		<h1
			class="
                mt-10
                text-6xl
                text-center
               "
		>
			HackLine.io
		</h1>

		<div class="mt-10 flex justify-center">
			<Running bind:apiClient />
		</div>

		<div class="mt-10 flex justify-between px-20">
			<Live bind:live />
			<RangeSelector bind:rangeStartM bind:rangeEndM bind:live {primary} {secondary} />
		</div>

		<div class="flex justify-center mt-5">
			<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />
		</div>

		<div class="flex justify-center">
			<Editor bind:apiClient {primary} {secondary} />
		</div>

		<h1 class="text-2xl text-center">Summary</h1>
		<div class="flex justify-center">
			<Summary bind:apiClient bind:rangeStartM bind:rangeEndM {primary} {secondary} />
		</div>
	</div>
{/if}
