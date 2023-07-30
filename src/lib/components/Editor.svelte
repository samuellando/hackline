<script lang="ts">
	import { durationToString } from '$lib/timePrint';

	import type { interval } from '$lib/types';
	import { onMount } from 'svelte';
	import { toDateTimeString } from '$lib/timePrint';
	import Button from '$lib/components/Button.svelte';
	import type ApiClient from '$lib/ApiClient';
    import { browser } from '$app/environment';
    import { getContext } from 'svelte';

    let apiClient: ApiClient;
    let secondary: string;
    if (browser) {
        apiClient = getContext('apiClient') as ApiClient;
        secondary = getContext('palette').secondary as string;
    }

	var adding: boolean = false;
	var editing: boolean = false;
	var interval: interval;
	var color: string;

	onMount(async () => {
		apiClient.subscribe(() => {
			editing = apiClient.isPreviewEdit();
			adding = apiClient.isPreviewAdd();
			if (adding) {
				interval = apiClient.getPreviewInterval();
			}
			if (editing) {
				interval = apiClient.getPreviewInterval();
			}
            if (editing || adding) {
                color = apiClient.getSetting('colormap')[interval.title];
            }
		});
	});

	async function commitInterval() {
		if (apiClient.isPreview()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let i = apiClient.getPreviewInterval();
			if (adding) {
				await apiClient.timelineAdd();
			}
			if (editing) {
                console.log('editing');
				await apiClient.timelineEdit();
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
			apiClient.previewAdd(i);
		}
		if (editing) {
			apiClient.previewEdit(i);
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
		let newInterval = apiClient.getPreviewInterval();
		newInterval.start = new Date(Date.parse(t.value));
		apiClient.previewAdd(newInterval);
	}

	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewInterval();
		newInterval.end = new Date(Date.parse(t.value));
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
					interval.end.getTime() - interval.start.getTime(),
					apiClient.getSetting('summary-duration-format') ||
						'%y years %m months %d days %H hours %M minutes %S seconds'
				)}
			</span>
			{#if editing}
				{toDateTimeString(interval.start.getTime())}
				-
				{toDateTimeString(interval.end.getTime())}
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
					value={toDateTimeString(interval.start.getTime())}
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
					value={toDateTimeString(interval.end.getTime())}
					on:input={updateEnd}
				/>
			{/if}
			<Button onClick={commitInterval} text="Add" />
			<Button onClick={() => apiClient.stopPreview()} text="Cancel" />
		</div>
	{/if}
</div>