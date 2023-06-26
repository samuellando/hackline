<script lang="ts">
	import type { interval } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import type { Unsubscriber } from 'svelte/store';
	import type { ApiClient } from '$lib/Api';
	import { makeColorIterator } from '$lib/colors';
	import { durationToString, toDateTimeString, getTimeDivisions } from '$lib/timePrint';
	import moment from 'moment';

	export let rangeStartM: number = moment().startOf('day').valueOf();
	export let rangeEndM: number = moment().valueOf();
	export let live: boolean = true;
	export var apiClient: ApiClient;

	var interval: ReturnType<typeof setInterval>;

	interface drawInterval extends interval {
		color: string;
		drawStart: number;
		drawEnd: number;
	}

	let unsubscribe: Unsubscriber;
	let loading = true;
	let colorIterator = makeColorIterator();
	onMount(() => {
		unsubscribe = apiClient.subscribe(() => {
			drawTimeline();
		});
		loading = false;
	});

	onDestroy(() => {
		clearInterval(interval);
		unsubscribe();
	});

	function toDrawInterval(i: interval, duration: number, width: number): drawInterval {
		let color: string;
		let colormap = apiClient.getSetting('colormap');
		if (colormap == null) {
			colormap = {};
		}
		if (i.title in colormap) {
			color = colormap[i.title];
		} else {
			color = colorIterator.next().value;
			colormap[i.title] = color;
			apiClient.setSetting('colormap', colormap);
		}

		var startPx = ((i.start - rangeStartM) / duration) * width;
		var endPx = ((i.end - rangeStartM) / duration) * width;
		return {
			title: i.title,
			start: i.start,
			end: i.end,
			drawStart: startPx,
			drawEnd: endPx,
			color: color,
			id: i.id
		};
	}

	let hoveredInterval: interval | null = null;
	function drawTimeline() {
		// Get the timeline, and edit it depending on the state.
		let timeline: interval[];
		timeline = apiClient.getTimeline(rangeStartM, rangeEndM);

		const drawHeight = 150;
		const canvas = <HTMLCanvasElement>document.getElementById('timeline');
		if (canvas == null) {
			return;
		}
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
		ctx.fillStyle = apiClient.getSetting('timeline-background') || '#b3b0ad';
		ctx.fillRect(0, 0, width, drawHeight);

		// Convert the timeline.
		var drawTimeline = timeline.map((e) => toDrawInterval(e, rangeEndM - rangeStartM, width));
		// Draw the timeline
		let hovering = false;
		drawTimeline.forEach((e) => {
			ctx.fillStyle = e.color;
			ctx.fillRect(e.drawStart, 0, e.drawEnd - e.drawStart, drawHeight);
			// Highlight the currently ohvered element
			if (curM && !drag && x >= e.drawStart && x <= e.drawEnd && y >= 0 && y <= drawHeight) {
				hoveredInterval = e;
				hovering = true;
			}
			if (
				(apiClient.isPreviewEditing() && e.id == apiClient.getPreviewEditingInterval().id) ||
				(hoveredInterval && e.id == hoveredInterval.id && !apiClient.isPreviewEditing())
			) {
				ctx.strokeStyle = apiClient.getSetting('timeline-highlight') || 'black';
				ctx.lineWidth = 2;
				ctx.strokeRect(
					e.drawStart + ctx.lineWidth / 2,
					ctx.lineWidth / 2,
					e.drawEnd - e.drawStart - ctx.lineWidth,
					drawHeight - ctx.lineWidth
				);
			}
		});
		if (!hovering) {
			hoveredInterval = null;
		}

		// draw the cursor.
		if (x >= 0 && x <= width && y > 0 && y <= drawHeight) {
			// draw the cursor
			ctx.strokeStyle = apiClient.getSetting('timeline-cursor') || 'black';
			ctx.lineWidth = 0.25;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, drawHeight);
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
		// Fade out the other sections on add.
		if (apiClient.isPreviewAdding()) {
			ctx.fillStyle = apiClient.getSetting('timeline-blur') || '#00000040';
			var n = toDrawInterval(apiClient.getPreviewAddingInterval(), rangeEndM - rangeStartM, width);
			ctx.fillRect(0, 0, n.drawStart, drawHeight);
			ctx.fillRect(n.drawEnd, 0, width - n.drawEnd, drawHeight);
		}
		// x-axis
		ctx.beginPath();
		let divs = getTimeDivisions(rangeStartM, rangeEndM);
		ctx.strokeStyle = apiClient.getSetting('timeline-x-axis-hashes') || 'black';
		ctx.fillStyle = apiClient.getSetting('timeline-x-axis-text') || 'black';
		ctx.lineWidth = 1;
		ctx.font = apiClient.getSetting('timeline-x-axis-font') || '15px serif';
		divs.forEach((e: [number, string]) => {
			let x = ((e[0] - rangeStartM) / (rangeEndM - rangeStartM)) * width;
			ctx.moveTo(x, drawHeight);
			ctx.lineTo(x, height);
			ctx.fillText(e[1], x + 5, height - 5);
		});
		ctx.stroke();
	}

	let curM: number | null = null;
	let drag = false;
	let shiftHeld = false;
	let x: number = -1;
	let y: number = -1;
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
				let newInterval: interval;
				if (apiClient.isPreviewAdding()) {
					newInterval = apiClient.getPreviewAddingInterval();
				} else {
					newInterval = { id: 'NO', title: 'Theres a problem here', start: 0, end: 0 };
				}
				if (!apiClient.isPreviewAdding() || curM < newInterval.start || !shiftHeld) {
					addInterval(curMin, curMin);
					shiftHeld = true;
				} else {
					newInterval.end = curMin;
					apiClient.timelinePreviewAdd(newInterval);
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
		}
		drawTimeline();
	}

	function mouseOut() {
		curM = null;
		x = -1;
		y = -1;
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
				rangeEndM -= e.deltaY * 10000;
				rangeStartM -= e.deltaY * 10000;
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

		drawTimeline();
	}

	function editInterval(i: interval | null) {
		if (i != null && i.id != 'running') {
			apiClient.timelinePreviewEdit(i);
		}
	}

	function addInterval(start: number = -1, end: number = -1) {
		let defaultTitle = apiClient.getSetting('default-title') || 'productive';
		start = start >= 0 ? start : (rangeStartM + rangeEndM) / 2;
		end = end >= start ? end : start + 15 * 60 * 1000;
		let interval: interval = { id: 'new', title: defaultTitle, start: start, end: end };
		apiClient.timelinePreviewAdd(interval);
	}

	$: rangeStartM, rangeEndM, drawTimeline();
</script>

<p>
	{#if live}LIVE{/if}
	{#if curM}
		{new Date(curM)}
	{/if}
	&nbsp;
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
	on:click={() => {
		editInterval(hoveredInterval);
	}}
/>
<p>
	{#if hoveredInterval}
		{hoveredInterval.title}
		{toDateTimeString(hoveredInterval.start)} - {toDateTimeString(hoveredInterval.end)}
		{durationToString(
			hoveredInterval.end - hoveredInterval.start,
			apiClient.getSetting('timeline-duration-format') || '%H hours %M minutes %S seconds'
		)}
	{:else}
		&nbsp;
	{/if}
</p>

<style>
	#timeline {
		width: 95%;
		height: 175px;
	}
	#timeline:hover {
		cursor: none;
	}
</style>
