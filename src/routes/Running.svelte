<script lang="ts">
	import type { running } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';
	import { durationToString } from './timePrint';

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
	<h1>Running:</h1>
	<h2>{running.title}</h2>
	{#if typeof running.end != 'undefined'}
		<h3>{durationToString(running.end - new Date().getTime(), '%H:%M:%S')} remaining</h3>
		{#if typeof running.fallback != 'undefined'}
			<p>Then {running.fallback}</p>
		{/if}
	{:else}
		<h3>{durationToString(new Date().getTime() - running.start, '%H:%M:%S')}</h3>
	{/if}
{/if}
