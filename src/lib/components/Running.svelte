<script lang="ts">
	import type { running } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import { durationToString } from '$lib/timePrint';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
	}

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

<div
	class="
        text-2xl
        text-center
    "
>
	{#if running != null}
		<div>
			{running.title}
			{#if typeof running.end != 'undefined'}
				with

				{durationToString(
					running.end.getTime() - new Date().getTime(),
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
				remaining
			{:else}
				for
				{durationToString(
					new Date().getTime() - running.start.getTime(),
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
			{/if}
		</div>
		{#if typeof running.fallback != 'undefined'}
			<h4 class="text-sm">Then {running.fallback}</h4>
		{/if}
	{/if}
</div>
