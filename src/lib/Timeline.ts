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
	 * 2. An interval will cut around other intervals that started afater and ended before it ended.
	 * 3. There can be any level of nesting of intervals.
	 * 4. If two intervals start at the same time, the one that ends first will take priority.
	 * 5. Any intervals created due to cutting around will have an id of -1.
	 *
	 * @param {Date} start (optional) The start of the timeline, used to represent what range
	 * we are sure is accurate.
	 *
	 * @param {Date} end (optional) The end of the timeline, used to represent what range
	 * we are sure is accurate.
	 *
	 * If start or end are not passed, the start end end from the intervals will be used.
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
	 * Returns a timeline with the interval added. other intervals around it.
	 *
	 * @param {interval} interval The interval to add.
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

	getOutOfSyncIntervals(): interval[] {
		const result: interval[] = [];
		this.intervals.forEach((e) => {
			if (e.id === -1) {
				result.push(e);
			}
		});
		return result;
	}

	getMissingRanges(start: Date, end: Date): { start: Date; end: Date }[] {
		const result: { start: Date; end: Date }[] = [];
		// Get the gaps between the intervals.
		for (let i = 0; i < this.intervals.length - 1; i++) {
			const e1 = this.intervals[i];
			const e2 = this.intervals[i + 1];
			if (e1.end < e2.start && e1.end > start && e2.start < end) {
				result.push({ start: e1.end, end: e2.start });
			}
		}
		// Get the gaps at the start and end.
		if (this.intervals.length > 0) {
			const first = this.intervals[0];
			if (first.start > start) {
				result.unshift({ start: start, end: first.start });
			}
			const last = this.intervals[this.intervals.length - 1];
			if (last.end < end) {
				result.push({ start: last.end, end: end });
			}
		} else {
			result.push({ start: start, end: end });
		}
		return result;
	}

	merge(timeline: Timeline): Timeline {
		const intervals = this.intervals.concat(timeline.intervals);
		return new Timeline(intervals);
	}

	private cutOverlaps(intervals: interval[]): interval[] {
		intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

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
		return { intervals: copy };
	}

	static fromSerializable(serializable: serializableTimeline): Timeline {
		return new Timeline(serializable.intervals);
	}
}

export type serializableTimeline = {
	intervals: interval[];
};
