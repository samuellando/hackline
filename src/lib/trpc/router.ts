import type { Context } from '$lib/trpc/context';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import delay from 'delay';
import { getTimeline } from '$lib/server/timeline';
import { getRunning } from '$lib/server/running';
import { getSettings } from '$lib/server/settings';
import { getState } from '$lib/server/state';
import transformer from '$lib/trpc/transformer';

export const t = initTRPC.context<Context>().create({transformer});

const greeting = t.router({
    greeting: t.procedure
    .input(z.string())
    .query(async (opts) => {
        const { input } = opts;
        return `Hello, ${input}!`;
    })
});

const timeline = t.router({
    getTimeline: t.procedure
    .input(z.object({
           start: z.number(),
           end: z.number()
    }))
    .query(async (opts) => {
        const { input } = opts;
        return getTimeline(input.start, input.end);
    })
});

const running = t.router({
    getRunning: t.procedure
    .query(async () => {
        return getRunning();
    })
});

const settings = t.router({
    getSettings: t.procedure
    .query(async () => {
        return getSettings();
    })
});

const state = t.router({
    getState: t.procedure
    .input(z.object({
           start: z.number(),
           end: z.number()
    }))
    .query(async (opts) => {
        const { input } = opts;
        return getState(input.start, input.end);
    })
});

export const router = t.mergeRouters(greeting, timeline, running, settings, state)

export type Router = typeof router;
