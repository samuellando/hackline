import type { interval } from './types';

/**
 * An immutable timeline, of non overlapping intervals.
 *
 * The timeline is immutable, so all methods return a new timeline.
 * This is done to allow for object sharring accross the app.
 *
 * @property {interval[]} intervals in the timeline.
 * @param {Date} start The start of the timeline, used to represent what range
 * we are sure is accurate.
 * @param {Date} end The end of the timeline, used to represent what range
 * we are sure is accurate.
 */
export default class Timeline {
	readonly intervals: interval[];
	readonly start: Date;
	readonly end: Date;

	/**
	 * Creates the timeline form the given intervals.
	 *
	 * @param {interval[] | Timeline} intervals The intervals to use.
	 * If a timeline is passed, it will not not copy the data to avoid unecessary mallocs.
	 * If an array is passed, the data is shallow copied, since interval is immutable.
	 *
	 * The timeline will not have any overlaps, and will remove the overlaps using the following rules.
	 * 1. An interval with a later start will cut off other intervals that started before it.
	 * 2. An interval will cut around other intervals that started after and ended before it ended.
	 * 3. There can be any level of nesting of intervals.
	 * 4. If two intervals start at the same time, the one that ends first will take priority.
	 * 5. Any intervals created due to cutting around will have an id of -1.
	 *
	 * @param {Date} start (optional) The start of the timeline, used to represent what range
	 * we are sure is accurate. Defaults to the start of the first interval, or zero if there are no intervals.
	 *
	 * @param {Date} end (optional) The end of the timeline, used to represent what range
	 * we are sure is accurate. Defaults to the end of the last interval, or zero if there are no intervals.
	 */
	constructor(intervals: interval[] | Timeline, start?: Date, end?: Date) {
		let tl: interval[];
		if (intervals instanceof Timeline) {
			tl = intervals.intervals;
			this.start = intervals.start;
			this.end = intervals.end;
		} else {
			// We need to make a copy here because it's not readonly.
			tl = intervals.slice();
			// Because there may be overlaps.
			tl = this.cutOverlaps(tl);
			if (tl.length == 0) {
				this.start = new Date(0);
				this.end = new Date(0);
			} else {
				this.start = tl[0].start;
				this.end = tl[tl.length - 1].end;
			}
		}
		if (start && end) {
			this.start = start;
			this.end = end;
		}
		this.intervals = tl;
	}

	/**
	 * Returns a timeline with the interval added. other intervals cut around it.
	 * If an interval is cut around, it will have an id of -1.
	 *
	 * @param {interval} interval The interval to add.
	 * @returns {Timeline} The new timeline.
	 */
	add(interval: interval): Timeline {
		const copy = this.intervals.slice();
		// Cut existing intervals around the new one.
		for (let i = 0; i < copy.length; i++) {
			const e = copy[i];
			/*
			 * I find it nice to do this with bits instead of 20 ifs.
			 *
			 * 0: start < existing.start
			 * 1: start < existing.end
			 * 2: end < existing.start
			 * 3: end < existing.end
			 *
			 * 0 0 0 0 => nothing
			 *    |  e  |
			 *            | log |
			 * 1 1 1 1 => nothing
			 *           |  e  |
			 *   | log |
			 * 0 1 0 0 => Move end to log.start.
			 *  |  e   |
			 *       | log |
			 * 1 1 0 0 => Delete it.
			 *      |  e   |
			 *    | log       |
			 * 1 1 0 1 => Move start to log.end.
			 *           |  e   |
			 *    | log    |
			 * 0 1 0 1 => Splice it.
			 *  |      e       |
			 *     | log    |
			 */
			let c = 0;
			c = c | (e.start >= interval.start ? 0b1000 : 0);
			c = c | (e.end > interval.start ? 0b0100 : 0);
			c = c | (e.start > interval.end ? 0b0010 : 0);
			c = c | (e.end > interval.end ? 0b0001 : 0);

			switch (c) {
				case 0b0100:
					copy[i] = {
						id: e.id,
						title: e.title,
						start: e.start,
						end: interval.start
					};
					break;
				case 0b1100:
					copy.splice(i, 1);
					i--;
					break;
				case 0b1101:
					copy[i] = {
						id: e.id,
						title: e.title,
						start: interval.end,
						end: e.end
					};
					break;
				case 0b0101:
					copy.splice(i + 1, 0, {
						id: e.id > 0 ? -1 : e.id, // If running keep it as -2.
						title: e.title,
						start: interval.end,
						end: e.end
					});
					copy[i] = {
						id: e.id,
						title: e.title,
						start: e.start,
						end: interval.start
					};
					i++;
					break;
			}
		}

		let inserted = false;
		for (let i = 0; i < copy.length; i++) {
			if (copy[i].start >= interval.end) {
				copy.splice(i, 0, interval);
				inserted = true;
				break;
			}
		}
		// If it wasnt insereted, add to the end.
		if (!inserted) {
			copy.push(interval);
		}

		return new Timeline(copy, this.start, this.end);
	}

	/**
	 * Returns a timeline with the interval updated, currently only supports updating the title.
	 *
	 * @param {interval} interval the update interval.
	 * @returns {Timeline} The new timeline.
	 */
	update(interval: interval): Timeline {
		const copy = this.intervals.slice();
		for (let i = 0; i < copy.length; i++) {
			if (copy[i].id == interval.id) {
				copy[i] = {
					id: interval.id,
					title: interval.title,
					start: copy[i].start,
					end: copy[i].end
				};
			}
		}
		return new Timeline(copy);
	}

	/**
	 * Returns a range of dates, where the timeline is out of sync, ie intervals with id -1.
	 * Implying a cut arround in construction or add, which will need to be synced with the backend.
	 *
	 * @returns {{ start: Date; end: Date } | null} The range of dates, or null if in sync.
	 */
	getOutOfSyncRange(): { start: Date; end: Date } | null {
		let start = new Date();
		let end = new Date(0);
		this.intervals.forEach((e) => {
			if (e.id === -1) {
				if (e.start < start) {
					start = e.start;
				}
				if (e.end > end) {
					end = e.end;
				}
			}
		});
		if (start.getTime() >= new Date().getTime()) {
			return null;
		}
		return { start: start, end: end };
	}

	/**
	 * Returns a list of intervals, where the timeline is out of sync, ie intervals with id -1.
	 *
	 * @returns {interval[]} The list of intervals.
	 */
	getOutOfSyncIntervals(): interval[] {
		const result: interval[] = [];
		this.intervals.forEach((e) => {
			if (e.id === -1) {
				result.push(e);
			}
		});
		return result;
	}

	/**
	 * Raturns a list of ranges, where there are gaps in the timeline.
	 *
	 * @param {Date} start The start of the range.
	 * @param {Date} end The end of the range.
	 * @returns {{ start: Date; end: Date }[]} The list of ranges.
	 */
	getMissingRanges(start: Date, end: Date): { start: Date; end: Date }[] {
		const result: { start: Date; end: Date }[] = [];
		const intervals = this.intervals.filter((e) => e.end > start && e.start < end);
		// Get the gaps between the intervals.
		for (let i = 0; i < intervals.length - 1; i++) {
			const e = intervals[i];
			const next = intervals[i + 1];
			if (e.end < next.start) {
				result.push({ start: e.end, end: next.start });
			}
		}
		// Get the gaps at the start and end.
		if (intervals.length > 0) {
			const first = intervals[0];
			const firstStart = new Date(Math.max(first.start.getTime(), this.start.getTime()));
			if (firstStart > start) {
				result.unshift({ start: start, end: firstStart });
			}
			const last = intervals[intervals.length - 1];
			const lastEnd = new Date(Math.min(last.end.getTime(), this.end.getTime()));
			if (lastEnd < end) {
				result.push({ start: lastEnd, end: end });
			}
		} else {
			result.push({ start: start, end: end });
		}
		return result;
	}

	/**
	 * Merges two timelines, and returns a new timeline.
	 * Simply combines the two array of intervals, and creates a new timeline off of it.
	 *
	 * @param {Timeline} timeline The timeline to merge with.
	 * @param {Date} start  Optional The start of the range. If missing uses of min of the two timelines.
	 * @param {Date} end Optional The end of the range. If missing uses of max of the two timelines.
	 * @returns {Timeline} The new timeline.
	 */
	merge(timeline: Timeline, start?: Date, end?: Date): Timeline {
		const intervals = this.intervals.concat(timeline.intervals);
		if (!start) {
			start = new Date(Math.min(this.start.getTime(), timeline.start.getTime()));
		}
		if (!end) {
			end = new Date(Math.max(this.end.getTime(), timeline.end.getTime()));
		}
		return new Timeline(intervals, start, end);
	}

	private cutOverlaps(intervals: interval[]): interval[] {
		intervals.sort((a, b) => {
			if (a.start.getTime() == b.start.getTime()) {
				return b.end.getTime() - a.end.getTime();
			} else {
				return a.start.getTime() - b.start.getTime();
			}
		});

		const s: interval[] = [];
		const starts: { start: Date; ref: interval }[] = [];

		let t = new Date(0);

		intervals.forEach((e) => {
			// Bring t to the start of this interval.
			while (s.length > 0 && t < e.start) {
				const i = s.pop() as interval;
				// If passed.
				if (i.end <= t) {
					continue;
				}
				// This is the next start.
				starts.push({ start: t, ref: i });
				t = i.end;
				// If the interval is not passed, keep it in the stack.
				if (t > e.start) {
					t = e.start;
					s.push(i);
				}
			}
			// Add the interval to the stack.
			t = e.start;
			s.push(e);
		});

		// Now clear the stack.
		while (s.length > 0) {
			const i = s.pop() as interval;
			// If passed.
			if (i.end <= t) {
				continue;
			}
			// This is the next start.
			starts.push({ start: t, ref: i });
			t = i.end;
		}

		// Finally convert tointervals.
		intervals = [];
		for (let i = 0; i < starts.length; i++) {
			const ref = starts[i].ref;
			const start = starts[i].start;
			let next;
			if (i < starts.length - 1) {
				// Leave a gap if there is a gap.
				next = new Date(Math.min(starts[i + 1].start.getTime(), ref.end.getTime()));
			} else {
				next = ref.end;
			}
			// If there is a gap, it will create starts at the end of the intervals, we should ignore them.
			if (start.getTime() != next.getTime()) {
				intervals.push({
					id: start.getTime() == ref.start.getTime() ? ref.id : -1,
					title: ref.title,
					start: new Date(start),
					end: new Date(next)
				});
			}
		}
		return intervals;
	}

	toObject(): serializableTimeline {
		const copy = this.intervals.slice();
		return { intervals: copy, start: this.start, end: this.end };
	}

	static fromSerializable(serializable: serializableTimeline): Timeline {
		return new Timeline(serializable.intervals, serializable.start, serializable.end);
	}
}

export type serializableTimeline = {
	intervals: interval[];
	start: Date;
	end: Date;
};
