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
	};

	var summary: summary[];
	var adding: boolean = false;
	var editing: boolean = false;

	var addingInterval: interval;
	var addingColor: string;
	var editingInterval: interval;
	var editingColor: string;

	onMount(async () => {
		apiClient.subscribe(() => {
			summary = getSummary();
			editing = apiClient.isPreviewEditing();
			adding = apiClient.isPreviewAdding();
			if (adding) {
				addingInterval = apiClient.getPreviewAddingInterval();
				addingColor = apiClient.getSetting('colormap')[addingInterval.title];
			}
			if (editing) {
				editingInterval = apiClient.getPreviewEditingInterval();
				editingColor = apiClient.getSetting('colormap')[addingInterval.title];
			}
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
		adding = false;
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

	function add(i: interval) {
		apiClient.timelinePreviewAdd(i);
	}

	function edit(i: interval) {
		apiClient.timelinePreviewEdit(i);
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
</script>

<div style="--secondary: {secondary}">
	{#if adding}
		<div class="w-full justify-center flex gap-4 pb-4">
			<input 
                class="
                    w-10 h-10
                    border-0
                "
            type="color" value={addingColor} on:input={(e) => update(addingInterval.title, e)} />
			<input
                class="
                    w-56
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
				type="text"
				bind:value={addingInterval.title}
				on:input={() => {
					add(addingInterval);
				}}
			/>
			<span class="w-96">
				{durationToString(
					addingInterval.end - addingInterval.start,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			<input
                class="
                    w-56
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
				type="datetime-local"
				value={toDateTimeString(addingInterval.start)}
				on:input={updateStart}
			/>
			<input
                class="
                    w-56
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
				type="datetime-local"
				value={toDateTimeString(addingInterval.end)}
				on:input={updateEnd}
			/>
			<Button onClick={commitAddingInterval} text="Add" {primary} {secondary} />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" {primary} {secondary} />
		</div>
	{/if}
	{#if editing}
		<div class="w-full justify-center flex gap-4 pb-4">
			<input type="color" value={editingColor} on:input={(e) => update(editingInterval.title, e)} />
			<input
				type="text"
				bind:value={editingInterval.title}
				on:input={() => {
					edit(editingInterval);
				}}
			/>
			<span class="w-96">
				{durationToString(
					addingInterval.end - addingInterval.start,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			{toDateTimeString(addingInterval.start)}
			-
			{toDateTimeString(addingInterval.end)}
			<Button onClick={commitEditingInterval} text="Save" {primary} {secondary} />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" {primary} {secondary} />
		</div>
	{/if}
	<h1 class="text-2xl">Summary</h1>
	{#each summary as s}
		<div class="w-full justify-center flex gap-4 pb-4">
			<input 
                class="
                    w-10 h-10
                    border-0
                "
                type="color" value={s.color} on:input={(e) => update(s.title, e)} />
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
		text="add"
		onClick={() => addByTitle(apiClient.getSetting('default-title') || 'productive')}
		{primary}
		{secondary}
	/>
</div>
