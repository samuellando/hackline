<script lang="ts">
	import type { running } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';

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

	function msToHMS(ms: number) {
		// 1- Convert to seconds:
		let seconds = parseInt('' + ms / 1000);
		// 2- Extract hours:
		const hours = parseInt('' + seconds / 3600); // 3,600 seconds in 1 hour
		seconds = seconds % 3600; // seconds remaining after extracting hours
		// 3- Extract minutes:
		const minutes = parseInt('' + seconds / 60); // 60 seconds in 1 minute
		// 4- Keep only seconds not extracted to minutes:
		seconds = seconds % 60;
		return hours + ':' + minutes + ':' + seconds;
	}

	let running: running | null;
</script>

{#if running != null}
	<h1>Running:</h1>
	<h2>{running.title}</h2>
	{#if typeof running.end != 'undefined'}
		<h3>{msToHMS(running.end - new Date().getTime())} remaining</h3>
		{#if typeof running.fallback != 'undefined'}
			<p>Then {running.fallback}</p>
		{/if}
	{:else}
		<h3>{msToHMS(new Date().getTime() - running.start)}</h3>
	{/if}
{/if}
