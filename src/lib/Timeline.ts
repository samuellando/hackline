import type { interval } from './types';

/*
 * An immutable timeline.
 */
export default class Timeline {
	readonly intervals: interval[];
	readonly start: Date;
	readonly end: Date;

	constructor(intervals: interval[] | Timeline, start?: Date, end?: Date) {
		let copy: interval[];
		if (intervals instanceof Timeline) {
			if (
				start &&
				end &&
				(start.getTime() !== intervals.start.getTime() || end.getTime() !== intervals.end.getTime())
			) {
				copy = intervals.intervals.slice();
				this.trim(copy, start, end);
				this.start = new Date(Math.max(start.getTime(), intervals.start.getTime()));
				this.end = new Date(Math.min(end.getTime(), intervals.end.getTime()));
			} else {
				copy = intervals.intervals;
				this.start = intervals.start;
				this.end = intervals.end;
			}
		} else {
			// We need to make a copy here because it's not readonly.
			copy = intervals.slice();
			if (start && end) {
				this.trim(copy, start, end);
			}
			// Because there may be overlaps.
			this.start = new Date(Math.min(...copy.map((e) => e.start.getTime())));
			this.end = new Date(Math.max(...copy.map((e) => e.end.getTime())));
			copy = this.cutOverlaps(copy);
		}
		this.intervals = copy;
	}

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

		return new Timeline(copy);
	}

	update(interval: interval): Timeline {
		const copy = this.intervals.slice();
		for (let i = 0; i < copy.length; i++) {
			if (copy[i].id == interval.id) {
				copy[i] = interval;
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

	private trim(intervals: interval[], start: Date, end: Date) {
		for (let i = 0; i < intervals.length; i++) {
			if (intervals[i].end < start) {
				// Remove it.
				intervals.splice(i, 1);
				i--;
			} else if (intervals[i].start < start) {
				// Move the beginging.
				intervals[i] = {
					id: intervals[i].id,
					title: intervals[i].title,
					start: start,
					end: intervals[i].end
				};
			} else {
				break;
			}
		}
		for (let i = intervals.length - 1; i >= 0; i--) {
			if (intervals[i].start > end) {
				// Remove it.
				intervals.splice(i, 1);
			} else if (intervals[i].end > end) {
				// Move the begining.
				intervals[i] = {
					id: intervals[i].id,
					title: intervals[i].title,
					start: intervals[i].start,
					end: end
				};
			} else {
				break;
			}
		}
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
