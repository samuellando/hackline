import type { interval, running } from './types';

export class Timeline {
    intervals: interval[];

    constructor(intervals: interval[]) {
        this.intervals = intervals;
        this.cutOverlaps();
    }

    add(interval: interval) {
    }

    update(interval: interval) {
    }

    trim(start: number, end: number) {
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

    fill(running: running, end: number) {
        // Fill the space at the end with the running interval.
        if (this.intervals.length > 0) {
            let last = this.intervals[this.intervals.length - 1];
            if (last.end < end) {
                // If it's already defined as running, just extend it.
                if (last.id == "running") {
                    last.end = end;
                } else {
                    if (running.title == last.title) {
                        last.end = end;
                    } else {
                        let interval: interval = {
                            id: "running",
                            title: running.title,
                            start: last.start,
                            end: end
                        }
                        this.add(interval);
                    }
                }
            }
        }
    }

    private cutOverlaps() {
    }

    private toObject() {
        return {intervals: this.intervals};
    }


    static fromSerializable(serializable: {intervals: interval[]}): Timeline {
        return new Timeline(serializable.intervals);
    }
}
