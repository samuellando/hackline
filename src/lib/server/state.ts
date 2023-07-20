import { State } from '$lib/types';
import { getTimeline } from '$lib/server/timeline';
import { getRunning } from '$lib/server/running';
import { getSettings } from '$lib/server/settings';

export function getState(start: number, end: number): State {
    return new State(getTimeline(start, end), getRunning(), getSettings());
}
