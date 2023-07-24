import Timeline from './Timeline';

export interface interval {
  title: string;
  start: Date;
  end: Date;
  id: number;
}

export interface running {
  title: string;
  start: Date;
  end?: Date;
  fallback?: string;
}

export interface settings {
  [key: string]: any;
}

export class State {
    timeline: Timeline;
    running: running;
    settings: settings;

    constructor(timeline: Timeline, running: running, settings: settings) {
        this.timeline = timeline;
        this.running = running;
        this.settings = settings;
    }

    speculate(end: number): void {
        this.timeline.fill(this.running, end);
    }

    static fromSerializable(serializable: serializableState): State {
        return new State(
            Timeline.fromSerializable(serializable.timeline),
            serializable.running,
            serializable.settings
        );
    }

    static empty(): State {
        return new State(
            new Timeline([]),
            { title: "", start: new Date(0)},
            {}
        );
    }

    clone(): State {
        return State.fromSerializable(this.toObject());
    }

    private toObject(): serializableState {
        let d: serializableState = {
            timeline: {intervals: this.timeline.getIntervals()},
            running: this.running,
            settings: this.settings
        };
        return JSON.parse(JSON.stringify(d));
    }
}

export type serializableState = {
    timeline: {intervals: interval[]};
    running: running;
    settings: settings;
}

export interface apiKey {
  apiKey: string;
}
