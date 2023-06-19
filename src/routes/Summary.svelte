<script lang="ts">
	import { durationToString } from './timePrint';

	import type { interval } from './types';
	import type { ApiClient } from './Api';
	import { onMount, onDestroy } from 'svelte';

	export let rangeStartM: number;
	export let rangeEndM: number;
	export let apiClient: ApiClient;

	var interval: ReturnType<typeof setInterval>;
	var syncing: any = {};
	var logs: interval[] = [];
	var updated = -1;

	onMount(async () => {
		colormap = apiClient.getSetting('colormap');
		interval = setInterval(() => {
			syncing = apiClient.getSyncing();
			if (apiClient.lastChangeTimeline() != updated) {
				logs = apiClient.getTimeline(rangeStartM, rangeEndM);
				updated = apiClient.lastChangeTimeline();
			}
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	var summary: any[] = [];
	function getSummary(logs: interval[], rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		if (typeof apiClient !== 'undefined') {
			logs = apiClient.getTimeline(rangeStartM, rangeEndM);
		}

		let s: any = {};
		logs.forEach((log) => {
			var start;
			var end;
			if (log.start < rangeStart) {
				start = rangeStart;
			} else {
				start = log.start;
			}
			if (log.end > rangeEnd) {
				end = rangeEnd;
			} else {
				end = log.end;
			}
			if (start < end) {
				if (log.title in s) {
					s[log.title]['time'] += end - start;
				} else {
					s[log.title] = {};
					s[log.title]['time'] = end - start;
					s[log.title]['title'] = log.title;
				}
			}
		});
		return Object.values(s);
	}

	function update() {
		apiClient.setSetting('colormap', colormap);
	}

	$: summary = getSummary(logs, rangeStartM, rangeEndM);
	var colormap: any = {};
</script>

{#each summary as log}
	<h3>
		{log.title}
	</h3>
	<input type="color" bind:value={colormap[log.title]} on:change={update} />
	<p>time: {durationToString(log.time, 2)}</p>
{/each}

<style>
	:global(.chart-legend) {
		display: none;
	}
</style>
