<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval, palette } from '$lib/types';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	let secondary: string;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
		secondary = (getContext('palette') as palette).secondary;
	}

	export let rangeStart: Date;
	export let rangeEnd: Date;

	type Summary = {
		title: string;
		color: string;
		totalTime: number;
	};

	var summary: Summary[];

	onMount(async () => {
		apiClient.subscribe(() => {
			summary = getSummary();
		});
	});

	function getSummary(start: Date = rangeStart, end: Date = rangeEnd) {
		let logs: interval[];
		let colormap: { [title: string]: string };
		if (typeof apiClient !== 'undefined') {
			logs = apiClient.getTimeline(start, end).intervals.reverse();
			colormap = apiClient.getSetting('colormap') as { [key: string]: string };
			if (colormap == null) {
				colormap = {};
			}
		} else {
			return [];
		}

		let s: { [title: string]: Summary } = {};
		logs.forEach((i) => {
			if (i.title in s) {
				s[i.title].totalTime += i.end.getTime() - i.start.getTime();
			} else {
				s[i.title] = {
					title: i.title,
					color: colormap[i.title],
					totalTime: i.end.getTime() - i.start.getTime()
				};
			}
		});

		let a = Object.values(s);
		a.sort((a, b) => b.totalTime - a.totalTime);
		return a;
	}

	function updateColor(title: string, e: Event) {
		let t = e.target as HTMLInputElement;
		let colormap = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
		colormap[title] = t.value;
		apiClient.previewSettings();
		apiClient.setSetting('colormap', colormap);
	}

	function commitColor(title: string) {
		const colormapPreview = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
		apiClient.stopPreview();
		let colormap = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
		colormap[title] = colormapPreview[title];
		apiClient.setSetting('colormap', colormap);
	}

	function addByTitle(title = '') {
		let start = new Date((rangeStart.getTime() + rangeEnd.getTime()) / 2);
		let end = new Date(start.getTime() + 15 * 60 * 1000);
		let interval: interval = { id: -3, title: title, start: start, end: end };
		apiClient.previewAdd(interval);
	}

	function addRunning(title: string, duration: number) {
		let start = new Date();
		let end = new Date(start.getTime() + duration);
		let interval: interval = { id: -3, title: title, start: start, end: end };
		apiClient.timelineAdd(interval);
	}

	$: summary = getSummary(rangeStart, rangeEnd);
</script>

<div class="text-center flex flex-col w-fit max:w-screen">
	{#each summary as s}
		<div class="flex gap-4 p-4 max:w-screen justify-center flex-wrap items-center">
			<input
				class="
                    w-1/6 lg:w-10 h-10
                    border-0
                "
				type="color"
				value={s.color}
				on:input={(e) => updateColor(s.title, e)}
				on:change={(e) => {
					updateColor(s.title, e);
					commitColor(s.title);
				}}
			/>
			<span class="w-2/6 lg:w-56">
				{s.title}
			</span>
			<span class="w-2/6 lg:w-56">
				{durationToString(
					s.totalTime,
					apiClient.getSettingString('summary-duration-format') ||
						'%y years %m months %d days %H:%M:%S'
				)}
			</span>
			<Button onClick={() => apiClient.setRunning(s.title)} text="Run" />
			<Button onClick={() => addByTitle(s.title)} text="Add" />
			<Nav onClick={() => addRunning(s.title, 25 * 60 * 1000)} text="25" />
			<Nav onClick={() => addRunning(s.title, 60 * 60 * 1000)} text="60" />
		</div>
	{/each}
</div>
