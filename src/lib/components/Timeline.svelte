<script lang="ts">
	import type { interval } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
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

	let updated = -1;
	let loading = true;
	let colorIterator = makeColorIterator();
	onMount(() => {
		function lastChange() {
			return Math.max(
				apiClient.lastChangeTimeline(),
				apiClient.lastChangeSettings(),
				apiClient.lastChangeRunning()
			);
		}
		function update() {
			if (!apiClient.isPreview()) {
				if (lastChange() != updated) {
					drawTimeline();
					updated = lastChange();
				}
			}
		}

		interval = setInterval(() => {
			if (live && !apiClient.isPreview()) {
				rangeEndM = new Date().getTime();
			}
			update();
		}, 300);

		update();
		loading = false;
	});

	onDestroy(() => {
		clearInterval(interval);
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
		ctx.fillStyle = '#b3b0ad';
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
				ctx.strokeStyle = 'black';
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
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 0.25;
			ctx.moveTo(x, 0);
			ctx.lineTo(x, drawHeight);
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
		// Fade out the other sections on add.
		if (apiClient.isPreviewAdding()) {
			ctx.fillStyle = '#00000040';
			var n = toDrawInterval(apiClient.getPreviewAddingInterval(), rangeEndM - rangeStartM, width);
			ctx.fillRect(0, 0, n.drawStart, drawHeight);
			ctx.fillRect(n.drawEnd, 0, width - n.drawEnd, drawHeight);
		}
		// x-axis
		let divs = getTimeDivisions(rangeStartM, rangeEndM);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'black';
		ctx.lineWidth = 1;
		ctx.font = '15px serif';
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
			editing = true;
			adding = false;
			apiClient.timelinePreviewEdit(i);
			drawTimeline();
		}
	}

	function updateEditingInterval(e: Event) {
		let t = e.target as HTMLInputElement;
		let editingInterval = apiClient.getPreviewEditingInterval();
		editingInterval.title = t.value;
		apiClient.timelinePreviewEdit(editingInterval);
		drawTimeline();
	}

	function commitEditingInterval() {
		if (apiClient.isPreviewEditing()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let editingInterval = apiClient.getPreviewEditingInterval();
			apiClient.timelineEdit();
			let colormap = apiClient.getSetting('colormap') || {};
			for (let key in colormap) {
				if (key in previewColormap) {
					colormap[key] = previewColormap[key];
				}
			}
			colormap[editingInterval.title] = previewColormap[editingInterval.title];
			apiClient.setSetting('colormap', colormap);
			editing = false;
			drawTimeline();
		}
	}

	function addInterval(start: number = -1, end: number = -1) {
		let defaultTitle = apiClient.getSetting('defaultTitle') || 'productive';
		start = start >= 0 ? start : (rangeStartM + rangeEndM) / 2;
		end = end >= start ? end : start + 15 * 60 * 1000;
		let interval: interval = { id: 'new', title: defaultTitle, start: start, end: end };
		apiClient.timelinePreviewAdd(interval);
		adding = true;
		editing = false;
		drawTimeline();
	}

	function commitNewInterval() {
		if (apiClient.isPreviewAdding()) {
			let previewColormap = apiClient.getSetting('colormap') || {};
			let newInterval = apiClient.getPreviewAddingInterval();
			apiClient.timelineAdd();
			let colormap = apiClient.getSetting('colormap') || {};
			for (let key in colormap) {
				if (key in previewColormap) {
					colormap[key] = previewColormap[key];
				}
			}
			colormap[newInterval.title] = previewColormap[newInterval.title];
			apiClient.setSetting('colormap', colormap);
			adding = false;
			drawTimeline();
		}
	}

	function updateTitle(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewAddingInterval();
		newInterval.title = t.value;
		apiClient.timelinePreviewAdd(newInterval);
		drawTimeline();
	}

	function updateStart(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewAddingInterval();
		newInterval.start = Date.parse(t.value);
		apiClient.timelinePreviewAdd(newInterval);
		drawTimeline();
	}

	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		let newInterval = apiClient.getPreviewAddingInterval();
		newInterval.end = Date.parse(t.value);
		apiClient.timelinePreviewAdd(newInterval);
		drawTimeline();
	}

	function cancel() {
		apiClient.stopPreview();
		adding = false;
		editing = false;
		drawTimeline();
	}

	$: rangeStartM, rangeEndM, drawTimeline();
	let adding = false;
	let addingInterval: interval;
	$: if ((curM && adding) || adding) {
		addingInterval = apiClient.getPreviewAddingInterval();
	}
	let editing = false;
	let editingInterval: interval;
	$: if (hoveredInterval && editing) {
		editingInterval = apiClient.getPreviewEditingInterval();
	}
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
	{#if !adding}
		<button on:click={() => addInterval()}>add</button>
	{/if}
	{#if adding}
		<input type="text" value={addingInterval.title} on:input={updateTitle} />
		{durationToString(addingInterval.end - addingInterval.start, '%H hours %M minutes %S seconds')}
		<input
			type="datetime-local"
			value={toDateTimeString(addingInterval.start)}
			on:change={updateStart}
		/>
		<input
			type="datetime-local"
			value={toDateTimeString(addingInterval.end)}
			on:change={updateEnd}
		/>
		<button on:click={commitNewInterval}>add</button>
		<button on:click={cancel}>cancel</button>
	{:else if editing}
		<input type="text" value={editingInterval.title} on:input={updateEditingInterval} />
		{toDateTimeString(editingInterval.start)} - {toDateTimeString(editingInterval.end)}
		{durationToString(
			editingInterval.end - editingInterval.start,
			'%H hours %M minutes %S seconds'
		)}
		<button on:click={commitEditingInterval}>edit</button>
		<button on:click={cancel}>cancel</button>
	{:else if hoveredInterval}
		{hoveredInterval.title}
		{toDateTimeString(hoveredInterval.start)} - {toDateTimeString(hoveredInterval.end)}
		{durationToString(
			hoveredInterval.end - hoveredInterval.start,
			'%H hours %M minutes %S seconds'
		)}
	{:else}
		&nbsp;
	{/if}
</p>

<style>
	#timeline {
		width: 100%;
		height: 175px;
	}
	#timeline:hover {
		cursor: none;
	}
</style>
