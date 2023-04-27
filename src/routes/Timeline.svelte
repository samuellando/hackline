<script lang="ts">
	import type { log } from './types';
	import { onMount } from 'svelte';

	export let logs: log[] = [];
	export let rangeStartM: number = new Date().getTime() - 24 * 60 * 60 * 1000;
	export let rangeEndM: number = new Date().getTime();

	interface timelineLog extends log {
		color: string;
		percent: number;
		draw: boolean;
	}

	let timeline: timelineLog[] = [];

	var colormap: any = {};
	function getTimeline(logs: log[], rangeStart = rangeStartM, rangeEnd = rangeEndM) {
		var total = rangeEnd - rangeStart;

		var colors = ['green', 'red', 'yellow', 'blue'];
		var i = 0;

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

	$: timeline = getTimeline(logs, rangeStartM, rangeEndM);

	onMount(async () => {
		timeline = getTimeline(logs);
		setInterval(() => {
			if (live) {
				rangeEndM = new Date().getTime();
			}
		}, 10000);
	});

	var curM = rangeStartM + (rangeEndM - rangeStartM) / 2;
	function rangeScroll(e: WheelEvent) {
		e.preventDefault();

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
		timeline = getTimeline(logs);
	}

	let drag = false;
	export let live = false;
	function rangeHover(e: MouseEvent) {
		e.preventDefault();
		let t = e.currentTarget as HTMLElement;
		if (t != null) {
			let x = e.pageX - t.offsetLeft;
			curM = rangeStartM + (rangeEndM - rangeStartM) * (x / t.offsetWidth);

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
				timeline = getTimeline(logs);
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
</script>

<p>
	{new Date(curM)}
	{#if live}LIVE{/if}
</p>
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
