import type { RequestEvent } from '@sveltejs/kit';
import { router } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';
import { TRPCError } from '@trpc/server';
import { error } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	const caller = router.createCaller(await createContext(event));

	try {
		const DAY = 24 * 60 * 60 * 1000;
		const end = new Date(Date.now() + DAY);
		const start = new Date(Date.now() - DAY);
		const state = await caller.getState({ start: start, end: end });
		const running = state.getRunning();
		let res;
		if (running.end) {
			res = {
				...running,
				start: running.start.getTime(),
				end: running.end.getTime()
			};
		} else {
			res = {
				...running,
				start: running.start.getTime()
			};
		}
		return new Response(JSON.stringify(res));
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
	const running = await event.request.json();

	if (typeof running.start !== 'undefined') {
		running.start = new Date(running.start);
	}

	try {
		const created = await caller.setRunning(running);
		const res = {
			...created,
			start: created.start.getTime()
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

export async function PUT(event: RequestEvent) {
	return await POST(event);
}
