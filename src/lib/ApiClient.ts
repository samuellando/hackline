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

	private trpc: trpcClient | null;

	constructor(
		trpc: trpcClient | null,
		state: State | undefined = undefined,
		pullInterval = 60000,
		updateInterval = 10000
	) {
		this.trpc = trpc;

		this.state = State.empty();
		this.syncQueue = Promise.resolve(this.state);

		if (typeof state == 'undefined') {
			// Get the state from local storage, or pull it from the server.
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
				// Pull the state from the server.
				this.readyQueue = this.pullState();
			} else {
				this.readyQueue = this.syncQueue;
			}
		} else {
			// Set this state.
			console.log('using provided state.');
			this.commit(Date.now(), state);
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
	subscribe(f: Subscriber<number[]>) {
		return derived([this.updateTimestamp, this.previewUpdates as Writable<number>], ([lc, pu]) => [
			lc,
			pu
		]).subscribe(f);
	}

	private commit(maxTimestamp: number, state: State): State {
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
			if (this.trpc != null) {
				const start = Date.now();
				const state = await this.trpc.getState.query({
					start: new Date(this.lastStart),
					end: new Date(this.lastEnd)
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
				let start = Date.now();
				const running = await this.trpc.getRunning.query();
				state = new State(state.timeline, running, state.settings);
				this.commit(start, state);
				const range = state.getTimeline().getOutOfSyncRange();
				if (range != null) {
					start = Date.now();
					const tl2 = await this.trpc.getTimeline.query(range);
					const tl3 = state.timeline.merge(tl2);
					state = new State(tl3, running, state.settings);
					this.commit(start, state);
				}
				const ranges = state.timeline.getMissingRanges(
					new Date(this.lastStart),
					new Date(this.lastEnd)
				);
				for (const range of ranges) {
					start = Date.now();
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
		const i = deepClone(interval);
		this.previewMode = previewModes.add;
		this.previewSettings = deepClone(this.state.settings);
		this.previewInterval = i;
		this.previewUpdates.update((n) => n + 1);
	}

	previewEdit(interval: interval) {
		const i = deepClone(interval);
		this.previewMode = previewModes.edit;
		this.previewSettings = deepClone(this.state.settings);
		this.previewInterval = i;
		this.previewUpdates.update((n) => n + 1);
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
		if (this.isPreview() && typeof this.previewInterval != 'undefined') {
			return deepClone(this.previewInterval);
		} else {
			throw new Error('Not in preview mode.');
		}
	}

	stopPreview() {
		this.previewMode = previewModes.none;
		this.previewSettings = undefined;
		this.previewInterval = undefined;
		this.previewUpdates.update((n) => n + 1);
	}

	getSettings(): settings {
		if (this.isPreview() && typeof this.previewSettings != 'undefined') {
			return this.previewSettings;
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
		if (this.isPreview()) {
			this.previewSettings = settings;
			state = new State(state.timeline, state.running, settings);
			this.previewUpdates.update((n) => n + 1);
			return Promise.resolve(state);
		} else {
			state = new State(state.timeline, state.running, settings);
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
			this.commit(Date.now(), state);
			return state;
		});
		return this.syncQueue;
	}

	getTimeline(start?: Date, end?: Date): Timeline {
		let tl = this.state.getTimeline(start, end);

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
		if (typeof interval === 'undefined') {
			interval = this.getPreviewInterval();
			this.stopPreview();
		}

		let state = new State(
			this.state.timeline.add(interval),
			this.state.running,
			this.state.settings
		);
		this.syncQueue = this.syncQueue.then(async () => {
			this.commit(Date.now(), state);
			if (this.trpc != null) {
				const n = await this.trpc.addInterval.mutate(interval as interval);
				// So that we have the most up to date ID.
				state = new State(state.timeline.add(n), state.running, state.settings);
				this.commit(Date.now(), state);
				const range = state.timeline.getOutOfSyncRange();
				if (range != null) {
					const tl2 = await this.trpc.getTimeline.query(range);
					state = new State(state.timeline.merge(tl2), state.running, state.settings);
					this.commit(Date.now(), state);
				}
			}
			return state;
		});
		return this.syncQueue;
	}

	timelineEdit(interval: interval | undefined = undefined): Promise<State> {
		if (typeof interval == 'undefined') {
			interval = this.getPreviewInterval();
			this.stopPreview();
		}
		const state = new State(
			this.state.timeline.update(interval),
			this.state.running,
			this.state.settings
		);
		this.syncQueue = this.syncQueue.then(async () => {
			this.commit(Date.now(), state);
			if (this.trpc != null) {
				await this.trpc.updateInterval.mutate(interval as interval);
			}
			return state;
		});
		return this.syncQueue;
	}
}
