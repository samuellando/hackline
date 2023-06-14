<script lang="ts">
	import type { interval } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';
	import { makeColorIterator } from './colors';
	import { durationToString } from './timePrint';

	export let rangeStartM: number;
	export let rangeEndM: number;
	export let live: boolean;
	export var apiClient: ApiClient;

	var interval: ReturnType<typeof setInterval>;

	interface drawInterval extends interval {
		color: string;
		drawStart: number;
		drawEnd: number;
	}

	var colormap: any = {};

	let timeline: interval[] = [];

	let updated = -1;
	let loading = true;
	let editMode = false;
	onMount(async () => {
		let t = apiClient.getSetting('colormap');
		if (t != null) {
			colormap = t;
		}
		timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
		interval = setInterval(() => {
			let t = apiClient.getSetting('colormap');
			if (t != null) {
				colormap = t;
			}
			if (apiClient.lastChangeTimeline() != updated) {
				timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
				updated = apiClient.lastChangeTimeline();
			}
			if (live && !editMode) {
				rangeEndM = new Date().getTime();
			}
		}, 1000);
		loading = false;
		drawTimeline();
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	var colorIterator = makeColorIterator();
	function toDrawInterval(i: interval, duration: number, width: number): drawInterval {
		var start = ((i.start - rangeStartM) / duration) * width;
		var end = ((i.end - rangeStartM) / duration) * width;
		var color: string;
		if (i.title in colormap) {
			color = colormap[i.title];
		} else {
			color = colorIterator.next().value;
		}
		return {
			title: i.title,
			start: i.start,
			end: i.end,
			drawStart: start,
			drawEnd: end,
			color: color,
			id: i.id
		};
	}

	let x = -1;
	let y = -1;
	let hoveredInterval: interval | null = null;
	function drawTimeline(event: MouseEvent | null = null) {
		const drawHeight = 150;
		const canvas = <HTMLCanvasElement>document.getElementById('timeline');
		const ctx = canvas.getContext('2d');
		if (ctx == null) {
			return;
		}
		const rect = canvas.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		canvas.width = width;
		canvas.height = height;
		if (event) {
			x = event.clientX - rect.left;
			y = event.clientY - rect.top;
		}

		// Draw the default background.
		ctx.fillStyle = '#b3b0ad';
		ctx.fillRect(0, 0, width, height);

		// Convert the timeline.
		var drawTimeline = timeline.map((e) => toDrawInterval(e, rangeEndM - rangeStartM, width));
		// Draw the timeline
		let hovering = false;
		drawTimeline.forEach((e) => {
			ctx.fillStyle = e.color;
			ctx.fillRect(e.drawStart, 0, e.drawEnd - e.drawStart, drawHeight);
			// Highlight the currently ohvered element
			if (x >= e.drawStart && x <= e.drawEnd && y >= 0 && y <= drawHeight) {
				ctx.strokeStyle = 'black';
				ctx.lineWidth = 2;
				ctx.strokeRect(
					e.drawStart + ctx.lineWidth / 2,
					ctx.lineWidth / 2,
					e.drawEnd - e.drawStart - ctx.lineWidth,
					drawHeight - ctx.lineWidth
				);
				hoveredInterval = e;
				hovering = true;
			}
		});
		if (!hovering) {
			hoveredInterval = null;
		} else {
			// draw the cursor
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 0.25;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, drawHeight);
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
	}
</script>

<p>
	{#if live}LIVE{/if}
	{#if hoveredInterval}{hoveredInterval.title}
		{durationToString(hoveredInterval.end - hoveredInterval.start, 1)}{/if}
</p>

<canvas id="timeline" on:mousemove={drawTimeline} on:mouseout={drawTimeline} />

<style>
	#timeline {
		width: 100%;
		height: 150px;
	}
	#timeline:hover {
		cursor: none;
	}
</style>
