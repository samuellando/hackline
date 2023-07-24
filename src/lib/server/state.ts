import { State } from '$lib/types';
import type { interval, running, settings } from '$lib/types';
import Timeline  from '$lib/Timeline';
import { getTimeline } from '$lib/server/timeline';
import { getRunning } from '$lib/server/running';
import { getSettings } from '$lib/server/settings';
import demoTimeline from '$lib/server/demoTimeline.json';
import demoRunning from '$lib/server/demoRunning.json';
import demoSettings from '$lib/server/demoSettings.json';
import prisma from '$lib/server/prisma';
import { newUser } from '$lib/server/user';


export async function getState(id: string, start: number, end: number): Promise<State> {
    let data
    try {
        data = await prisma.user.findUniqueOrThrow({
            select: {
                intervals: {
                    select: {
                        start: true,
                        end: true,
                        title: true,
                        id: true,
                    }
                },
                running: {
                    select: {
                        title: true,
                        start: true,
                    }
                },
                settings: {
                    select: {
                        value: true,
                    }
                }
            },
            where: {id}
        });
    } catch (e) {
        data = await newUser(id);
    }

    if (data.running == null) {
        data.running = {title: 'Nothing', start: 0};
        prisma.running.create({
            data: {userId: id, ...data.running},
        });
    }

    let settings: settings;
    if (data.settings != null) {
        settings = JSON.parse(data.settings.value);
    } else {
        settings = {};
        prisma.settings.create({
            data: {userId: id, value: JSON.stringify(settings)},
        });
    }

    return new State(new Timeline(data.intervals), data.running, settings);
}

export function getDemoState(): State {
    let timeline = demoTimeline
    let running = demoRunning;
    let settings = demoSettings;

    // 10 minutes ago.
    let end = Date.now() - 10 * 60 * 1000;
    let last = timeline[timeline.length - 1].end;
    let shift = end - last;
    timeline.reverse().forEach((interval) => {
        interval.start += shift;
        interval.end += shift;
    });

    running.start = end;

    return new State(new Timeline(timeline), running, settings);
}
