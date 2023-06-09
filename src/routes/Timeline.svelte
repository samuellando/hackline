<script lang="ts">
	import type { log } from './types';
	import { onMount, onDestroy } from 'svelte';
	import type { ApiClient } from './Api';
	import { makeColorIterator } from './colors';

	export let logs: log[] = [];
	export let rangeStartM: number = new Date().getTime() - 24 * 60 * 60 * 1000;
	export let rangeEndM: number = new Date().getTime();
	export var apiClient: ApiClient;
	var interval: ReturnType<typeof setInterval>;

	interface timelineLog extends log {
		color: string;
		percent: number;
		draw: boolean;
	}

	var colormap: any = {};
	var syncing: any = {};

	let timeline: timelineLog[] = [];

	function getTimeline(logs: log[], rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		if (loading) {
			return logs;
		}
		if (typeof apiClient !== 'undefined') {
			if (editMode) {
				logs = apiClient.timelinePreviewAdd(n, rangeStart, rangeEnd);
			} else {
				logs = apiClient.getTimeline(rangeStart, rangeEnd);
			}
		}
		var total = rangeEnd - rangeStart;

		var colors = makeColorIterator();

		return logs.map((e) => {
			if (!(e.title in colormap)) {
				colormap[e.title] = colors.next().value;
				apiClient.setSetting('colormap', colormap);
			}
			e.color = colormap[e.title];

			var start;
			var end;
			if (e.start < rangeStart) {
				start = rangeStart;
			} else {
				start = e.start;
			}
			if (e.end > rangeEnd) {
				end = rangeEnd;
			} else {
				end = e.end;
			}

			e.draw = start < end;

			e.percent = ((end - start) / total) * 100;
			return e;
		}) as timelineLog[];
	}

	$: timeline = getTimeline(logs, rangeStartM, rangeEndM);

	var updated = -1;

	var loading = true;
	onMount(async () => {
		let t = apiClient.getSetting('colormap');
		if (t != null) {
			colormap = t;
		}
		logs = apiClient.getTimeline(rangeStartM, rangeEndM);
		interval = setInterval(() => {
			let t = apiClient.getSetting('colormap');
			if (t != null) {
				colormap = t;
			}
			syncing = apiClient.getSyncing();
			if (apiClient.lastChangeTimeline() != updated) {
				logs = apiClient.getTimeline(rangeStartM, rangeEndM);
				updated = apiClient.lastChangeTimeline();
			}
			if (live && !editMode) {
				rangeEndM = new Date().getTime();
			}
		}, 1000);
		loading = false;
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	var curM = rangeStartM + (rangeEndM - rangeStartM) / 2;
	function rangeScroll(e: WheelEvent) {
		e.preventDefault();
		if (editMode && e.shiftKey) return;

		if (e.deltaY < 0) {
			live = false;
		}

		rangeEndM += ((rangeEndM - curM) / 1000) * e.deltaY;
		if (rangeEndM > new Date().getTime()) {
			live = true;
			rangeEndM = new Date().getTime();
		}
		rangeStartM -= ((curM - rangeStartM) / 1000) * e.deltaY;
		if (rangeStartM < timeline[0].start) {
			//rangeStartM = timeline[0].start;
		}

		if (editMode) {
			timeline = getTimeline(logs);
		} else {
			timeline = getTimeline(logs);
		}
	}

	let drag = false;
	export let live = false;
	function rangeHover(e: MouseEvent) {
		e.preventDefault();
		let t = e.currentTarget as HTMLElement;
		if (t != null) {
			let x = e.pageX - t.offsetLeft;
			curM = rangeStartM + (rangeEndM - rangeStartM) * (x / t.offsetWidth);

			if (editMode && e.shiftKey) {
				if (drag) {
					n.end = curM + 600000;
					n.duration = n.end - n.start;
				} else {
					n.end = curM + 600000;
					n.start = n.end - n.duration;
				}
				timeline = getTimeline(logs);
			} else {
				if (drag) {
					let oldS = rangeStartM;
					let oldE = rangeEndM;
					rangeStartM -= (e.movementX / t.offsetWidth) * (rangeEndM - rangeStartM);
					rangeEndM -= (e.movementX / t.offsetWidth) * (rangeEndM - rangeStartM);

					if (e.movementX > 0) {
						live = false;
					}
					if (rangeEndM > new Date().getTime()) {
						live = true;
						rangeEndM = oldE;
						rangeStartM = oldS;
					}
					if (rangeStartM < timeline[0].start) {
						//rangeEndM = oldE;
						//rangeStartM = oldS;
					}
					if (editMode) {
						timeline = getTimeline(logs);
					} else {
						timeline = getTimeline(logs);
					}
				}
			}
		}
	}

	function durationToString(millis: number) {
		function round(value: number, precision: number) {
			var multiplier = Math.pow(10, precision || 0);
			return Math.round(value * multiplier) / multiplier;
		}
		let d = millis;
		if (d < 1000) {
			return d + ' millis';
		} else {
			d = round(d / 1000, 1);
		}
		if (d < 60) {
			return d + ' secs';
		} else {
			d = round(d / 60, 1);
		}
		if (d < 60) {
			return d + ' mins';
		} else {
			d = round(d / 60, 1);
		}
		if (d < 24) {
			return d + ' hours';
		} else {
			d = round(d / 24, 1);
			return d + ' days';
		}
	}

	var editMode = false;
	var oldLogs: log[];
	var n: log;
	function add() {
		// Create an event right in the middle of the timeline.
		n = {
			title: 'default',
			start: rangeStartM + (rangeEndM - rangeStartM) / 2,
			end: rangeStartM + (rangeEndM - rangeStartM) / 2 + 15 * 60 * 1000,
			duration: 15 * 60 * 1000,
			id: 'new'
		};
		editMode = true;
		timeline = getTimeline(logs, rangeStartM, rangeEndM);
	}

	function save() {
		apiClient.timelineAdd(n);
		editMode = false;
	}
</script>

<h3>
	syncing {Object.keys(syncing)
		.map((e) => e + ' ' + syncing[e])
		.join(' ')}
</h3>

<p>
	{new Date(curM)}
	{#if live}LIVE{/if}
</p>
<button on:click={add}>Add</button>

<div
	class="timeline"
	style="background-color: grey; height: 100px; display: flex"
	on:mousewheel={rangeScroll}
	on:mousemove={rangeHover}
	on:mousedown={() => (drag = true)}
	on:mouseup={() => (drag = false)}
>
	{#each timeline as e}
		{#if e.draw}
			<div style="background-color: {e.color}; height: 100px; width: {e.percent}%" class="event">
				<span>
					{e.title} <br />
					{new Date(e.start).toLocaleTimeString()} - {new Date(e.end).toLocaleTimeString()} <br />
					{durationToString(e.duration)}
				</span>
			</div>
		{/if}
	{/each}
</div>
{#if editMode}
	<h2>Editing...</h2>
	<input bind:value={n.title} placeholder="entry title" />
	<br />
	{new Date(n.start).toLocaleTimeString()} - {new Date(n.end).toLocaleTimeString()} <br />
	{durationToString(n.duration)}
	<button on:click={save}>Save</button>
{/if}

<style>
	/* Tooltip container */
	.event {
		position: relative;
		display: inline-block;
	}

	.event:hover {
		position: relative;
		display: inline-block;
		border: 1px solid;
	}

	/* Tooltip text */
	.event span {
		visibility: hidden;
		width: 120px;
		background-color: black;
		color: #fff;
		text-align: center;
		padding: 5px 0;
		border-radius: 6px;

		/* Position the tooltip text - see examples below! */
		position: absolute;
		z-index: 1;
		bottom: 100%;
		left: 50%;
		margin-left: -60px; /* Use half of the width (120/2 = 60), to center the tooltip */
	}

	/* Show the tooltip text when you mouse over the tooltip container */
	.event:hover span {
		visibility: visible;
	}
</style>
