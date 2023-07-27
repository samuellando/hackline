import type { interval, settings, running } from '$lib/types';
import State from '$lib/State';
import type Timeline from '$lib/Timeline';
import { derived, writable, get } from 'svelte/store';
import type { Writable, Subscriber } from 'svelte/store';

import type { Router } from '$lib/trpc/router';
import type { createTRPCClient } from 'trpc-sveltekit';
import transformer from '$lib/trpc/transformer';

function deepClone<T>(obj: T): T {
    return transformer.parse(transformer.stringify(obj));
}


enum previewModes {
    edit,
    add,
    none
}

type trpcClient = ReturnType<typeof createTRPCClient<Router>>;

export default class ApiClient {
    private state: State;
    private pullInterval: ReturnType<typeof setInterval> | null = null;
    private updateInterval: ReturnType<typeof setInterval> | null = null;

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

    private trpc: trpcClient | null

    constructor(trpc: trpcClient | null, state: State | undefined = undefined, pullInterval: number = 60000, updateInterval: number = 10000) {
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
        if (this.trpc != null) {
            // Start the pull intervals.
            this.pullInterval = setInterval(() => this.pullState(), pullInterval);
            // Start the update interval.
            this.updateInterval = setInterval(() => this.updateState(), updateInterval);
        }
    }

    close() {
        if (this.pullInterval != null) clearInterval(this.pullInterval);
        if (this.updateInterval != null) clearInterval(this.updateInterval);
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
            console.log("Commit failed, state was updated locally.");
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
            if (this.trpc != null) {
                let state = await this.trpc.getState.query({ start: new Date(this.lastStart), end: new Date(this.lastEnd) });
                return this.commit(start, state);
            } else {
                return this.state.clone();
            }
        });
        return this.syncQueue;
    }

    /*
     * Pull most likely update infrom from the server.
     * Should add to the sync queue.
     */
    private updateState(): Promise<State> {
        this.syncQueue = this.syncQueue.then(async () => {
            console.log("Updateing state from server.");
            let state = this.state.clone();
            if (this.trpc != null) {
                let start = Date.now();
                state.running = await this.trpc.getRunning.query();
                this.commit(start, state);
                let range = state.timeline.getOutOfSyncRange();
                if (range != null) {
                    start = Date.now();
                    let tl2 = await this.trpc.getTimeline.query(range);
                    state.timeline.merge(tl2);
                    this.commit(start, state);
                }
                let ranges = state.timeline.getMissingRanges(new Date(this.lastStart), new Date(this.lastEnd));
                for (let range of ranges) {
                    start = Date.now();
                    let tl2 = await this.trpc.getTimeline.query(range);
                    state.timeline.merge(tl2);
                    this.commit(start, state);
                }
                return state;
            } else {
                return state;
            }
        });
        return this.syncQueue;
    }

    previewAdd(interval: interval) {
        let i = deepClone(interval);
        this.previewMode = previewModes.add;
        this.previewSettings = deepClone(this.state.settings);
        this.previewInterval = i;
        this.previewUpdates.update(n => n + 1);
    }

    previewEdit(interval: interval) {
        let i = deepClone(interval);
        this.previewMode = previewModes.edit;
        this.previewSettings = deepClone(this.state.settings);
        this.previewInterval = i;
        this.previewUpdates.update(n => n + 1);
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
        this.previewUpdates.update(n => n + 1);
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
            this.previewUpdates.update(n => n + 1);
            return Promise.resolve(state);
        } else {
            state.settings = settings;
            this.commit(Date.now(), state);
            this.syncQueue = this.syncQueue.then(async () => {
                if (this.trpc != null) {
                    await this.trpc.setSettings.mutate(settings);
                }
                this.commit(Date.now(), state);
                return state;
            });
            return this.syncQueue;
        }
    }

    setSetting(key: string, value: any): Promise<State> {
        let settings = this.getSettings();
        settings[key] = deepClone(value);
        return this.setSettings(settings);
    }

    getRunning(): running {
        let state = this.state.clone();
        state.speculate(new Date());
        return state.running;
    }

    setRunning(title: string): Promise<State> {
        let state = this.state.clone();
        state.speculate(new Date());
        state.running = { title: title, start: new Date() };
        this.syncQueue = this.syncQueue.then(async () => {
            if (this.trpc != null) {
                await this.trpc.setRunning.mutate({ title: title });
            }
            this.commit(Date.now(), state);
            return state;
        });
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

        state.timeline.trim(new Date(start), new Date(end));
        state.speculate(new Date(end));

        return state.timeline;
    }

    timelineAdd(interval: interval | undefined = undefined): Promise<State> {
        if (typeof interval === "undefined") {
            interval = this.getPreviewInterval();
            this.stopPreview();
        }
        let state = this.state.clone();
        state.timeline.add(interval);
        this.syncQueue = this.syncQueue.then(async () => {
            this.commit(Date.now(), state);
            if (this.trpc != null) {
                let n = await this.trpc.addInterval.mutate(interval as interval);
                state.timeline.add(n);
                // So that we have the most up to date ID.
                this.commit(Date.now(), state);
                let range = state.timeline.getOutOfSyncRange();
                if (range != null) {
                    let tl2 = await this.trpc.getTimeline.query(range);
                    state.timeline.merge(tl2);
                    this.commit(Date.now(), state);
                }
            }
            return state;
        });
        return this.syncQueue;
    }

    timelineEdit(interval: interval | undefined = undefined): Promise<State> {
        if (typeof interval == "undefined") {
            interval = this.getPreviewInterval();
            this.stopPreview();
        }
        let state = this.state.clone();
        state.timeline.update(interval);
        this.syncQueue = this.syncQueue.then(async () => {
            if (this.trpc != null) {
                await this.trpc.updateInterval.mutate(interval as interval);
            }
            this.commit(Date.now(), state);
            return state;
        });
        return this.syncQueue;
    }
}
