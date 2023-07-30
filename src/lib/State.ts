import Timeline from './Timeline';
import type { serializableTimeline } from '$lib/Timeline';
import type { running, settings } from '$lib/types';

export default class State {
	timeline: Timeline;
	running: running;
	settings: settings;

	constructor(timeline: Timeline, running: running, settings: settings) {
		this.timeline = timeline;
		this.running = running;
		this.settings = settings;
	}

	speculate(end: Date): void {
		let running = this.running;
		this.timeline.fill(running, end);
		let now = new Date();
		if (typeof running.fallback !== 'undefined' && typeof running.end !== 'undefined') {
			running = running.fallback;
		}
		this.timeline.intervals.forEach((i) => {
			if (i.start.getTime() < now.getTime() && i.end.getTime() > now.getTime()) {
				running = { title: i.title, start: i.start, end: i.end, fallback: running };
			}
		});
		this.running = running;
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

	clone(): State {
		return State.fromSerializable(this.toObject());
	}

	toObject(): serializableState {
		let d: serializableState = {
			timeline: { intervals: this.timeline.getIntervals() },
			running: this.running,
			settings: this.settings
		};
		return d;
	}
}

export type serializableState = {
	timeline: serializableTimeline;
	running: running;
	settings: settings;
};
