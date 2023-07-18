<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import type { ApiClient } from '$lib/Api';
	import { onMount } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';
	import Button from '$lib/components/Button.svelte';

	export let apiClient: ApiClient;

	export let primary: string;
	export let secondary: string;

	var adding: boolean = false;
	var editing: boolean = false;
	var interval: interval;
	var color: string;

	onMount(async () => {
		apiClient.subscribe(() => {
			editing = apiClient.isPreviewEditing();
			adding = apiClient.isPreviewAdding();
			if (adding) {
				interval = apiClient.getPreviewAddingInterval();
			}
			if (editing) {
				interval = apiClient.getPreviewEditingInterval();
			}
            if (editing || adding) {
                color = apiClient.getSetting('colormap')[interval.title];
            }
		});
	});

	function commitInterval() {
		if (apiClient.isPreviewAdding()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let i = apiClient.getPreviewAddingInterval();
			if (adding) {
				apiClient.timelineAdd();
			}
			if (editing) {
				apiClient.timelineEdit();
			}
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

	function updateTitle(i: interval) {
		if (adding) {
			apiClient.timelinePreviewAdd(i);
		}
		if (editing) {
			apiClient.timelinePreviewEdit(i);
		}
	}

	function updateColor(title: string, e: Event) {
		let t = e.target as HTMLInputElement;
		let colormap = apiClient.getSetting('colormap') || {};
		colormap[title] = t.value;
		apiClient.setSetting('colormap', colormap);
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
</script>

<div style="--secondary: {secondary}">
	{#if adding || editing}
		<div class="flex gap-4 pb-4">
			<input
				class="
                    w-10 h-10
                    border-0
                "
				type="color"
				value={color}
				on:input={(e) => updateColor(interval.title, e)}
			/>
			<input
				class="
                    w-56
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
				type="text"
				bind:value={interval.title}
				on:input={() => {
					updateTitle(interval);
				}}
			/>
			<span class="w-96">
				{durationToString(
					interval.end - interval.start,
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			{#if editing}
				{toDateTimeString(interval.start)}
				-
				{toDateTimeString(interval.end)}
			{/if}
			{#if adding}
				<input
					class="
                    w-56
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
					type="datetime-local"
					value={toDateTimeString(interval.start)}
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
					value={toDateTimeString(interval.end)}
					on:input={updateEnd}
				/>
			{/if}
			<Button onClick={commitInterval} text="Add" {primary} {secondary} />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" {primary} {secondary} />
		</div>
	{/if}
</div>
