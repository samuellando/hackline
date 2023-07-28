import type {running} from '$lib/types';
import prisma from '$lib/server/prisma';

export async function getRunning(id: string): Promise<running> {
    let running = await prisma.running.findUnique({
        select: {
            title: true,
            start: true,
        },
        where: {userId: id},
    });
    if (running == null) {
        running = {title: 'Nothing', start: new Date(0)};
        prisma.running.create({
            data: {userId: id, ...running},
        });
    }
    return running;
}

export async function setRunning(id: string, r: running): Promise<running> {
    // Get the current running timer and save it as an interval.
    let running = await prisma.running.findUnique({
        select: {
            title: true,
            start: true,
        },
        where: {userId: id},
    });
    if (running == null) {
        running = {title: 'Nothing', start: new Date(0)};
        prisma.running.create({
            data: {userId: id, ...running},
        });
    }
    await prisma.interval.create({
        data: {
            title: running.title,
            start: running.start,
            end: new Date(),
            userId: id,
        },
    });
    // Set the new running timer.
    running = await prisma.running.update({
        data: {title: r.title, start: r.start},
        select: {
            title: true,
            start: true,
        },
        where: {userId: id},
    });
    return running;
}
