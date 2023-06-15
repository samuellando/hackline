<script lang="ts">
	import type { interval } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';
	import { makeColorIterator } from './colors';
	import { durationToString, toDateTimeString } from './timePrint';
	import { prevent_default } from 'svelte/internal';

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
	var defaultTitle: string = 'productive';

	let timeline: interval[] = [];

	let updated = -1;
	let loading = true;
	let editMode = false;
	onMount(async () => {
		function update() {
			let t = apiClient.getSetting('colormap');
			if (t != null) {
				colormap = t;
			}
			t = apiClient.getSetting('default');
			if (t != null) {
				defaultTitle = t;
			}
			if (!editMode && apiClient.lastChangeTimeline() != updated) {
				timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
				updated = apiClient.lastChangeTimeline();
			}
		}

		interval = setInterval(() => {
			if (live && !editMode) {
				rangeEndM = new Date().getTime();
			}
			update();
			drawTimeline();
		}, 1000);

		update();
		loading = false;
		drawTimeline();
	});

	timeline = apiClient.getTimeline(rangeStartM, rangeEndM);

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
			colormap[i.title] = color;
			if (!editMode) {
				apiClient.setSetting('colormap', colormap);
			}
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

	let hoveredInterval: interval | null = null;
	function drawTimeline() {
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
			if (curM && !drag && x >= e.drawStart && x <= e.drawEnd && y >= 0 && y <= drawHeight) {
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
		}
		if (curM) {
			// draw the cursor
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 0.25;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, drawHeight);
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
		// Fade out the other sections on deit.
		if (editMode) {
			ctx.fillStyle = '#00000040';
			var n = toDrawInterval(newInterval, rangeEndM - rangeStartM, width);
			ctx.fillRect(0, 0, n.drawStart, drawHeight);
			ctx.fillRect(n.drawEnd, 0, width - n.drawEnd, drawHeight);
		}
	}

	let curM: number | null = null;
	let x = 0;
	let y = 0;
	let drag = false;
	let newInterval: interval;
	let shiftHeld = false;
	function mouseMove(event: MouseEvent) {
		const canvas = <HTMLCanvasElement>document.getElementById('timeline');
		const rect = canvas.getBoundingClientRect();
		x = event.clientX - rect.left;
		y = event.clientY - rect.top;
		curM = (x / rect.width) * (rangeEndM - rangeStartM) + rangeStartM;

		if (!event.shiftKey) {
			shiftHeld = false;
		}

		if (drag) {
			if (event.shiftKey) {
				let curMin = Math.round(curM / 60000) * 60000;
				if (!editMode || curM < newInterval.start || !shiftHeld) {
					newInterval = { id: 'new', title: defaultTitle, start: curMin, end: curMin };
					shiftHeld = true;
					editMode = true;
				} else {
					newInterval.end = curMin;
				}
			} else {
				let oldS = rangeStartM;
				let oldE = rangeEndM;
				rangeStartM -= (event.movementX / rect.width) * (rangeEndM - rangeStartM);
				rangeEndM -= (event.movementX / rect.width) * (rangeEndM - rangeStartM);

				if (event.movementX > 0) {
					live = false;
				}
				if (rangeEndM > new Date().getTime()) {
					live = true;
					rangeEndM = oldE;
					rangeStartM = oldS;
				}
			}
			if (editMode) {
				timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
			} else {
				timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
			}
		}
		drawTimeline();
	}

	function mouseOut() {
		curM = null;
		drawTimeline();
	}

	function rangeScroll(e: WheelEvent) {
		e.preventDefault();
		if (!curM) {
			return;
		}

		if (e.shiftKey) {
			if (e.deltaY > 0) {
				live = false;
			}
			if (!live) {
				rangeEndM -= e.deltaY * 100000;
				rangeStartM -= e.deltaY * 100000;
			}
		} else {
			if (e.deltaY < 0) {
				live = false;
			}
			rangeEndM += ((rangeEndM - curM) / 10000) * e.deltaY;
			rangeStartM -= ((curM - rangeStartM) / 10000) * e.deltaY;
		}

		if (rangeEndM > new Date().getTime()) {
			live = true;
			rangeEndM = new Date().getTime();
		}

		if (editMode) {
			timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
		} else {
			timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
		}
		drawTimeline();
	}

	function addInterval() {
		editMode = true;
		let start = (rangeStartM + rangeEndM) / 2;
		let end = start + 15 * 60 * 1000;
		newInterval = { id: 'new', title: defaultTitle, start: start, end: end };
		timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
		drawTimeline();
	}

	function commitNewInterval() {
		if (editMode && newInterval) {
			apiClient.timelineAdd(newInterval);
			editMode = false;
			timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
		}
	}

	function cancel() {
		editMode = false;
		timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
		drawTimeline();
	}

	$: startDate = toDateTimeString(
		new Date(editMode ? newInterval.start : hoveredInterval ? hoveredInterval.start : 0)
	);
	$: endDate = toDateTimeString(
		new Date(editMode ? newInterval.end : hoveredInterval ? hoveredInterval.end : 0)
	);

	function updateStart(e: Event) {
		let t = e.target as HTMLInputElement;
		newInterval.start = Date.parse(t.value);
		timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
		drawTimeline();
	}
	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		newInterval.end = Date.parse(t.value);
		timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
		drawTimeline();
	}
</script>

<p>
	{#if live}LIVE{/if}
	{#if curM}
		{new Date(curM)}
	{/if}
</p>

<canvas
	id="timeline"
	on:mousemove={mouseMove}
	on:mouseout={mouseOut}
	on:blur={() => null}
	on:wheel={rangeScroll}
	on:mouseup={() => {
		drag = false;
	}}
	on:mousedown={() => {
		drag = true;
	}}
/>
<p>
	{#if !editMode}
		<button on:click={addInterval}>add</button>
	{/if}
	{#if editMode}
		<input type="text" bind:value={newInterval.title} />
		{durationToString(newInterval.end - newInterval.start, 1)}
		<input type="datetime-local" value={startDate} on:change={updateStart} />
		<input type="datetime-local" value={endDate} on:change={updateEnd} />
		<button on:click={commitNewInterval}>add</button>
		<button on:click={cancel}>cancel</button>
	{:else if hoveredInterval}
		{hoveredInterval.title}
		{startDate} - {endDate}
		{durationToString(hoveredInterval.end - hoveredInterval.start, 1)}
	{:else}
		&nbsp;
	{/if}
</p>

<style>
	#timeline {
		width: 100%;
		height: 150px;
	}
	#timeline:hover {
		cursor: none;
	}
</style>
