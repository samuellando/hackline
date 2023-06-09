import type { interval, settings, running, timeline } from '$lib/types';
import { writable, get, derived } from 'svelte/store';
import type { Writable, Subscriber } from 'svelte/store';

import { BaseClient } from '$lib/BaseClient';
import { findMissingRanges, mergeTimelines } from '$lib/TimelineUtils';

enum endpoints {
    settings = "settings",
    timeline = "timeline",
    running = "running"
}

type endpointTypes = {
    settings: settings | null;
    timeline: timeline | null;
    running: running | null;
};

// Combine all the data from all the endpoints.
type data = {
    [key in endpoints]: key extends keyof endpointTypes ? endpointTypes[key] : never;
}

// A promise for each endpoint.
type promises = {
    [key in endpoints]: Promise<key extends keyof endpointTypes ? endpointTypes[key] : never>;
}

// A metadata for each endpoint, used to store the last change time.
type meta = {
    [key in endpoints]: number
}

// Helper function to avoid side effects.
function deepClone<T>(e: T): T {
    return JSON.parse(JSON.stringify(e));
}

// For subscribing to updates.
type store = {
    subscribe: Function,
    set: Function,
    update: Function
}

/*
 * This class provides a easy to use abstraction for the backend. It handles:
 * 1. Syncing with all the endpoints.
 * 2. Handling preview modes for adding and edditing intervals on the timeline.
 * 3. Providing subscriptions for the frontend code to listen to updates on.
 */
export class ApiClient extends BaseClient {
    data: data;
    pullInterval: ReturnType<typeof setInterval>;
    updateInterval: ReturnType<typeof setInterval>;
    /*
     * These can be used to chain promises for each data element. That way we can ensure the operations do not run concurently.
     */
    promises: promises;
    /*
     * Commit promises ensure that when we write data locally, we are not overwriting a more recent data, chaining promises onto it 
     * allows monitoring and updating lastChange without any race conditions. 
     * Specifically for the following:
     * 1. Read table -> takes 5 secounds -> commits.
     * 2. At the same time we update the table -> commits locally imedietly -> does whatever it needs to do to sync.
     * 3. after 5 secounds, the data recieved from the read operation will be discarded because lastChange > start time of the read.
     */
    commitPromises: promises;
    /*
     * Used when there is no local data saved, allowing for the frontend to keep "loading"
     */
    readyWaiting: Promise<any>[];
    /*
     * What is currently syncing, for PUSHES
     */
    syncing: meta;

    /*
     * When editing or adding (preview mode) keep track of the intervals, and cache the settings
     */
    adding: interval | null; // The current adding interval
    editing: interval | null; // The current editing interval
    previewSettings: settings | null; // The settings from preview mode.

    /*
     * Stores used for subscriptions.
     */
    lastChange: Writable<meta>;
    previewUpdates: store;

    lastStart: number;
    lastEnd: number;
    timelinePadding: number;

    constructor(apiUrl: string, accessToken: string | undefined = undefined, refresh_interval = 60000, update_interval = 10000, timelinePadding = 2) {
        super(apiUrl, accessToken);
        this.adding = null;
        this.editing = null;
        this.previewSettings = null;
        this.readyWaiting = [];
        this.timelinePadding = timelinePadding;

        this.data = Object.fromEntries(
            Object.values(endpoints).map(key => [key, null])
        ) as data;

        this.promises = Object.fromEntries(
            Object.values(endpoints).map(key => [key, Promise.resolve(null)])
        ) as promises;

        this.commitPromises = Object.fromEntries(
            Object.values(endpoints).map(key => [key, Promise.resolve(null)])
        ) as promises;

        this.lastChange = writable(Object.fromEntries(
            Object.values(endpoints).map(key => [key, 0])
        ) as meta);

        this.syncing = Object.fromEntries(
            Object.values(endpoints).map(key => [key, 0])
        ) as meta;

        let { subscribe, set, update } = writable(0);
        this.previewUpdates = {
            subscribe,
            set,
            update: () => update((n) => n + 1)
        }

        // Default to one day.
        this.lastEnd = (new Date()).getTime();
        this.lastStart = (new Date()).getTime() - 1000 * 60 * 60 * 24;

        // Try to load the data from local storage, and start a new pull.
        for (const k in endpoints) {
            var s = localStorage.getItem(k);
            let p;
            if (k as endpoints == endpoints.timeline) {
                p = this.pullTimeline();
            } else {
                p = this.pullData(k as endpoints);
            }
            if (s != null) {
                this.data[k as endpoints] = JSON.parse(s);
            } else {
                this.readyWaiting.push(p);
            }
        }

        // Set up the pull and update intervals. 
        this.pullInterval = setInterval(() => {
            for (const k in endpoints) {
                if (k as endpoints == endpoints.timeline) {
                    this.pullTimeline();
                } else {
                    this.pullData(k as endpoints);
                }
            }
        }, refresh_interval);

        this.updateInterval = setInterval(() => {
            this.pullData(endpoints.running);
            this.updateTimeline();
        }, update_interval);
    }

    /*
     * Does the client have at least some data?
     */
    async ready() {
        await Promise.all(this.readyWaiting)
    }

    close(): void {
        clearInterval(this.pullInterval);
        clearInterval(this.updateInterval);
    }

    /*
     * Frontent components can use this to subscribe to updates and update right away.
     */
    subscribe(f: Subscriber<any>) {
        return derived([this.lastChange, this.previewUpdates as Writable<number>], ([lc, pu]) => [lc, pu]).subscribe(f);
    }

    /*
     * This method commits data to local storage and memory. 
     * It cheacks that it was not updated during operation, for example for a long read.
     */
    private commit<T extends endpoints>(k: T, data: endpointTypes[T], asOf: number = (new Date()).getTime()): promises[T] {
        this.commitPromises[k] = this.commitPromises[k].then(() => {
            let lc = get(this.lastChange);
            if (lc[k] > asOf) {
                console.error("Cannot change value", k, "Value has already been overwriten locally.")
                return this.data[k];
            }
            lc[k] = (new Date()).getTime();
            this.data[k] = data;
            localStorage.setItem(k, JSON.stringify(this.data[k]));
            // Triggers subsribers.
            this.lastChange.set(lc);
            return data;
        }) as promises[T];
        return this.commitPromises[k];
    }

    /*
     * This method pulls data from the server, and commits.
     */
    private pullData<T extends endpoints>(k: T): promises[T] {
        this.syncing[k]++;
        // Since we don't want concurent reads, chain this promise.
        return this.promises[k].then(async () => {
            // We want to discard the commit if the data gets updates during the read.
            var limit = (new Date()).getTime();
            console.log("pulling", k);
            return await this.get<endpointTypes[T]>(k, null).then(async (res) => {
                console.log("Done pulling", k, "and commiting.");
                await this.commit(k, res, limit);
                this.syncing[k]--;
                return res;
            }, () => { console.error("Failed to pull", k); return this.data[k]; });
        }) as promises[T];
    }

    /*
     * Refresh eveything between the bounds
     */
    private pullTimeline(start: number | undefined = undefined, end: number | undefined = undefined): promises[endpoints.timeline] {
        // If no bounds are given, use the last ones pulled from the frontend.
        if (typeof start == "undefined" || typeof end == "undefined") {
            start = this.lastStart;
            end = this.lastEnd;
        }
        // Add the required padding.
        let padding = ((end - start) * this.timelinePadding - (end - start)) / 2
        start -= padding;
        end += padding;
        this.syncing.timeline++;
        return this.promises.timeline.then(async () => {
            var limit = (new Date()).getTime();
            console.log("pulling timeline", new Date(start as number), new Date(end as number));
            return await this.get<timeline>(endpoints.timeline, { start: start, end: end }).then(async (res) => {
                console.log("Done pulling timeline and commiting.");
                await this.commit(endpoints.timeline, res, limit);
                this.syncing.timeline--;
                return res;
            }, () => { console.error("Failed to pull timeline"); return this.data.timeline; });
        });
    }

    /*
     * Pull the timeline, but only what is missing.
     */
    private updateTimeline(start: number | undefined = undefined, end: number | undefined = undefined): promises[endpoints.timeline] {
        if (typeof start == "undefined" || typeof end == "undefined") {
            start = this.lastStart;
            end = this.lastEnd;
        }
        // Add the required padding.
        let padding = ((end - start) * this.timelinePadding - (end - start)) / 2
        start -= padding;
        end += padding;
        let gaps = findMissingRanges(start, end, this.data.timeline);
        gaps.forEach((gap) => {
            this.promises.timeline = this.promises.timeline.then(async () => {
                // This is the max commit time.
                console.log("Pulling GAP", new Date(gap.start), new Date(gap.end));
                var limit = (new Date()).getTime();
                return await this.get<timeline>(endpoints.timeline, { start: start, end: end }).then(async (res) => {
                    console.log("Done pulling", gap, "and mergeing and commiting.");
                    let tl = mergeTimelines(this.data.timeline, res);
                    await this.commit(endpoints.timeline, tl, limit);
                    return res;
                }, () => { console.error("Failed to pull", gap); return this.data.timeline; });
            });
        });
        return this.promises.timeline;
    }

    /*
     * Get the currently syncing endpoints.
     */
    getSyncing(): { [id: string]: number } {
        let d: { [id: string]: number } = {};
        for (const k in endpoints) {
            if (this.syncing[k as endpoints] != 0) {
                d[k] = this.syncing[k as endpoints];
            }
        }
        return d;
    }

    getSettings(): settings {
        // If in preview mode, return the preview settings.
        if (this.isPreview()) {
            // Check if it's been initialized.
            if (this.previewSettings == null) {
                if (this.data.settings == null) {
                    this.previewSettings = {};
                    return {};
                } else {
                    this.previewSettings = deepClone(this.data.settings);
                }
            }
            return deepClone(this.previewSettings);
        }
        if (this.data.settings === null) {
            return {};
        }
        return deepClone<settings>(this.data.settings);
    }

    getSetting(key: string) {
        let settings = this.getSettings();
        if (key in settings) {
            return settings[key];
        } else {
            return null;
        }
    }

    setSettings(value: settings): promises[endpoints.settings] {
        if (this.isPreview()) {
            this.previewSettings = value;
            this.previewUpdates.update();
            return Promise.resolve(deepClone(this.previewSettings));
        }
        this.syncing.settings++;
        this.commit(endpoints.settings, value, (new Date()).getTime());
        this.promises.settings = this.promises.settings.then(async () => {
            let settings = await this.put<settings>('settings', value)
            this.syncing.settings--;
            return settings;
        });
        return this.promises.settings;
    }

    setSetting(key: string, value: any): promises[endpoints.settings] {
        let settings = this.getSettings();
        settings[key] = value;
        if (this.isPreview()) {
            this.previewSettings = settings;
            this.previewUpdates.update();
            return Promise.resolve(deepClone(this.previewSettings));
        }
        this.syncing.settings++;
        this.commit(endpoints.settings, settings, (new Date()).getTime());
        this.promises.settings = this.promises.settings.then(async () => {
            let data = {} as settings;
            data[key] = value;
            let settings = await this.patch<settings>('settings', data)
            this.syncing.settings--;
            return settings;
        });
        return this.promises.settings;
    }

    getRunning(): running | null {
        if (this.data.running === null) return null;
        let running = deepClone<running>(this.data.running);
        let now = (new Date()).getTime();
        // Proactively move to the fallback if we can/should.
        if (typeof running.end == "undefined" || running.end > now || typeof running.fallback == "undefined") {
            return running;
        } else {
            return { title: running.fallback, start: running.end }
        }
    }

    setRunning(title: string, start: number = (new Date()).getTime()): promises[endpoints.running] {
        this.syncing.running++;
        let r: running = { title: title, start: start };
        this.commit(endpoints.running, r, start);
        this.promises.running = this.promises.running.then(async () => {
            let running = await this.put<running>('running', r);
            this.syncing.running--;
            return running;
        });
        return this.promises.running;
    }

    getTimeline(start: number | undefined = undefined, end: number | undefined = undefined): timeline {
        if (typeof start != "undefined" && typeof end != "undefined") {
            this.lastStart = start;
            this.lastEnd = end;
        }
        if (this.data.timeline === null) return [];
        let timeline = deepClone<timeline>(this.data.timeline);
        // Splice the timeline we have to the requested range.
        if (typeof start !== "undefined") {
            for (let i = 0; i < timeline.length; i++) {
                if (timeline[i].end < start) {
                    // Remove it.
                    timeline.splice(i, 1);
                    i--;
                } else if (timeline[i].start < start) {
                    // Move the beginging.
                    timeline[i].start = start;
                } else {
                    break;
                }
            }
        }
        if (typeof end !== "undefined") {
            for (let i = timeline.length - 1; i >= 0; i--) {
                if (timeline[i].start > end) {
                    // Remove it.
                    timeline.splice(i, 1);
                } else if (timeline[i].end > end) {
                    // Move the begining.
                    timeline[i].end = end;
                } else {
                    break;
                }
            }
        }
        // Fill the space at the end with the running interval.
        if (timeline.length > 0 && typeof end !== "undefined") {
            let last = timeline[timeline.length - 1];
            if (last.end < end) {
                // If it's already defined as running, just extend it.
                if (last.id == "running") {
                    last.end = end;
                } else {
                    let running = this.getRunning();
                    if (running !== null) {
                        if (running.title == last.title) {
                            last.end = end;
                        } else {
                            running.start = last.end;
                            running.end = end;
                            let interval = running as interval;
                            interval.id = "running";
                            timeline.push(interval);
                        }
                    }
                }
            }
        }

        if (this.isPreviewAdding()) {
            return this.timelinePreviewAdd(this.adding as interval, start, end, timeline);
        } else if (this.isPreviewEditing()) {
            return this.timelinePreviewEdit(this.editing as interval, start, end, timeline);
        } else {
            return timeline;
        }
    }

    /*
     * Actually add an interval to the timeline.
     */
    timelineAdd(log: interval | undefined = undefined): promises[endpoints.timeline] {
        if (typeof log == 'undefined') {
            if (this.isPreviewAdding()) {
                log = this.adding as interval;
            } else {
                throw new Error('TimlineAdd requires a parameter or preview adding mode.')
            }
        }
        this.syncing.timeline++;
        var limit = (new Date()).getTime();
        var timeline = this.timelinePreviewAdd(log);
        this.stopPreview();
        this.commit(endpoints.timeline, timeline, limit);
        this.promises.timeline = this.promises.timeline.then(async () => {
            await this.post<interval>('timeline', log as interval);
            this.syncing.timeline--;
            return timeline;
        });
        return this.promises.timeline;
    }

    /*
     * Actually edit an interval on the timeline.
     */
    timelineEdit(log: interval | undefined = undefined): promises[endpoints.timeline] {
        if (typeof log == 'undefined') {
            if (this.isPreviewEditing()) {
                log = this.editing as interval;
                this.stopPreview();
            } else {
                throw new Error('TimlineEdit requires a parameter or preview  mode.')
            }
        }
        this.syncing.timeline++;
        let id = log.id;
        var limit = (new Date()).getTime();
        var timeline = this.getTimeline();
        timeline.forEach((e: interval) => {
            if (e.id == id) {
                e.title = (log as interval).title;
            }
        });
        this.commit(endpoints.timeline, timeline, limit);
        this.promises.timeline = this.promises.timeline.then(async () => {
            await this.patch('timeline/' + id, { title: (log as interval).title })
            this.syncing.timeline--;
            return timeline;
        });
        return this.promises.timeline;
    }

    isPreview(): boolean {
        return this.isPreviewAdding() || this.isPreviewEditing();
    }

    isPreviewAdding(): boolean {
        return this.adding != null;
    }

    isPreviewEditing(): boolean {
        return this.editing != null;
    }

    stopPreview() {
        this.adding = null;
        this.editing = null;
        this.previewSettings = null;
        this.previewUpdates.update();
    }

    getPreviewAddingInterval(): interval {
        if (this.isPreviewAdding()) {
            return this.adding as interval;
        } else {
            throw new Error("Not adding");
        }
    }

    getPreviewEditingInterval(): interval {
        if (this.isPreviewEditing()) {
            return this.editing as interval;
        } else {
            throw new Error("Not editing");
        }
    }

    /*
     * Preview adding an interval to the timeline. Swtich to preview mode.
     */
    timelinePreviewAdd(log: interval, start: number | undefined = undefined, end: number | undefined = undefined, tl: timeline | undefined = undefined): timeline {
        let timeline: timeline;
        this.adding = deepClone(log);
        if (typeof tl === 'undefined') {
            timeline = this.getTimeline(start, end);
            this.previewUpdates.update();
        } else {
            timeline = deepClone(tl);
        }
        // Cut existing intervals around the new one.
        for (let i = 0; i < timeline.length; i++) {
            let e = timeline[i];
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
            c = c | (e.start > log.start ? 0b1000 : 0);
            c = c | (e.end > log.start ? 0b0100 : 0);
            c = c | (e.start > log.end ? 0b0010 : 0);
            c = c | (e.end > log.end ? 0b0001 : 0);

            switch (c) {
                case 0b0100:
                    e.end = log.start;
                    break;
                case 0b1100:
                    timeline.splice(i, 1);
                    i--;
                    break;
                case 0b1101:
                    e.start = log.end;
                    break;
                case 0b0101:
                    let n = JSON.parse(JSON.stringify(e));
                    e.end = log.start;
                    n.start = log.end;
                    timeline.splice(i + 1, 0, n);
                    i++;
                    break;
            }
        }
        // Insert the new interval into the timeline.
        var inserted = false
        for (let i = 0; i < timeline.length; i++) {
            if (timeline[i].start >= log.end) {
                timeline.splice(i, 0, log);
                inserted = true;
                break;
            }
        }
        // If it wasnt insereted, add to the end.
        if (!inserted) {
            timeline.push(log);
        }
        return timeline;
    }

    /*
     * Preview an edit to the timeline, switch to edit mode.
     */
    timelinePreviewEdit(log: interval, start: number | undefined = undefined, end: number | undefined = undefined, tl: timeline | undefined = undefined): timeline {
        let timeline: timeline;
        this.editing = deepClone(log);
        // Allows to pass a timeline, or use the current one.
        if (typeof tl === 'undefined') {
            timeline = this.getTimeline(start, end);
            this.previewUpdates.update();
        } else {
            timeline = deepClone(tl);
        }
        // Find the interval, and update the title.
        timeline.forEach((e: interval) => {
            if (e.id == log.id) {
                e.title = (log).title;
            }
        });
        return timeline;
    }
}
