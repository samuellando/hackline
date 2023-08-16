import type { interval, settings, running, settingsValue } from '$lib/types';
import State from '$lib/State';
import Timeline from '$lib/Timeline';
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
	settings,
	none
}

type trpcClient = ReturnType<typeof createTRPCClient<Router>>;

/**
 * A client for the API.
 *
 * This class handles the communication with the API, and keeps track of the state of the app.
 */
export default class ApiClient {
	private state: State;
	private pullInterval: ReturnType<typeof setInterval> | null = null;
	private updateInterval: ReturnType<typeof setInterval> | null = null;

	private previewMode: previewModes = previewModes.none;
	private previewState: State | undefined;
	private previewInterval: interval | undefined;

	private updateTimestamp: Writable<Date> = writable(new Date(0));
	private previewUpdates: Writable<number> = writable(0);

	// Keep track of requested starts and ends for the timelines.
	private lastEnd: number = Date.now();
	private lastStart: number = Date.now() - 20 * 60 * 60 * 1000;

	private syncQueue: Promise<State>;
	private readyQueue: Promise<State>;

	private trpc: trpcClient | undefined;

	private padding: number;

	/**
	 * @param trpc The trpc client to use,optional if you don't want to connect to the server.
	 * @param state The state to use, optional if you want to load it from local storage, or sync with the server.
	 * @param pullInterval The interval to pull the full state from the server, in milliseconds.
	 *                  Set to -1 to disable pulling.
	 * @param updateInterval The interval to update the out of sync, missing and running from the server, in milliseconds.
	 *                  Set to -1 to disable updating.
	 * @param padding The padding to use when pulling the timeline from the server, as a multiple of the current timeline length.
	 */
	constructor(
		trpc?: trpcClient,
		state?: State,
		pullInterval = 60000,
		updateInterval = 10000,
		padding = 2
	) {
		this.trpc = trpc;
		this.padding = padding;

		this.state = State.empty();
		this.syncQueue = Promise.resolve(this.state);

		// If no state is provided, try to load if from memory, or sync with the server.
		if (!state) {
			let loaded = false;
			if (typeof localStorage != 'undefined') {
				console.log('Loading state from local storage.');
				const s = localStorage.getItem('apiclient.state');
				try {
					if (s != null) {
						this.state = State.fromSerializable(JSON.parse(s));
						loaded = true;
					}
				} catch (e) {
					console.log('Failed to parse state from local storage.');
					console.log(e);
				}
			}
			if (!loaded) {
				this.readyQueue = this.pullState();
			} else {
				this.readyQueue = this.syncQueue;
			}
		} else {
			// Set this state.
			console.log('using provided state.');
			this.commit(new Date(), state);
			this.readyQueue = this.syncQueue;
		}
		if (this.trpc) {
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
	subscribe(f: Subscriber<(number | Date)[]>) {
		return derived([this.updateTimestamp, this.previewUpdates as Writable<number>], ([lc, pu]) => [
			lc,
			pu
		]).subscribe(f);
	}

	private commit(maxTimestamp: Date, state: State): State {
		if (maxTimestamp <= get(this.updateTimestamp)) {
			console.log('Commit failed, state was updated locally.');
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
			console.log('Pulling full state from server.');
			if (this.trpc) {
				const start = new Date();
				const duration = this.lastEnd - this.lastStart;
				const state = await this.trpc.getState.query({
					start: new Date(this.lastStart - duration * this.padding),
					end: new Date(this.lastEnd + duration * this.padding)
				});
				return this.commit(start, state);
			} else {
				return this.state;
			}
		});
		return this.syncQueue;
	}

	/*
	 * Pull most likely update infromation from the server.
	 * Should add to the sync queue.
	 */
	private updateState(): Promise<State> {
		this.syncQueue = this.syncQueue.then(async () => {
			console.log('Updateing state from server.');
			let state = this.state;
			if (this.trpc != null) {
				let start = new Date();
				const running = await this.trpc.getRunning.query();
				state = new State(state.timeline, running, state.settings);
				this.commit(start, state);
				const range = state.getTimeline().getOutOfSyncRange();
				if (range != null) {
					start = new Date();
					const tl2 = await this.trpc.getTimeline.query(range);
					const tl3 = state.timeline.merge(tl2);
					state = new State(tl3, running, state.settings);
					this.commit(start, state);
				}
				const duration = this.lastEnd - this.lastStart;
				const ranges = state.timeline.getMissingRanges(
					new Date(this.lastStart - duration * this.padding),
					new Date(this.lastEnd + duration * this.padding)
				);
				for (const range of ranges) {
					start = new Date();
					const tl2 = await this.trpc.getTimeline.query(range);
					const tl3 = state.timeline.merge(tl2);
					state = new State(tl3, running, state.settings);
					this.commit(start, state);
				}
			}
			return state;
		});
		return this.syncQueue;
	}

	previewAdd(interval: interval) {
		this.previewMode = previewModes.add;
		this.previewState = new State(
			this.state.timeline.add(interval),
			this.state.running,
			this.state.settings
		);
		this.previewInterval = interval;
		this.previewUpdates.update((n) => n + 1);
	}

	previewEdit(interval: interval) {
		this.previewMode = previewModes.edit;
		this.previewState = new State(
			this.state.timeline.update(interval),
			this.state.running,
			this.state.settings
		);
		this.previewInterval = interval;
		this.previewUpdates.update((n) => n + 1);
	}

	previewSettings() {
		this.previewMode = previewModes.settings;
		this.previewState = new State(this.state.timeline, this.state.running, this.state.settings);
		this.previewUpdates.update((n) => n + 1);
	}

	isPreviewAdd() {
		return this.previewMode == previewModes.add;
	}

	isPreviewEdit() {
		return this.previewMode == previewModes.edit;
	}

	isPreviewSettings() {
		return this.previewMode == previewModes.settings;
	}

	isPreview() {
		return this.previewMode != previewModes.none;
	}

	getPreviewInterval(): interval {
		if (this.isPreview() && typeof this.previewInterval != 'undefined') {
			return deepClone(this.previewInterval);
		} else {
			throw new Error('Not in valid preview mode.');
		}
	}

	stopPreview() {
		this.previewMode = previewModes.none;
		this.previewState = undefined;
		this.previewInterval = undefined;
		this.previewUpdates.update((n) => n + 1);
	}

	getBaseSettings(): settings {
		return this.state.settings;
	}

	getBaseSetting(key: string): settingsValue {
		return this.getBaseSettings()[key];
	}

	getSettings(): settings {
		if (this.isPreview() && typeof this.previewState != 'undefined') {
			return this.previewState.settings;
		}
		return this.state.settings;
	}

	getSetting(key: string): settingsValue {
		return this.getSettings()[key];
	}

	getSettingString(key: string): string {
		if (typeof this.getSettings()[key] == 'string') {
			return this.getSettings()[key] as string;
		} else {
			console.error('Setting is not a string.');
			return '';
		}
	}

	setSettings(settings: settings): Promise<State> {
		let state = this.state;
		if (this.isPreview() && typeof this.previewState != 'undefined') {
			this.previewState = new State(
				this.previewState.timeline,
				this.previewState.running,
				settings
			);
			this.previewUpdates.update((n) => n + 1);
			return Promise.resolve(this.previewState);
		} else {
			state = new State(state.timeline, state.running, settings);
			this.commit(new Date(), state);
			this.syncQueue = this.syncQueue.then(async () => {
				if (this.trpc != null) {
					await this.trpc.setSettings.mutate(settings);
				}
				this.commit(new Date(), state);
				return state;
			});
			return this.syncQueue;
		}
	}

	setSetting(key: string, value: settingsValue): Promise<State> {
		const settings = {
			...this.getSettings(),
			[key]: deepClone(value)
		};
		return this.setSettings(settings);
	}

	getRunning(): running {
		return this.state.getRunning();
	}

	setRunning(title: string): Promise<State> {
		const runningInterval = {
			title: this.state.running.title,
			start: this.state.running.start,
			end: new Date(),
			id: -1
		};
		const copy = this.state.timeline.intervals.slice();
		copy.push(runningInterval);
		const state = new State(
			new Timeline(copy),
			{
				title: title,
				start: new Date()
			},
			this.state.settings
		);
		this.syncQueue = this.syncQueue.then(async () => {
			if (this.trpc != null) {
				await this.trpc.setRunning.mutate({ title: title });
			}
			this.commit(new Date(), state);
			return state;
		});
		return this.syncQueue;
	}

	getTimeline(start?: Date, end?: Date): Timeline {
		if (!start || !end) {
			start = new Date(this.lastStart);
			end = new Date(this.lastEnd);
		} else {
			this.lastStart = start.getTime();
			this.lastEnd = end.getTime();
		}

		let tl = this.state.getTimeline(start, end);

		/* todo: fix this
        if (start.getTime() < tl.start.getTime() || end.getTime() > tl.end.getTime()) {
            console.log('Timeline is out of bounds. Fetching...');
            this.updateState();
        }
        */

		if (typeof this.previewInterval != 'undefined') {
			if (this.isPreviewAdd()) {
				tl = tl.add(this.previewInterval);
			} else if (this.isPreviewEdit()) {
				tl = tl.update(this.previewInterval);
			}
		}
		return tl;
	}

	timelineAdd(interval: interval | undefined = undefined): Promise<State> {
		let state: State;
		if (typeof interval === 'undefined') {
			if (typeof this.previewState != 'undefined') {
				this.commit(new Date(), this.previewState);
				state = this.previewState;
				interval = this.previewInterval;
			} else {
				throw new Error('No interval to add.');
			}
			this.stopPreview();
		} else {
			state = new State(this.state.timeline.add(interval), this.state.running, this.state.settings);
			this.commit(new Date(), state);
		}

		this.syncQueue = this.syncQueue.then(async () => {
			if (this.trpc != null) {
				const n = await this.trpc.addInterval.mutate(interval as interval);
				await this.trpc.setSettings.mutate(state.settings);
				// So that we have the most up to date ID.
				state = new State(state.timeline.add(n), state.running, state.settings);
				const range = state.timeline.getOutOfSyncRange();
				if (range != null) {
					const start = new Date();
					const tl2 = await this.trpc.getTimeline.query(range);
					state = new State(state.timeline.merge(tl2), state.running, state.settings);
					this.commit(start, state);
				}
			}
			return state;
		});
		return this.syncQueue;
	}

	timelineEdit(interval: interval | undefined = undefined): Promise<State> {
		let state: State;
		if (typeof interval === 'undefined') {
			if (typeof this.previewState != 'undefined') {
				this.commit(new Date(), this.previewState);
				state = this.previewState;
			} else {
				throw new Error('No interval to add.');
			}
			this.stopPreview();
		} else {
			state = new State(
				this.state.timeline.update(interval),
				this.state.running,
				this.state.settings
			);
			this.commit(new Date(), state);
		}

		this.syncQueue = this.syncQueue.then(async () => {
			if (this.trpc != null) {
				await this.trpc.updateInterval.mutate(interval as interval);
				await this.trpc.setSettings.mutate(state.settings);
			}
			return state;
		});
		return this.syncQueue;
	}
}
