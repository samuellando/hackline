import type { RequestEvent } from '@sveltejs/kit';
import { router } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';
import { TRPCError } from '@trpc/server';
import { error } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
    let caller = router.createCaller(await createContext(event));

    try {
        let settings = await caller.getSettings();
        return new Response(JSON.stringify(settings));
    } catch (e) {
        if (e instanceof TRPCError) {
            throw  error(401, e.message);
        } else {
            throw e;
        }
    }
}

export async function POST(event: RequestEvent) {
    let caller = router.createCaller(await createContext(event));
    let settings = await event.request.json();


    try {
        let res = await caller.setSettings(settings);
        return new Response(JSON.stringify(res));
    } catch (e) {
        if (e instanceof TRPCError) {
            throw  error(401, e.message);
        } else {
            throw e;
        }
    }
}

export async function PUT(event: RequestEvent) {
    return await POST(event);
}

export async function PATCH(event: RequestEvent) {
    let caller = router.createCaller(await createContext(event));
    let settings = await event.request.json();

    try {
        let res = await caller.setSetting(settings);
        return new Response(JSON.stringify(res));
    } catch (e) {
        if (e instanceof TRPCError) {
            throw  error(401, e.message);
        } else {
            throw e;
        }
    }
}
