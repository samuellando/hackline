<script lang="ts">
	import type { log } from './types';
	import { onMount } from 'svelte';
	import { post } from './Api';

	export let logs: log[] = [];
	export let rangeStartM: number = new Date().getTime() - 24 * 60 * 60 * 1000;
	export let rangeEndM: number = new Date().getTime();
	export let colormap: any = {};
	export let apiUrl: string;
	export let accessToken: string;

	interface timelineLog extends log {
		color: string;
		percent: number;
		draw: boolean;
	}

	let timeline: timelineLog[] = [];

	function getTimeline(logs: log[], rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		var total = rangeEnd - rangeStart;

		var colors = [
			'#00bdff',
			'#1b3bff',
			'#8F00FF',
			'#ff0011',
			'#ff7300',
			'#ffd600',
			'#00c30e',
			'#65ff00',
			'#d200ff',
			'#FF00FF',
			'#7d7d7d',
			'#5d5d5d'
		];
		var i = Object.keys(colormap).length;

		return logs.map((e) => {
			if (!(e.title in colormap)) {
				colormap[e.title] = colors[i++];
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

	$: timeline = editMode ? timeline : getTimeline(logs, rangeStartM, rangeEndM);

	onMount(async () => {
		setInterval(() => {
			if (live && !editMode) {
				rangeEndM = new Date().getTime();
			}
		}, 10000);
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
			rangeStartM = timeline[0].start;
		}

		if (editMode) {
			drawSplice(n, logs);
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
				drawSplice(n, logs);
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
						rangeEndM = oldE;
						rangeStartM = oldS;
					}
					if (editMode) {
						drawSplice(n, logs);
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
			title: '',
			start: rangeStartM + (rangeEndM - rangeStartM) / 2,
			end: rangeStartM + (rangeEndM - rangeStartM) / 2 + 15 * 60 * 1000,
			duration: 15 * 60 * 1000,
			id: 'new'
		};
		editMode = true;
		drawSplice(n, logs);
	}

	function edit() {
		// Create an event right in the middle of the timeline.
		n = {
			title: '',
			start: rangeStartM + (rangeEndM - rangeStartM) / 2,
			end: rangeStartM + (rangeEndM - rangeStartM) / 2 + 15 * 60 * 1000,
			duration: 15 * 60 * 1000,
			id: 'new'
		};
		editMode = true;
		oldLogs = logs;
		drawSplice(n, logs);
	}

	function save() {
		editMode = false;
		logs = splice(n, logs);
		post(apiUrl, 'logs', n, accessToken);
	}

	function splice(n: log, logs: log[]) {
		let clone = JSON.parse(JSON.stringify(logs));

		for (var i = 0; i < clone.length; i++) {
			if (clone[i].start <= n.start && clone[i].end >= n.start) {
				if (clone[i].end > n.end) {
					clone.splice(i + 1, 0, { ...clone[i] });
					clone[i + 1].start = n.end;
					clone[i + 1].end = clone[i].end;
					clone[i + 1].duration = clone[i + 1].end - clone[i + 1].start;
				}
				clone[i].end = n.start;
				clone[i].duration = clone[i].end - clone[i].start;
				for (var j = i + 1; j < clone.length; ) {
					if (clone[j].end < n.end) {
						clone.splice(j, 1);
					} else if (clone[j].start < n.end) {
						clone[j].start = n.end;
						clone[j].duration = clone[j].end - clone[j].start;
					} else {
						break;
					}
				}
				clone.splice(i + 1, 0, n);
				break;
			}
		}
		return clone;
	}

	function drawSplice(n: log, logs: log[]) {
		timeline = getTimeline(splice(n, logs));
	}
</script>

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
