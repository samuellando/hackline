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
		const timeline = await caller.getTimeline({ start: new Date(start), end: new Date(end) });
		return new Response(JSON.stringify(timeline.intervals));
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
		interval.start = Date.now();
		interval.end = interval.start + interval.duration;
	}

	interval.start = new Date(interval.start);
	interval.end = new Date(interval.end);

	try {
		const res = await caller.addInterval(interval);
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
		const res = await caller.updateInterval(interval);
		return new Response(JSON.stringify(res));
	} catch (e) {
		if (e instanceof TRPCError) {
			throw error(401, e.message);
		} else {
			throw e;
		}
	}
}
