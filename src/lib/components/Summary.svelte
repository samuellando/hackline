<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval, palette } from '$lib/types';
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	let secondary: string;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
		secondary = (getContext('palette') as palette).secondary;
	}

	export let rangeStartM: number;
	export let rangeEndM: number;

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

	function getSummary(rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		let logs: interval[];
		let colormap: { [title: string]: string };
		if (typeof apiClient !== 'undefined') {
			logs = apiClient.getTimeline(new Date(rangeStart), new Date(rangeEnd)).intervals.reverse();
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
		return Object.values(s);
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
		let start = new Date((rangeStartM + rangeEndM) / 2);
		let end = new Date(start.getTime() + 15 * 60 * 1000);
		let interval: interval = { id: -3, title: title, start: start, end: end };
		apiClient.previewAdd(interval);
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
				on:input={(e) => updateColor(s.title, e)}
				on:change={(e) => {
					updateColor(s.title, e);
					commitColor(s.title);
				}}
			/>
			<span class="w-56">
				{s.title}
			</span>
			<span class="w-96">
				{durationToString(
					s.totalTime,
					apiClient.getSettingString('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			<Button onClick={() => apiClient.setRunning(s.title)} text="Run" />
			<Button onClick={() => addByTitle(s.title)} text="Add" />
		</div>
	{/each}
	<Button
		text="Add"
		onClick={() => addByTitle(apiClient.getSettingString('default-title') || 'productive')}
	/>
</div>
