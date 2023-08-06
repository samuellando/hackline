import Timeline from './Timeline';
import type { serializableTimeline } from '$lib/Timeline';
import type { running, settings, interval } from '$lib/types';

export default class State {
	readonly timeline: Timeline;
	readonly running: running;
	readonly settings: settings;

	constructor(timeline: Timeline, running: running, settings: settings) {
		this.timeline = timeline;
		this.running = running;
		this.settings = JSON.parse(JSON.stringify(settings));
	}

	getTimeline(start?: Date, end?: Date): Timeline {
		// Fill with running.
		const interval: interval = {
			title: this.running.title,
			start: this.running.start,
			end: new Date(),
			id: -2
		};
		let copy = this.timeline.intervals.slice();
		copy.unshift(interval);
		// Remove or splice anything outside the range.
		if (start && end) {
			copy = copy.filter((interval) => {
				return !(
					interval.end.getTime() <= start.getTime() || interval.start.getTime() >= end.getTime()
				);
			});
			copy.forEach((interval, index) => {
				// Trim anything that starts before the start.
				if (interval.start.getTime() < start.getTime()) {
					copy[index] = {
						title: interval.title,
						start: start,
						end: interval.end,
						id: interval.id
					};
				}
				// Trim anything that ends after the end.
				if (interval.end.getTime() > end.getTime()) {
					copy[index] = {
						title: interval.title,
						start: copy[index].start,
						end: end,
						id: interval.id
					};
				}
			});
		}
		return new Timeline(copy, this.timeline.start, this.timeline.end);
	}

	getRunning(): running {
		const now = Date.now();
		let running = this.running;
		let lastEnd = 0;
		this.timeline.intervals.forEach((interval) => {
			if (interval.start.getTime() <= now && interval.end.getTime() >= now) {
				running = {
					title: interval.title,
					start: interval.start,
					end: interval.end,
					fallback: this.running
				};
			} else if (interval.end.getTime() > lastEnd) {
				lastEnd = interval.end.getTime();
			}
		});

		if (!running.end) {
			if (lastEnd > running.start.getTime()) {
				running = {
					title: running.title,
					start: new Date(lastEnd)
				};
			}
		}
		return running;
	}

	static fromSerializable(serializable: serializableState): State {
		return new State(
			Timeline.fromSerializable(serializable.timeline),
			serializable.running,
			serializable.settings
		);
	}

	static empty(): State {
		return new State(new Timeline([]), { title: '', start: new Date(0) }, {});
	}

	toObject(): serializableState {
		const d: serializableState = {
			timeline: this.timeline.toObject(),
			running: this.running,
			settings: JSON.parse(JSON.stringify(this.settings))
		};
		return d;
	}
}

export type serializableState = {
	timeline: serializableTimeline;
	running: running;
	settings: settings;
};
