import { Timeline } from './Timeline';

export interface interval {
  title: string;
  start: number;
  end: number;
  id: string;
}

export interface running {
  title: string;
  start: number;
  end?: number;
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
            new Timeline(serializable.timeline),
            serializable.running,
            serializable.settings
        );
    }

    static empty(): State {
        return new State(
            new Timeline([]),
            { title: "", start: 0 },
            {}
        );
    }

    clone(): State {
        return State.fromSerializable(this.toObject());
    }

    private toObject(): serializableState {
        let d = {
            timeline: this.timeline.intervals,
            running: this.running,
            settings: this.settings
        };
        return JSON.parse(JSON.stringify(d));
    }
}

export type serializableState = {
    timeline: interval[];
    running: running;
    settings: settings;
}

export interface apiKey {
  apiKey: string;
}

import type { Auth0Client, User } from '@auth0/auth0-spa-js';

export interface authDef {
  authClient: Auth0Client | undefined,
  isAuthenticated: boolean,
  userProfile: User | undefined,
  accessToken: string | undefined
}
