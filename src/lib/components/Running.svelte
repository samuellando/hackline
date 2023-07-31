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
		runningInterval = apiClient.getRunning();
		interval = setInterval(() => {
			runningInterval = apiClient.getRunning();
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	let runningInterval: running | null;
</script>

<div
	class="
        text-2xl
        text-center
    "
>
	{#if runningInterval != null}
		<div>
			{runningInterval.title}
			{#if typeof runningInterval.end != 'undefined'}
				with

				{durationToString(
					runningInterval.end.getTime() - new Date().getTime(),
					apiClient.getSettingString('running-duration-format') || '%H:%M:%S'
				)}
				remaining
			{:else}
				for
				{durationToString(
					new Date().getTime() - runningInterval.start.getTime(),
					apiClient.getSettingString('running-duration-format') || '%H:%M:%S'
				)}
			{/if}
		</div>
		{#if typeof runningInterval.fallback != 'undefined'}
			<h4 class="text-sm">Then {runningInterval.fallback.title}</h4>
		{/if}
	{/if}
</div>
