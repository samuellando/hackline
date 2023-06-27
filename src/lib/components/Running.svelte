<script lang="ts">
	import type { running } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from '$lib/Api';
	import { durationToString } from '$lib/timePrint';

	export var apiClient: ApiClient;

	var interval: ReturnType<typeof setInterval>;

	onMount(() => {
		running = apiClient.getRunning();
		interval = setInterval(() => {
			running = apiClient.getRunning();
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	let running: running | null;
</script>

{#if running != null}
	<div id="title-container">
		<h2>{running.title}</h2>
		{#if typeof running.end != 'undefined'}
			<h2>with</h2>
			<h2>
				{durationToString(
					running.end - new Date().getTime(),
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
			</h2>
			<h2>remaining</h2>
		{:else}
			<h2>for</h2>
			<h2>
				{durationToString(
					new Date().getTime() - running.start,
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
			</h2>
		{/if}
	</div>
	<div id="then-container">
		{#if typeof running.fallback != 'undefined'}
			<h4>Then {running.fallback}</h4>
		{/if}
	</div>
{/if}

<style>
	#title-container {
		display: flex;
		justify-content: center;
		column-gap: 20px;
	}
	h2 {
		width: auto;
		margin: 0;
	}
	#then-container {
		display: flex;
		justify-content: center;
	}
	h4 {
		width: auto;
		margin: 0;
	}
</style>
