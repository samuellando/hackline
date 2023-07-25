import type { interval, running } from './types';
import transfromer from '$lib/trpc/transformer';

export default class Timeline {
    intervals: interval[];

    constructor(intervals: interval[]) {
        this.intervals = intervals;
        this.cutOverlaps();
    }

    getIntervals(): interval[] {
        return transfromer.parse(transfromer.stringify(this.intervals));
    }

    add(interval: interval) {
        // Cut existing intervals around the new one.
        for (let i = 0; i < this.intervals.length; i++) {
            let e = this.intervals[i];
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
            var c = 0;
            c = c | (e.start > interval.start ? 0b1000 : 0);
            c = c | (e.end > interval.start ? 0b0100 : 0);
            c = c | (e.start > interval.end ? 0b0010 : 0);
            c = c | (e.end > interval.end ? 0b0001 : 0);

            switch (c) {
                case 0b0100:
                    e.end = interval.start;
                    break;
                case 0b1100:
                    this.intervals.splice(i, 1);
                    i--;
                    break;
                case 0b1101:
                    e.start = interval.end;
                    break;
                case 0b0101:
                    this.intervals.splice(i + 1, 0, {
                        id: -1,
                        title: e.title,
                        start: interval.end,
                        end: e.end
                    });
                    e.end = interval.start;
                    i++;
                    break;
            }
        }

        var inserted = false
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i].start >= interval.end) {
                this.intervals.splice(i, 0, interval);
                inserted = true;
                break;
            }
        }
        // If it wasnt insereted, add to the end.
        if (!inserted) {
            this.intervals.push(interval);
        }
    }

    update(interval: interval) {
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i].id == interval.id) {
                this.intervals[i] = interval;
            }
        }
    }

    trim(start: Date, end: Date) {
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i].end < start) {
                // Remove it.
                this.intervals.splice(i, 1);
                i--;
            } else if (this.intervals[i].start < start) {
                // Move the beginging.
                this.intervals[i].start = start;
            } else {
                break;
            }
        }
        for (let i = this.intervals.length - 1; i >= 0; i--) {
            if (this.intervals[i].start > end) {
                // Remove it.
                this.intervals.splice(i, 1);
            } else if (this.intervals[i].end > end) {
                // Move the begining.
                this.intervals[i].end = end;
            } else {
                break;
            }
        }
    }

    fill(running: running, end: Date) {
        // Fill the space at the end with the running interval.
        if (this.intervals.length > 0) {
            let last = this.intervals[this.intervals.length - 1];
            if (last.end < end) {
                // If it's already defined as running, just extend it.
                if (last.title == running.title) {
                    last.end = end;
                } else {
                    let interval: interval = {
                        id: -1,
                        title: running.title,
                        start: last.end,
                        end: end
                    }
                    this.intervals.push(interval);
                }
            }
        } else {
            let interval: interval = {
                id: -1,
                title: running.title,
                start: new Date(0),
                end: end
            }
            this.intervals.push(interval);
        }
    }

    private cutOverlaps() {
        this.intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

        let s: interval[] = [];
        let starts = [];

        let t = 0;

        this.intervals.forEach((e) => {
            // Bring t to the start of this interval.
            while (s.length > 0 && t < e.start.getTime()) {
                let i = s.pop() as interval;
                // If passed.
                if (i.end.getTime() < t) {
                    continue;
                }
                // This is the next start.
                starts.push({"start": t, "ref": i}); 
                t = i.end.getTime();
                // If the interval is not passed, keep it in the stack.
                if (t > e.start.getTime()) {
                    t = e.start.getTime();
                    s.push(i);
                }
            }
            // Add the interval to the stack.
            t = e.start.getTime();
            s.push(e);
        });

        // Now clear the stack.
        while (s.length > 0) {
            let i = s.pop() as interval;
            // If passed.
            if (i.end.getTime() < t) {
                continue;
            }
            // This is the next start.
            starts.push({"start": t, "ref": i}); 
            t = i.end.getTime();
        }

        // Finally convert tointervals.
        this.intervals = [];
        for (let i = 0; i < starts.length; i++) {
            let ref = starts[i].ref;
            let start = starts[i].start;
            let next;
            if (i < starts.length - 1) {
                // Leave a gap if there is a gap.
                next = Math.min(starts[i + 1].start, ref.end.getTime());
            } else {
                next = ref.end;
            }
            this.intervals.push({
                id: ref.id,
                title: ref.title,
                start: new Date(start),
                end: new Date(next)
            });
        }
    }

    toObject(): serializableTimeline {
        return { intervals: this.intervals };
    }

    static fromSerializable(serializable: serializableTimeline): Timeline {
        return new Timeline(serializable.intervals);
    }
}

export type serializableTimeline = {
    intervals: interval[];
};
