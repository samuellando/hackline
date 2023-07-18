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

<div
	class="
        text-xl
    "
>
	{#if running != null}
		<div>
			{running.title}
			{#if typeof running.end != 'undefined'}
				with

				{durationToString(
					running.end - new Date().getTime(),
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
				remaining
			{:else}
				for
				{durationToString(
					new Date().getTime() - running.start,
					apiClient.getSetting('running-duration-format') || '%H:%M:%S'
				)}
			{/if}
		</div>
		{#if typeof running.fallback != 'undefined'}
			<h4>Then {running.fallback}</h4>
		{/if}
	{/if}
</div>
