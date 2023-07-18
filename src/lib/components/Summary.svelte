<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import type { ApiClient } from '$lib/Api';
	import { onMount, onDestroy } from 'svelte';
	import Button from '$lib/components/Button.svelte';

	export let rangeStartM: number;
	export let rangeEndM: number;
	export let apiClient: ApiClient;

	export let primary: string;
	export let secondary: string;

	var interval: ReturnType<typeof setInterval>;

	type summary = {
		title: string;
		color: string;
		totalTime: number;
	};

	var summary: summary[];

	onMount(async () => {
		apiClient.subscribe(() => {
			summary = getSummary();
		});
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	function getSummary(rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		let logs: interval[];
		let colormap: { [title: string]: string };
		if (typeof apiClient !== 'undefined') {
			logs = apiClient.getTimeline(rangeStart, rangeEnd).reverse();
			colormap = apiClient.getSetting('colormap');
		} else {
			return [];
		}

		let s: { [title: string]: summary } = {};
		logs.forEach((i) => {
			if (i.title in s) {
				s[i.title].totalTime += i.end - i.start;
			} else {
				s[i.title] = {
					title: i.title,
					color: colormap[i.title],
					totalTime: i.end - i.start
				};
			}
		});
		return Object.values(s);
	}

	function update(title: string, e: Event) {
		let t = e.target as HTMLInputElement;
		let colormap = apiClient.getSetting('colormap') || {};
		colormap[title] = t.value;
		apiClient.setSetting('colormap', colormap);
	}

	function addByTitle(title: string = '') {
		let start = (rangeStartM + rangeEndM) / 2;
		let end = start + 15 * 60 * 1000;
		let interval: interval = { id: 'new', title: title, start: start, end: end };
		apiClient.timelinePreviewAdd(interval);
	}

	$: summary = getSummary(rangeStartM, rangeEndM);
</script>

<div class="text-center flex flex-col w-fit p-5">
	{#each summary as s}
		<div class="flex gap-4 pb-4 w-fit">
			<input
				class="
                    w-10 h-10
                    border-0
                "
				type="color"
				value={s.color}
				on:input={(e) => update(s.title, e)}
			/>
			<span class="w-56">
				{s.title}
			</span>
			<span class="w-96">
				{durationToString(
					s.totalTime,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			<Button onClick={() => apiClient.setRunning(s.title)} text="Run" {primary} {secondary} />
			<Button onClick={() => addByTitle(s.title)} text="Add" {primary} {secondary} />
		</div>
	{/each}
		<Button
			text="Add"
			onClick={() => addByTitle(apiClient.getSetting('default-title') || 'productive')}
			{primary}
			{secondary}
		/>
</div>
