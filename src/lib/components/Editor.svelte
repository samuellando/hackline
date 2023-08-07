<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import { onMount } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';
	import Button from '$lib/components/Button.svelte';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import type { palette } from '$lib/types';

	let apiClient: ApiClient;
	let secondary: string;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
		secondary = (getContext('palette') as palette).secondary as string;
	}

	var adding = false;
	var editing = false;
	var editingInterval: interval;
	var color: string;

	onMount(async () => {
		apiClient.subscribe(() => {
			editing = apiClient.isPreviewEdit();
			adding = apiClient.isPreviewAdd();
			if (editing || adding) {
				editingInterval = apiClient.getPreviewInterval();
				color = (apiClient.getSetting('colormap') as { [key: string]: string })[
					editingInterval.title
				];
			}
		});
	});

	async function commitInterval() {
		if (apiClient.isPreview()) {
			let previewColormap = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
			let colormap = (apiClient.getBaseSettings()['colormap'] || {}) as { [key: string]: string };
			// Copy over any changes to existing.
			for (let key in colormap) {
				if (key in previewColormap) {
					colormap[key] = previewColormap[key];
				}
			}
			colormap[editingInterval.title] = previewColormap[editingInterval.title];
			apiClient.setSetting('colormap', colormap);

			if (adding) {
				await apiClient.timelineAdd();
			}
			if (editing) {
				await apiClient.timelineEdit();
			}
		}
	}

	function updateTitle(i: interval) {
		let colorSave = color;
		if (adding) {
			apiClient.previewAdd(i);
		}
		if (editing) {
			apiClient.previewEdit(i);
		}
		let colormap = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
		colormap[editingInterval.title] = colorSave;
		apiClient.setSetting('colormap', colormap);
	}

	function updateColor(title: string, e: Event) {
		let t = e.target as HTMLInputElement;
		let colormap = (apiClient.getSetting('colormap') || {}) as { [key: string]: string };
		colormap[title] = t.value;
		apiClient.setSetting('colormap', colormap);
	}

	function updateStart(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewInterval();
		newInterval = {
			title: newInterval.title,
			end: newInterval.end,
			id: newInterval.id,
			start: new Date(Date.parse(t.value))
		};
		apiClient.previewAdd(newInterval);
	}

	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewInterval();
		newInterval = {
			title: newInterval.title,
			start: newInterval.start,
			id: newInterval.id,
			end: new Date(Date.parse(t.value))
		};
		apiClient.previewAdd(newInterval);
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
				on:input={(e) => updateColor(editingInterval.title, e)}
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
				bind:value={editingInterval.title}
				on:input={() => {
					updateTitle(editingInterval);
				}}
			/>
			<span class="w-96">
				{durationToString(
					editingInterval.end.getTime() - editingInterval.start.getTime(),
					apiClient.getSettingString('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			{#if editing}
				{toDateTimeString(editingInterval.start.getTime())}
				-
				{toDateTimeString(editingInterval.end.getTime())}
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
					value={toDateTimeString(editingInterval.start.getTime())}
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
					value={toDateTimeString(editingInterval.end.getTime())}
					on:input={updateEnd}
				/>
			{/if}
			<Button onClick={commitInterval} text="Add" />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" />
		</div>
	{/if}
</div>
