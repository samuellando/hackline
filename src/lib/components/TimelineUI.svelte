<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Running from '$lib/components/Running.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
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
				rangeEnd = new Date();
			}
		}, 1000);
		loading = false;
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	var rangeStart: Date;
	var rangeEnd: Date;

	let live: boolean;
</script>

{#if loading}
	<div class="flex flex-col h-screen max-h-screen w-screen">
		<div class="basis-56" />
		<h2>loading</h2>
		<div class="grow" />
	</div>
{:else}
	<div class="flex flex-col h-screen max-h-screen max-w-screen">
		<div class="basis-56" />
		<div class="flex justify-center">
			<Running />
		</div>

		<div class="flex flex-col lg:flex-row justify-between px-20 items-center">
			<Live bind:live />
			<div class="flex flex-row gap-5 items-center">
				<AddButton {rangeStart} {rangeEnd} />
				<RangeSelector bind:rangeStart bind:rangeEnd bind:live />
			</div>
		</div>

		<div class="flex justify-center mt-2 hidden lg:inline">
			<Timeline bind:rangeStart bind:rangeEnd bind:live />
		</div>

		<div class="flex justify-center">
			<Editor />
		</div>

		<h1 class="text-2xl text-center">Summary</h1>
		<div class="flex justify-center max-h-96">
			<div class="w-fit overflow-y-auto border border-[var(--secondary)]">
				<Summary bind:rangeStart bind:rangeEnd />
			</div>
		</div>
		<div class="grow" />
	</div>
{/if}
