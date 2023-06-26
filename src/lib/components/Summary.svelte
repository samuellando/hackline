<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import type { ApiClient } from '$lib/Api';
	import { onMount, onDestroy } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';

	export let rangeStartM: number;
	export let rangeEndM: number;
	export let apiClient: ApiClient;

	var interval: ReturnType<typeof setInterval>;

	type summary = {
		title: string;
		color: string;
		totalTime: number;
		intervals: interval[];
	};

	var summary: summary[];

	onMount(async () => {
		apiClient.subscribe(() => (summary = getSummary()));
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
		adding = false;
		if (apiClient.isPreviewEditing()) {
			summary.forEach((e) => {
				for (let i = 0; i < e.intervals.length; i++) {
					if (e.intervals[i].id == apiClient.getPreviewEditingInterval().id) {
						e.intervals[i] = apiClient.getPreviewEditingInterval();
						dropdown[e.title] = true;
					}
				}
				s[e.title] = e;
			});
		} else if (apiClient.isPreviewAdding()) {
			summary.forEach((e) => {
				s[e.title] = e;
			});
			adding = true;
			addingInterval = apiClient.getPreviewAddingInterval();
			addingColor = colormap[addingInterval.title];
		} else {
			logs.forEach((i) => {
				if (i.title in s) {
					s[i.title].intervals.push(i);
					s[i.title].totalTime += i.end - i.start;
				} else {
					s[i.title] = {
						title: i.title,
						color: colormap[i.title],
						intervals: [i],
						totalTime: i.end - i.start
					};
				}
			});
		}

		return Object.values(s);
	}

	function update(title: string, e: Event) {
		let t = e.target as HTMLInputElement;
		let colormap = apiClient.getSetting('colormap') || {};
		colormap[title] = t.value;
		console.log(colormap, title, t.value);
		apiClient.setSetting('colormap', colormap);
	}

	function edit(i: interval) {
		apiClient.timelinePreviewEdit(i);
	}

	function commitEditingInterval() {
		if (apiClient.isPreviewEditing()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let i = apiClient.getPreviewEditingInterval();
			apiClient.timelineEdit();
			let colormap = apiClient.getSetting('colormap') || {};
			for (let key in colormap) {
				if (key in previewColormap) {
					colormap[key] = previewColormap[key];
				}
			}
			colormap[i.title] = previewColormap[i.title];
			apiClient.setSetting('colormap', colormap);
		}
	}

	function commitAddingInterval() {
		if (apiClient.isPreviewAdding()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let i = apiClient.getPreviewAddingInterval();
			apiClient.timelineAdd();
			let colormap = apiClient.getSetting('colormap') || {};
			for (let key in colormap) {
				if (key in previewColormap) {
					colormap[key] = previewColormap[key];
				}
			}
			colormap[i.title] = previewColormap[i.title];
			apiClient.setSetting('colormap', colormap);
		}
	}

	let adding = false;
	let addingColor: string;
	let addingInterval: interval;
	function add(i: interval) {
		apiClient.timelinePreviewAdd(i);
	}

	function addByTitle(title: string = '') {
		let start = (rangeStartM + rangeEndM) / 2;
		let end = start + 15 * 60 * 1000;
		let interval: interval = { id: 'new', title: title, start: start, end: end };
		apiClient.timelinePreviewAdd(interval);
	}

	function updateStart(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewAddingInterval();
		newInterval.start = Date.parse(t.value);
		apiClient.timelinePreviewAdd(newInterval);
	}

	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewAddingInterval();
		newInterval.end = Date.parse(t.value);
		apiClient.timelinePreviewAdd(newInterval);
	}

	$: summary = getSummary(rangeStartM, rangeEndM);
	var dropdown: { [title: string]: boolean } = {};
</script>

{#if adding}
	<input type="color" value={addingColor} on:input={(e) => update(addingInterval.title, e)} />
	<input
		type="text"
		bind:value={addingInterval.title}
		on:input={() => {
			add(addingInterval);
		}}
	/>
	time: {durationToString(
		addingInterval.end - addingInterval.start,
		apiClient.getSetting('summary-duration-format') ||
			'%y years %m months %d days %H hours %M minutes %S seconds'
	)}
	<input
		type="datetime-local"
		value={toDateTimeString(addingInterval.start)}
		on:change={updateStart}
	/>
	<input type="datetime-local" value={toDateTimeString(addingInterval.end)} on:change={updateEnd} />
	<button on:click={commitAddingInterval}>Add</button>
	<button
		on:click={() => {
			apiClient.stopPreview();
		}}>cancel</button
	>
	<br />
{/if}
{#each summary as s}
	<button on:click={() => (dropdown[s.title] = !(s.title in dropdown && dropdown[s.title]))}
		>V</button
	>
	<input type="color" value={s.color} on:input={(e) => update(s.title, e)} />
	{s.title}
	time: {durationToString(
		s.totalTime,
		apiClient.getSetting('summary-duration-format') ||
			'%y years %m months %d days %H hours %M minutes %S seconds'
	)}
	<button on:click={() => apiClient.setRunning(s.title)}>Run</button>
	<button on:click={() => addByTitle(s.title)}>Add</button>
	{#if s.title in dropdown && dropdown[s.title]}
		{#each s.intervals as i}
			<div>
				{#if i.id != 'running'}
					{#if apiClient.isPreviewEditing() && apiClient.getPreviewEditingInterval().id == i.id}
						<input
							type="text"
							bind:value={i.title}
							on:input={() => {
								edit(i);
							}}
							autofocus
						/>
					{:else}
						<input
							type="text"
							bind:value={i.title}
							on:input={() => {
								edit(i);
							}}
							on:focus={() => {
								edit(i);
							}}
						/>
					{/if}
				{:else}
					{i.title}
				{/if}
				time: {durationToString(
					i.end - i.start,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
				{toDateTimeString(i.start)} - {toDateTimeString(i.end)}
				{#if apiClient.isPreviewEditing() && apiClient.getPreviewEditingInterval().id == i.id}
					<button on:click={commitEditingInterval}>save</button>
					<button
						on:click={() => {
							apiClient.stopPreview();
						}}>cancel</button
					>
				{/if}
				<br />
			</div>
		{/each}
	{/if}
	<br />
{/each}
<button on:click={() => addByTitle()}>add</button>
