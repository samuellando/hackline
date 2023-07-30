import type { RequestEvent } from '@sveltejs/kit';
import { router } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';
import { TRPCError } from '@trpc/server';
import { error } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
	let caller = router.createCaller(await createContext(event));

	try {
		let running = await caller.getRunning();
		return new Response(JSON.stringify(running));
	} catch (e) {
		if (e instanceof TRPCError) {
			throw error(401, e.message);
		} else {
			throw e;
		}
	}
}

export async function POST(event: RequestEvent) {
	let caller = router.createCaller(await createContext(event));
	let running = await event.request.json();

	if (typeof running.start !== 'undefined') {
		running.start = new Date(running.start);
	}

	try {
		let res = await caller.setRunning(running);
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
