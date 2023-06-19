<script lang="ts">
	import type { interval } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';
	import { makeColorIterator } from './colors';
	import { durationToString, toDateTimeString, getTimeDivisions } from './timePrint';

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

	let updated = -1;
	let loading = true;
	let addMode = false;
	let editMode = false;
	let colorIterator = makeColorIterator();
	onMount(async () => {
		function lastChange() {
			return Math.max(
				apiClient.lastChangeTimeline(),
				apiClient.lastChangeSettings(),
				apiClient.lastChangeRunning()
			);
		}
		function update() {
			if (!editMode && !addMode) {
				if (lastChange() != updated) {
					drawTimeline();
					updated = lastChange();
				}
			}
		}

		interval = setInterval(() => {
			if (live && !addMode && !editMode) {
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

	$: rangeStartM, rangeEndM, drawTimeline();

	function toDrawInterval(i: interval, duration: number, width: number): drawInterval {
		let color: string;
		let colormap: { [k: string]: string } = {};
		if ('color' in i) {
			color = (i as drawInterval).color;
		} else {
			colormap = apiClient.getSetting('colormap');
			if (colormap == null) {
				colormap = {};
			}
			if (i.title in colormap) {
				color = colormap[i.title];
			} else {
				color = colorIterator.next().value;
			}
			if (!addMode && !editMode && !(i.title in colormap)) {
				colormap[i.title] = color;
				apiClient.setSetting('colormap', colormap);
			}
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
		if (addMode) {
			timeline = apiClient.timelinePreviewAdd(newInterval, rangeStartM, rangeEndM);
		} else {
			timeline = apiClient.getTimeline(rangeStartM, rangeEndM);
			if (editMode) {
				for (let i = 0; i < timeline.length; i++) {
					if (timeline[i].id == editingInterval.id) {
						timeline[i] = editingInterval;
						break;
					}
				}
			}
		}

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
				(editMode && e.id == editingInterval.id) ||
				(hoveredInterval && e.id == hoveredInterval.id && !editMode)
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
		if (addMode) {
			ctx.fillStyle = '#00000040';
			var n = toDrawInterval(newInterval, rangeEndM - rangeStartM, width);
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
				if (!addMode || curM < newInterval.start || !shiftHeld) {
					addInterval(curMin, curMin);
					shiftHeld = true;
					addMode = true;
					editMode = false;
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

	function previewToDrawInterval(i: interval) {
		let color: string;
		let colormap = apiClient.getSetting('colormap') || {};
		if (i.title in colormap) {
			color = colormap[i.title];
		} else if (!('color' in i)) {
			color = colorIterator.next().value;
		} else {
			color = (i as drawInterval).color;
			for (let k in colormap) {
				if (color == colormap[k]) {
					color = colorIterator.next().value;
				}
			}
		}

		return {
			id: i.id,
			title: i.title,
			start: i.start,
			end: i.end,
			drawStart: -1,
			drawEnd: -1,
			color: color
		};
	}

	let editingInterval: drawInterval;
	function editInterval(i: interval | null) {
		if (i != null && !addMode && i.id != 'running') {
			editMode = true;
			editingInterval = previewToDrawInterval(i);
			drawTimeline();
		}
	}

	function updateEditingInterval(e: Event) {
		let t = e.target as HTMLInputElement;
		editingInterval.title = t.value;
		editingInterval = previewToDrawInterval(editingInterval);

		drawTimeline();
	}

	function commitEditingInterval() {
		if (editMode && editingInterval) {
			apiClient.timelineEdit(editingInterval);
			let colormap = apiClient.getSetting('colormap') || {};
			colormap[editingInterval.title] = editingInterval.color;
			apiClient.setSetting('colormap', colormap);
			editMode = false;
			drawTimeline();
		}
	}

	let newInterval: drawInterval;
	function addInterval(start: number = -1, end: number = -1) {
		let defaultTitle = apiClient.getSetting('defaultTitle') || 'productive';
		newInterval = previewToDrawInterval({ id: 'new', title: defaultTitle, start: start, end: end });
		addMode = true;
		editMode = false;
		start = start >= 0 ? start : (rangeStartM + rangeEndM) / 2;
		end = end >= start ? end : start + 15 * 60 * 1000;
		drawTimeline();
	}

	function commitNewInterval() {
		if (addMode && newInterval) {
			apiClient.timelineAdd(newInterval);
			let colormap = apiClient.getSetting('colormap') || {};
			colormap[newInterval.title] = newInterval.color;
			apiClient.setSetting('colormap', colormap);
			addMode = false;
			drawTimeline();
		}
	}

	function updateTitle(e: Event) {
		let t = e.target as HTMLInputElement;
		newInterval.title = t.value;
		newInterval = previewToDrawInterval(newInterval);
		drawTimeline();
	}

	function updateStart(e: Event) {
		let t = e.target as HTMLInputElement;
		newInterval.start = Date.parse(t.value);
		drawTimeline();
	}

	function updateEnd(e: Event) {
		let t = e.target as HTMLInputElement;
		newInterval.end = Date.parse(t.value);
		drawTimeline();
	}

	function cancel() {
		addMode = false;
		editMode = false;
		drawTimeline();
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
	{#if !addMode || editMode}
		<button on:click={() => addInterval()}>add</button>
	{/if}
	{#if addMode}
		<input type="text" value={newInterval.title} on:input={updateTitle} />
		{durationToString(newInterval.end - newInterval.start, 1)}
		<input
			type="datetime-local"
			value={toDateTimeString(newInterval.start)}
			on:change={updateStart}
		/>
		<input type="datetime-local" value={toDateTimeString(newInterval.end)} on:change={updateEnd} />
		<button on:click={commitNewInterval}>add</button>
		<button on:click={cancel}>cancel</button>
	{:else if editMode}
		<input type="text" value={editingInterval.title} on:input={updateEditingInterval} />
		{toDateTimeString(editingInterval.start)} - {toDateTimeString(editingInterval.end)}
		{durationToString(editingInterval.end - editingInterval.start, 1)}
		<button on:click={commitEditingInterval}>edit</button>
		<button on:click={cancel}>cancel</button>
	{:else if hoveredInterval}
		{hoveredInterval.title}
		{toDateTimeString(hoveredInterval.start)} - {toDateTimeString(hoveredInterval.end)}
		{durationToString(hoveredInterval.end - hoveredInterval.start, 1)}
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
