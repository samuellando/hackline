<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import type { ApiClient } from '$lib/Api';
	import { onMount, onDestroy } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';
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

<div style="--secondary: {secondary}">
	{#if adding}
		<div id="adding">
			<input
				class="color"
				type="color"
				value={addingColor}
				on:input={(e) => update(addingInterval.title, e)}
			/>
			<input
				class="title"
				type="text"
				bind:value={addingInterval.title}
				on:input={() => {
					add(addingInterval);
				}}
			/>
			<span>
				{durationToString(
					addingInterval.end - addingInterval.start,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			<input
				class="datetime start"
				type="datetime-local"
				value={toDateTimeString(addingInterval.start)}
				on:input={updateStart}
			/>
			<input
				class="datetime"
				type="datetime-local"
				value={toDateTimeString(addingInterval.end)}
				on:input={updateEnd}
			/>
			<Button onClick={commitAddingInterval} text="Add" {primary} {secondary} />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" {primary} {secondary} />
		</div>
	{/if}
	<div id="summary">
		{#each summary as s}
			<div class="dropdown">
				<Button
					onClick={() => (dropdown[s.title] = !(s.title in dropdown && dropdown[s.title]))}
					text="V"
					{primary}
					{secondary}
				/>
			</div>
			<input class="color" type="color" value={s.color} on:input={(e) => update(s.title, e)} />
			<span class="title">
				{s.title}
			</span>
			<span class="time">
				{durationToString(
					s.totalTime,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			<div class="run">
				<Button onClick={() => apiClient.setRunning(s.title)} text="Run" {primary} {secondary} />
			</div>
			<div class="add">
				<Button onClick={() => addByTitle(s.title)} text="Add" {primary} {secondary} />
			</div>
			{#if s.title in dropdown && dropdown[s.title]}
				{#each s.intervals as i}
					{#if i.id != 'running'}
						{#if apiClient.isPreviewEditing() && apiClient.getPreviewEditingInterval().id == i.id}
							<input
								class="title"
								type="text"
								bind:value={i.title}
								on:input={() => {
									edit(i);
								}}
								autofocus
							/>
						{:else}
							<input
								class="title"
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
						<span class="title">
							{i.title}
						</span>
					{/if}
					<span>
						{durationToString(
							i.end - i.start,
							apiClient.getSetting('summary-duration-format') ||
								'%y years %m months %d days %H hours %M minutes %S seconds'
						)}
					</span>
					<span class="date-range">
						{toDateTimeString(i.start)} <br />
						{toDateTimeString(i.end)}
					</span>
					{#if apiClient.isPreviewEditing() && apiClient.getPreviewEditingInterval().id == i.id}
						<Button onClick={commitEditingInterval} text="save" {primary} {secondary} />
						<Button
							onClick={() => {
								apiClient.stopPreview();
							}}
							text="cancel"
							{primary}
							{secondary}
						/>
					{/if}
				{/each}
			{/if}
		{/each}
	</div>
	<Button
		text="add"
		onClick={() => addByTitle(apiClient.getSetting('default-title') || 'productive')}
		{primary}
		{secondary}
	/>
</div>

<style>
	#adding {
		display: grid;
		grid-template-columns: 50px 50px 300px 300px 50px 50px 100px 50px 50px;
		justify-content: center;
	}
	#summary {
		display: grid;
		grid-template-columns: 50px 50px 300px 300px 50px 50px 100px 50px 50px;
		justify-content: center;
	}
	.run {
		grid-column-start: 8;
	}
	.dropdown {
		grid-column-start: 1;
	}
	.title {
		grid-column-start: 3;
	}
	input.title {
		background: transparent;
		border-width: 0 0 1px 0;
		border-style: solid;
		border-color: var(--secondary);
		font: inherit;
		color: inherit;
		height: 50px;
	}
	.date-range {
		grid-column-start: 5;
		grid-column-end: 8;
	}
	.color {
		width: 50px;
		height: 50px;
		border: none;
		padding: 0px;
		background: transparent;
		grid-column-start: 2;
	}
	.datetime.start {
		grid-column-start: 5;
		grid-column-end: 7;
	}
	.datetime {
		color: var(--secondary);
		border-color: var(--secondary);
		color: var(--secondary);
		background-color: transparent;
		border-width: 0 0 1px 0;
	}
	::-webkit-calendar-picker-indicator {
		background-color: var(--secondary, red) !important;
	}
</style>
