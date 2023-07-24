import type { Context } from '$lib/trpc/context';
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import delay from 'delay';
import { getTimeline } from '$lib/server/timeline';
import { getRunning } from '$lib/server/running';
import { getSettings } from '$lib/server/settings';
import { getState, getDemoState } from '$lib/server/state';
import transformer from '$lib/trpc/transformer';

export const t = initTRPC.context<Context>().create({ transformer });

const isAuthed = t.middleware((opts) => {
    const { ctx } = opts;
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    console.log("isAuthed", ctx.session.user);
    return opts.next({
        ctx: {
            user: ctx.session.user.id,
        },
    });
});

export const protectedProcedure = t.procedure.use(isAuthed);

const timeline = t.router({
    getTimeline: protectedProcedure
        .input(z.object({
            start: z.number(),
            end: z.number()
        }))
        .query(async (opts) => {
            const { input } = opts;
            return getTimeline(ctx.user, input.start, input.end);
        })
});

const running = t.router({
    getRunning: protectedProcedure
        .query(async () => {
            return getRunning(ctx.user);
        })
});

const settings = t.router({
    getSettings: protectedProcedure
        .query(async () => {
            return getSettings(ctx.user);
        })
});

const state = t.router({
    getState: t.procedure
        .input(z.object({
            start: z.number(),
            end: z.number()
        }))
        .query(async (opts) => {
            const { input, ctx } = opts;
            if (!ctx.session?.user) {
                return getDemoState();
            } else {
                return getState(ctx.session.user.id, input.start, input.end);
            }
        })
});

export const router = t.mergeRouters(timeline, running, settings, state)

export type Router = typeof router;
