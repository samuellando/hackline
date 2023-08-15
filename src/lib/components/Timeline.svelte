<script lang="ts">
	import type { interval } from '$lib/types';
	import { onMount, onDestroy } from 'svelte';
	import type { Unsubscriber } from 'svelte/store';
	import { makeColorIterator } from '$lib/colors';
	import {
		getTimeDivisions,
		toDateTimeString,
		durationToString,
		toTimeString
	} from '$lib/timePrint';
	import moment from 'moment';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
	}

	export let rangeStart: Date = moment().startOf('day').toDate();
	export let rangeEnd: Date = new Date();

	// Re draw  when the range changes.
	$: rangeStart, rangeEnd, drawTimeline();

	export let live = true;

	interface coloredInterval extends interval {
		color: string;
		drawStartPx: number;
		drawEndPx: number;
	}

	let unsubscribe: Unsubscriber;
	let colorIterator = makeColorIterator();
	onMount(() => {
		unsubscribe = apiClient.subscribe(() => {
			drawTimeline();
		});
	});

	onDestroy(() => {
		unsubscribe();
	});

	let x = -1;
	let y = -1;
	let drag = false;
	let shiftHeld = false;
	let curM = -1;
	function mouseMove(event: MouseEvent) {
		// Update the x and y values.
		const canvas = <HTMLCanvasElement>document.getElementById('timeline');
		const rect = canvas.getBoundingClientRect();
		x = event.clientX - rect.left;
		y = event.clientY - rect.top;

		curM = (x / rect.width) * (rangeEnd.getTime() - rangeStart.getTime()) + rangeStart.getTime();

		// Detect a relase of the shift key.
		if (!event.shiftKey) {
			shiftHeld = false;
		}
		// Check if a are adding an interval.
		if (drag) {
			// If we are pressing shift, then don't move the range, add an interval.
			if (event.shiftKey) {
				// Round to the nearest minute.
				let curMin = Math.round(curM / 60000) * 60000;
				let newInterval: interval;
				// If already previewing, get the interval.
				if (apiClient.isPreviewAdd() && shiftHeld) {
					newInterval = apiClient.getPreviewInterval();
				} else {
					newInterval = getNewInterval(curMin, curMin);
					shiftHeld = true;
				}
				// Update the preview interval time based on cur min.
				if (curMin < newInterval.start.getTime()) {
					newInterval = {
						...newInterval,
						start: new Date(curMin)
					};
				} else {
					newInterval = {
						...newInterval,
						end: new Date(curMin)
					};
				}
				apiClient.previewAdd(newInterval);
			} else {
				let oldS = rangeStart;
				let oldE = rangeEnd;
				let shift = (event.movementX / rect.width) * (rangeEnd.getTime() - rangeStart.getTime());
				let rangeStartM = oldS.getTime() - shift;
				let rangeEndM = oldE.getTime() - shift;

				if (event.movementX > 0) {
					live = false;
				}
				// If we passed the current time reset.
				if (rangeEndM > new Date().getTime()) {
					live = true;
					rangeEnd = oldE;
					rangeStart = oldS;
				} else {
					rangeStart = new Date(rangeStartM);
					rangeEnd = new Date(rangeEndM);
				}
			}
		}
		drawTimeline();
	}

	function mouseOut() {
		curM = -1;
		x = -1;
		y = -1;
		drag = false;
		drawTimeline();
	}

	function rangeScroll(e: WheelEvent) {
		e.preventDefault();
		if (curM < 0) {
			return;
		}

		if (e.shiftKey) {
			if (e.deltaY > 0) {
				live = false;
			}
			if (!live) {
				rangeEnd = new Date(rangeEnd.getTime() - e.deltaY * 10000);
				rangeStart = new Date(rangeStart.getTime() - e.deltaY * 10000);
			}
		} else {
			if (e.deltaY < 0) {
				live = false;
			}
			let dur = rangeEnd.getTime() - rangeStart.getTime();
			rangeEnd = new Date(rangeEnd.getTime() + (dur / 10000) * e.deltaY);
			rangeStart = new Date(rangeStart.getTime() - (dur / 10000) * e.deltaY);
		}

		if (rangeEnd > new Date()) {
			live = true;
			rangeEnd = new Date();
		}

		drawTimeline();
	}

	function toColoredInterval(i: interval): coloredInterval {
		let color: string;
		let colormap = apiClient.getSetting('colormap') as { [key: string]: string };
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

		return {
			title: i.title,
			start: i.start,
			end: i.end,
			color: color,
			drawStartPx: -1,
			drawEndPx: -1,
			id: i.id
		};
	}

	let hoveredInterval: interval | null = null;
	function drawTimeline() {
		// Get the timeline, and edit it depending on the state.

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
		ctx.fillStyle = apiClient.getSettingString('timeline-background') || '#b3b0ad';
		ctx.fillRect(0, 0, width, drawHeight);

		// Convert the timeline.
		let drawIntervals = apiClient
			.getTimeline(rangeStart, rangeEnd)
			.intervals.map(toColoredInterval);
		drawIntervals = drawIntervals.map((e) => {
			let dur = rangeEnd.getTime() - rangeStart.getTime();
			let startPx = ((e.start.getTime() - rangeStart.getTime()) / dur) * width;
			let endPx = ((e.end.getTime() - rangeStart.getTime()) / dur) * width;
			return {
				...e,
				drawStartPx: startPx,
				drawEndPx: endPx
			};
		});

		// Draw the timeline
		let hovering = false;
		drawIntervals.forEach((e) => {
			ctx.fillStyle = e.color;
			ctx.fillRect(e.drawStartPx, 0, e.drawEndPx - e.drawStartPx, drawHeight);
			// If the interval is out of sync color it red, green fro running.
			if (e.id < 0) {
				ctx.strokeStyle = e.id == -2 ? 'green' : 'red';
				ctx.lineWidth = 1;
				ctx.strokeRect(
					e.drawStartPx + ctx.lineWidth / 2,
					ctx.lineWidth / 2,
					e.drawEndPx - e.drawStartPx - ctx.lineWidth,
					drawHeight - ctx.lineWidth
				);
			}
			// Highlight the currently ohvered element
			if (
				!apiClient.isPreview() &&
				x >= 0 &&
				y >= 0 &&
				y <= drawHeight &&
				!drag &&
				x >= e.drawStartPx &&
				x <= e.drawEndPx
			) {
				hoveredInterval = e;
				hovering = true;
			}
			// If this is the preview interval, or the hovered interval, highlight it.
			if (
				((apiClient.isPreviewAdd() || apiClient.isPreviewEdit()) &&
					e.id == apiClient.getPreviewInterval().id) ||
				(hovering && hoveredInterval && e == hoveredInterval && !apiClient.isPreviewEdit())
			) {
				ctx.strokeStyle = apiClient.getSettingString('timeline-highlight') || 'black';
				ctx.lineWidth = 2;
				ctx.strokeRect(
					e.drawStartPx + ctx.lineWidth / 2,
					ctx.lineWidth / 2,
					e.drawEndPx - e.drawStartPx - ctx.lineWidth,
					drawHeight - ctx.lineWidth
				);
			}
		});
		// If no interval is hovered, reset the hovered interval.
		if (!hovering) {
			hoveredInterval = null;
		}

		// Blur everything outside the add preview interval.
		if (apiClient.isPreviewAdd()) {
			ctx.fillStyle = apiClient.getSettingString('timeline-blur') || '#00000040';
			let n = toColoredInterval(apiClient.getPreviewInterval());
			n.drawStartPx =
				((n.start.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) *
				width;
			n.drawEndPx =
				((n.end.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) *
				width;
			ctx.fillRect(0, 0, n.drawStartPx, drawHeight);
			ctx.fillRect(n.drawEndPx, 0, width - n.drawEndPx, drawHeight);
		}

		// x-axis
		ctx.beginPath();
		let divs = getTimeDivisions(rangeStart.getTime(), rangeEnd.getTime());
		ctx.strokeStyle = apiClient.getSettingString('timeline-x-axis-hashes') || 'black';
		ctx.fillStyle = apiClient.getSettingString('timeline-x-axis-text') || 'black';
		ctx.lineWidth = 1;
		ctx.font = apiClient.getSettingString('timeline-x-axis-font') || '15px serif';
		divs.forEach((e: [number, string]) => {
			let x = ((e[0] - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * width;
			ctx.moveTo(x, drawHeight);
			ctx.lineTo(x, height);
			ctx.fillText(e[1], x + 5, height - 5);
		});
		ctx.stroke();

		// draw the cursor.
		if (x >= 0 && x <= width && y > 0) {
			// draw the cursor
			ctx.strokeStyle = apiClient.getSettingString('timeline-cursor') || 'black';
			ctx.lineWidth = 0.25;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// Draw the info panel.
		if (x >= 0 && y >= 0 && (hoveredInterval != null || apiClient.isPreview())) {
			let interval: interval;
			if (apiClient.isPreview()) {
				interval = apiClient.getPreviewInterval();
			} else {
				if (hoveredInterval == null) {
					throw Error('hoveredInterval is null for info panel');
				}
				interval = hoveredInterval;
			}

			let padding = 10;
			let ipHeight = 75;
			let ipWidth = 150;
			let flipSensitivity = 0.5;

			// Pick where to draw the info panel.
			let ipx;
			let ipy;
			if (x + ipWidth * flipSensitivity + padding > width) {
				ipx = x - ipWidth - padding;
			} else {
				ipx = x + padding;
			}

			if (y + ipHeight * flipSensitivity + padding > height) {
				ipy = y - ipHeight - padding;
			} else {
				ipy = y + padding;
			}

			ctx.fillStyle = apiClient.getSettingString('timeline-blur') || '#00000040';
			ctx.fillRect(ipx, ipy, ipWidth, ipHeight);

			ctx.fillStyle = apiClient.getSettingString('timeline-x-axis-text') || 'white';
			if (interval.id < 0) {
				if (interval.id == -1) {
					ctx.fillStyle = 'red';
				} else {
					ctx.fillStyle = 'green';
				}
			}

			ctx.font = 'bold 15px serif';

			ctx.fillText(interval.title, ipx + 5, ipy + 15, ipWidth - 10);
			ctx.fillStyle = apiClient.getSettingString('timeline-x-axis-text') || 'white';
			ctx.font = '15px serif';

			ctx.fillText(
				toTimeString(interval.start) + ' - ' + toTimeString(interval.end),
				ipx + 5,
				ipy + 30,
				ipWidth - 10
			);
			ctx.fillText(
				'Duration: ' +
					durationToString(interval.end.getTime() - interval.start.getTime(), '%H:%M:%S'),
				ipx + 5,
				ipy + 45,
				ipWidth - 10
			);

			ctx.fillText(toDateTimeString(new Date(curM)), ipx + 5, ipy + ipHeight - 10, ipWidth - 10);

			ctx.stroke();
		}
	}

	function editInterval(i: interval | null) {
		if (i != null && i.id == -2) {
			alert("You can't edit the running interval.");
		}
		if (i != null && i.id == -1) {
			alert("You can't edit an out of sync interval.");
		}
		if (i != null && i.id >= 0) {
			apiClient.previewEdit(i);
		}
	}

	function getNewInterval(start: number, end: number) {
		let defaultTitle = apiClient.getSettingString('default-title') || 'productive';
		let startD = new Date(start);
		let endD = new Date(end);
		return { id: -3, title: defaultTitle, start: startD, end: endD };
	}
</script>

<div class="w-full text-center">
	<canvas
		id="timeline"
		class="
        h-[175px]
        w-[95%]
        m-auto
        cursor-none
    "
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
</div>
