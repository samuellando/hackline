import type { RequestEvent } from '@sveltejs/kit';
import { router } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';
import { TRPCError } from '@trpc/server';
import { error } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const caller = router.createCaller(await createContext(event));
	const end = Number(event.url.searchParams.get('end') ?? Date.now());
	const start = Number(event.url.searchParams.get('start') ?? end - 24 * 60 * 60 * 1000);

	try {
		const startD = new Date(start);
		const endD = new Date(end);
		const state = await caller.getState({ start: startD, end: endD });
		const timeline = state.getTimeline(startD, endD).intervals.map((interval) => {
			return {
				...interval,
				start: interval.start.getTime(),
				end: interval.end.getTime()
			};
		});

		return new Response(JSON.stringify(timeline));
	} catch (e) {
		if (e instanceof TRPCError) {
			throw error(401, e.message);
		} else {
			throw e;
		}
	}
}

export async function POST(event: RequestEvent) {
	const caller = router.createCaller(await createContext(event));
	const interval = await event.request.json();

	if ('duration' in interval) {
		if (!interval?.start) {
			interval.start = Date.now();
		}
		interval.end = interval.start + interval.duration;
	}

	interval.start = new Date(interval.start);
	interval.end = new Date(interval.end);

	try {
		const created = await caller.addInterval(interval);
		const res = {
			...created,
			start: created.start.getTime(),
			end: created.end.getTime()
		};
		return new Response(JSON.stringify(res));
	} catch (e) {
		if (e instanceof TRPCError) {
			throw error(401, e.message);
		} else {
			throw e;
		}
	}
}

export async function PATCH(event: RequestEvent) {
	const caller = router.createCaller(await createContext(event));
	const interval = await event.request.json();

	try {
		const updated = await caller.updateInterval(interval);
		const res = {
			...updated,
			start: updated.start.getTime(),
			end: updated.end.getTime()
		};
		return new Response(JSON.stringify(res));
	} catch (e) {
		if (e instanceof TRPCError) {
			throw error(401, e.message);
		} else {
			throw e;
		}
	}
}
