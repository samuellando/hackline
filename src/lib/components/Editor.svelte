<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import { onMount } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';
	import Nav from '$lib/components/Nav.svelte';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import type { palette } from '$lib/types';

	let apiClient: ApiClient;
	let secondary: string;
	let primary: string;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
		secondary = (getContext('palette') as palette).secondary as string;
		secondary = (getContext('palette') as palette).primary as string;
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
			let colormap = (apiClient.getBaseSetting('colormap') || {}) as { [key: string]: string };
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
		const baseColormap = (apiClient.getBaseSetting('colormap') || {}) as { [key: string]: string };
		if (i.title in baseColormap) {
			colorSave = baseColormap[i.title];
		} else {
			if (
				Object.values(baseColormap).includes(colorSave) &&
				Object.keys(colormap).includes(i.title)
			) {
				delete colormap[i.title];
			} else {
				colormap[i.title] = colorSave;
			}
		}
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

<div class="relative w-screen" style="--secondary: {secondary} --primary: {primary}">
	{#if adding || editing}
		<div
			class="w-5/6 lg:w-1/4 p-5 left-1/2 -translate-x-1/2 absolute bg-[var(--primary)] border border-[var(--secondary)]"
		>
			<div class="flex gap-4 pb-4 flex-wrap items-center justify-center">
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
                    w-3/4
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
				{#if editing}
					<span class="w-full text-center">
						{toDateTimeString(editingInterval.start.getTime())}
					</span>
					<span class="w-full text-center"> - </span>
					<span class="w-full text-center">
						{toDateTimeString(editingInterval.end.getTime())}
					</span>
				{/if}
				{#if adding}
					<input
						class="
                        w-1/2
                    bg-transparent
                    border
                    border-[var(--secondary)]
                    p-2
                "
						type="datetime-local"
						value={toDateTimeString(editingInterval.start.getTime())}
						on:input={updateStart}
					/>
					<span class="w-full text-center"> - </span>
					<input
						class="
                        w-1/2
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
				<span class="w-full text-center">
					{durationToString(
						editingInterval.end.getTime() - editingInterval.start.getTime(),
						apiClient.getSettingString('summary-duration-format') || '%H:%M:%S'
					)}
				</span>
				<Nav onClick={commitInterval} text="Add" />
				<Nav onClick={() => apiClient.stopPreview()} text="Cancel" />
			</div>
		</div>
	{/if}
</div>
