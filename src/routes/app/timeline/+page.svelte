<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Running from '$lib/components/Running.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import Live from '$lib/components/Live.svelte';
	import { browser } from '$app/environment';
	import type ApiClient from '$lib/ApiClient';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
	}

	var interval: ReturnType<typeof setInterval>;
	let loading = true;
	onMount(async () => {
		await apiClient.getReadyQueue();
		interval = setInterval(() => {
			if (live && !apiClient.isPreview()) {
				rangeEndM = new Date().getTime();
			}
		}, 1000);
		loading = false;
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	var rangeStartM: number;
	var rangeEndM: number;

	let live: boolean;
</script>

<div class="flex flex-col h-screen">
	<div class="basis-36" />
	{#if loading}
		<h2>loading</h2>
	{:else}
		<div>
			<div class="mt-10 flex justify-center">
				<Running />
			</div>

			<div class="mt-10 flex justify-between px-20">
				<Live bind:live />
				<RangeSelector bind:rangeStartM bind:rangeEndM bind:live />
			</div>

			<div class="flex justify-center mt-5">
				<Timeline bind:rangeStartM bind:rangeEndM bind:live />
			</div>

			<div class="flex justify-center">
				<Editor />
			</div>

			<h1 class="text-2xl text-center">Summary</h1>
			<div class="flex justify-center">
				<Summary bind:rangeStartM bind:rangeEndM />
			</div>
		</div>
	{/if}
</div>
