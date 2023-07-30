import type { Context } from '$lib/trpc/context';
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getTimeline, addInterval, updateInterval } from '$lib/server/timeline';
import { getRunning, setRunning } from '$lib/server/running';
import { getSettings, setSettings, setSetting } from '$lib/server/settings';
import { getState, getDemoState } from '$lib/server/state';
import { getApiKey, deleteApiKey } from '$lib/server/apiKey';
import transformer from '$lib/trpc/transformer';
import type { interval, running } from '$lib/types';

export const t = initTRPC.context<Context>().create({ transformer });

const isAuthed = t.middleware((opts) => {
    const { ctx } = opts;
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return opts.next({
        ctx: {
            user: ctx.user,
        },
    });
});

export const protectedProcedure = t.procedure.use(isAuthed);

const timeline = t.router({
    getTimeline: protectedProcedure
        .input(z.object({
            start: z.date(),
            end: z.date()
        }))
        .query(async (opts) => {
            const { input, ctx } = opts;
            return getTimeline(ctx.user, input.start, input.end);
        }),
    addInterval: protectedProcedure
        .input(
            z.object({
                id: z.number().optional(),
                title: z.string(),
                start: z.date(),
                end: z.date(),
            })
        )
        .mutation(async (opts) => {
            const { ctx, input } = opts;
            if (typeof input.id === 'undefined') {
                input.id = -1;
            }
            return addInterval(ctx.user, input as interval);
        }),
    updateInterval: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                title: z.string(),
                start: z.date().optional(),
                end: z.date().optional(),
            })
        )
        .mutation(async (opts) => {
            const { ctx, input } = opts;
            if (typeof input.start === 'undefined') {
                input.start = new Date(0);
            }
            if (typeof input.end === 'undefined') {
                input.end = new Date(0);
            }
            return updateInterval(ctx.user, input as interval);
        })
});

const running = t.router({
    getRunning: protectedProcedure
        .query(async (opts) => {
            const { ctx } = opts;
            return getRunning(ctx.user);
        }),
    setRunning: protectedProcedure
        .input(z.object({
            title: z.string(),
            start: z.date().optional(),
        }))
        .mutation(async (opts) => {
            const { ctx, input } = opts;
            if (typeof input.start === 'undefined') {
                input.start = new Date();
            }
            return setRunning(ctx.user, input as running);
        })
});

const settings = t.router({
    getSettings: protectedProcedure
        .query(async (opts) => {
            const { ctx } = opts;
            return getSettings(ctx.user);
        }),
    setSettings: protectedProcedure
        .input(
            z.record(z.string(), z.any())
        )
        .mutation(async (opts) => {
            const { ctx, input } = opts;
            return setSettings(ctx.user, input);
        }),
    setSetting: protectedProcedure
        .input(
            z.record(z.string(), z.any())
        )
        .mutation(async (opts) => {
            const { ctx, input } = opts;
            return setSetting(ctx.user, input);
        })
});

const state = t.router({
    getState: t.procedure
        .input(z.object({
            start: z.date(),
            end: z.date()
        }))
        .query(async (opts) => {
            const { input, ctx } = opts;
            if (!ctx.user) {
                return getDemoState();
            } else {
                return getState(ctx.user, input.start, input.end);
            }
        })
});

const apiKey = t.router({
    getApiKey: protectedProcedure
        .query(async (opts) => {
            const { ctx } = opts;
            return getApiKey(ctx.user);
        }),
    deleteApiKey: protectedProcedure
        .mutation(async (opts) => {
            const { ctx } = opts;
            return deleteApiKey(ctx.user);
        })
});

export const router = t.mergeRouters(timeline, running, settings, state, apiKey)

export type Router = typeof router;
