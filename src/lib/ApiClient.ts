import type { interval, settings, running } from '$lib/types';
import { State } from '$lib/types';
import type { Timeline } from '$lib/Timeline';
import { derived, writable, get } from 'svelte/store';
import type { Writable, Subscriber } from 'svelte/store';

import type { Router } from '$lib/trpc/router';
import { createTRPCClient, type TRPCClientInit } from 'trpc-sveltekit';

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}


enum previewModes {
    edit,
    add,
    none
}

type trpcClient = ReturnType<typeof createTRPCClient<Router>>;

export default class ApiClient {
    private state: State;
    private pullInterval: ReturnType<typeof setInterval>;
    private updateInterval: ReturnType<typeof setInterval>;

    private previewMode: previewModes = previewModes.none;
    private previewSettings: settings | undefined;
    private previewInterval: interval | undefined;

    private updateTimestamp: Writable<number> = writable(0);
    private previewUpdates: Writable<number> = writable(0);

    // Keep track of requested starts and ends for the timelines.
    private lastEnd: number = Date.now();
    private lastStart: number = Date.now() - 20 * 60 * 60 * 1000;

    private syncQueue: Promise<State>;
    private readyQueue: Promise<State>;

    private trpc: trpcClient

    constructor(trpc: trpcClient, state: State | undefined = undefined, pullInterval: number = 60000, updateInterval: number = 10000) {
        this.trpc = trpc;

        this.state = State.empty();
        this.syncQueue = Promise.resolve(this.state.clone());

        if (typeof state == "undefined") {
            // Get the state from local storage, or pull it from the server.
            let loaded = false;
            if (typeof localStorage != "undefined") {
                console.log("Loading state from local storage.");
                var s = localStorage.getItem("apiclient.state");
                try {
                    if (s != null) {
                        this.state = State.fromSerializable(JSON.parse(s));
                        loaded = true;
                    }
                } catch (e) {
                    console.log("Failed to parse state from local storage.");
                    console.log(e);
                }
            }
            if (!loaded) {
                // Pull the state from the server.
                this.readyQueue = this.pullState();
            } else {
                this.readyQueue = this.syncQueue;
            }
        } else {
            // Set this state.
            console.log("using provided state.");
            this.commit(Date.now(), state.clone());
            this.readyQueue = this.syncQueue;
        }
        // Start the pull intervals.
        this.pullInterval = setInterval(() => this.pullState(), pullInterval);
        // Start the update interval.
        this.updateInterval = setInterval(() => this.updateState(), updateInterval);
    }

    close() {
        clearInterval(this.pullInterval);
        clearInterval(this.updateInterval);
    }

    getSyncQueue(): Promise<State> {
        return this.syncQueue;
    }

    getReadyQueue(): Promise<State> {
        return this.readyQueue;
    }

    /*
     * Can subscribe to updates to the state, and to previews.
     */
    subscribe(f: Subscriber<any>) {
        return derived([this.updateTimestamp, this.previewUpdates as Writable<number>], ([lc, pu]) => [lc, pu]).subscribe(f);
    }

    private commit(maxTimestamp: number, state: State): State {
        if (maxTimestamp <= get(this.updateTimestamp)) {
            console.log("Pull failed, state was updated locally.");
        } else {
            this.updateTimestamp.set(maxTimestamp);
            this.state = state;
        }
        return this.state;
    }

    /*
     * Pull the entire state from the server.
     * Should add to the sync queue.
     */
    private pullState(): Promise<State> {
        this.syncQueue = this.syncQueue.then(async () => {
            console.log("Pulling full state from server.");
            let start = Date.now();
            let state = await this.trpc.getState.query({ start: this.lastStart, end: this.lastEnd });
            return this.commit(start, state);
        });
        return this.syncQueue;
    }

    /*
     * Pull most likely update infrom from the server.
     * Should add to the sync queue.
     */
    private updateState(): Promise<State> {
        this.syncQueue = this.syncQueue.then(async () => {
            let start = Date.now();
            console.log("Updateing state from server.");
            let state = this.state.clone();
            state.running = await this.trpc.getRunning.query();
            return this.commit(start, state);
        });
        return this.syncQueue;
    }

    previewAdd(interval: interval) {
        let i = deepClone(interval);
        this.previewMode = previewModes.add;
        this.previewSettings = deepClone(this.state.settings);
        this.previewInterval = i;
    }

    previewEdit(interval: interval) {
        let i = deepClone(interval);
        this.previewMode = previewModes.edit;
        this.previewSettings = deepClone(this.state.settings);
        this.previewInterval = i;
    }

    isPreviewAdd() {
        return this.previewMode == previewModes.add;
    }

    isPreviewEdit() {
        return this.previewMode == previewModes.edit;
    }

    isPreview() {
        return this.previewMode != previewModes.none;
    }

    getPreviewInterval(): interval {
        if (this.isPreview() && typeof this.previewInterval != "undefined") {
            return deepClone(this.previewInterval);
        } else {
            throw new Error("Not in preview mode.");
        }
    }

    stopPreview() {
        this.previewMode = previewModes.none;
        this.previewSettings = undefined;
        this.previewInterval = undefined;
    }

    getSettings(): settings {
        if (this.isPreview() && typeof this.previewSettings != "undefined") {
            return deepClone(this.previewSettings);
        }
        return deepClone(this.state.settings);
    }

    getSetting(key: string): any {
        return this.getSettings()[key];
    }

    setSettings(settings: settings): Promise<State> {
        let state = this.state.clone();
        if (this.isPreview()) {
            this.previewSettings = settings;
            state.settings = settings;
            return Promise.resolve(state);
        } else {
            state.settings = settings;
            this.commit(Date.now(), state);
            // TODO: Push to server.
            return this.syncQueue;
        }
    }

    setSetting(key: string, value: any): Promise<State> {
        let settings = this.getSettings();
        settings[key] = deepClone(value);
        return this.setSettings(settings);
    }

    getRunning(): running {
        let now = Date.now();
        let running = deepClone(this.state.running);
        // Proactively move to the fallback if we can/should.
        if (typeof running.end == "undefined" || running.end > now || typeof running.fallback == "undefined") {
            return running;
        } else {
            return { title: running.fallback, start: running.end }
        }
    }

    setRunning(running: running): Promise<State> {
        let state = this.state.clone();
        state.running = running;
        this.commit(Date.now(), state);
        // TODO: Push to server.
        return this.syncQueue;
    }

    getTimeline(start: number | undefined = undefined, end: number | undefined = undefined): Timeline {
        let state = this.state.clone()

        if (typeof start == "undefined" || typeof end == "undefined") {
            start = this.lastStart;
            end = this.lastEnd;
        } else {
            this.lastStart = start;
            this.lastEnd = end;
        }

        if (typeof this.previewInterval != "undefined") {
            if (this.isPreviewAdd()) {
                state.timeline.add(this.previewInterval);
            } else if (this.isPreviewEdit()) {
                state.timeline.update(this.previewInterval);
            }
        }

        state.timeline.trim(start, end);
        state.speculate(end);

        return state.timeline;
    }

    timelineAdd(interval: interval | undefined = undefined): Promise<State> {
        if (typeof interval == "undefined") {
            interval = this.getPreviewInterval();
        }
        let state = this.state.clone();
        state.timeline.update(interval);
        this.commit(Date.now(), state);
        // TODO: Push to server.
        return this.syncQueue;
    }

    timelineUpdate(interval: interval | undefined = undefined): Promise<State> {
        if (typeof interval == "undefined") {
            interval = this.getPreviewInterval();
        }
        let state = this.state.clone();
        state.timeline.update(interval);
        this.commit(Date.now(), state);
        // TODO: Push to server.
        return this.syncQueue;
    }
}
