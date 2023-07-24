import type { interval, running } from './types';

export default class Timeline {
    intervals: interval[];

    constructor(intervals: interval[]) {
        this.intervals = intervals;
        this.cutOverlaps();
    }

    getIntervals(): interval[] {
        return this.intervals;
    }

    add(interval: interval) {
    }

    update(interval: interval) {
    }

    trim(startMillis: number, endMillis: number) {
        let start = new Date(startMillis);
        let end = new Date(endMillis);
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

    fill(running: running, endMillis: number) {
        let end = new Date(endMillis);
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
                        start: last.start,
                        end: end
                    }
                    this.add(interval);
                }
            }
        }
    }

    private cutOverlaps() {
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
