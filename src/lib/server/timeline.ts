import Timeline from '$lib/Timeline';
import prisma from '$lib/server/prisma';
import type { interval } from '$lib/types';

export async function getTimeline(id: string, start: Date, end: Date): Promise<Timeline> {
    let intervals = await prisma.interval.findMany({
        select: {
            start: true,
            end: true,
            title: true,
            id: true,
        },
        where: {
            userId: id,
            OR: [
                {
                    start: {
                        gte: start,
                        lte: end,
                    }
                },
                {
                    end: {
                        gte: start,
                        lte: end,
                    }
                },
            ]
        },
    });
    let timeline = new Timeline(intervals);
    timeline.trim(start, end);
    return timeline;
}

export async function addInterval(id: string, interval: interval): Promise<interval> {
    // Adjust the intervals we need to.
    await prisma.interval.deleteMany({
        where: {
            userId: id,
            start: {
                gte: interval.start,
                lte: interval.end,
            },
            end: {
                gte: interval.start,
                lte: interval.end,
            }
        },
    });

    await prisma.interval.updateMany({
        data: {
            end: interval.start,
        },
        where: {
            userId: id,
            start: {
                gte: interval.start,
                lte: interval.end,
            },
            end: {
                gt: interval.end,
            }
        }
    });

    let n = await prisma.interval.create({
        data: {
            title: interval.title,
            start: interval.start,
            end: interval.end,
            userId: id,
        },
    });

    return n;
}

export async function updateInterval(id: string, interval: interval): Promise<interval> {
    let n = await prisma.interval.update({
        data: {
            title: interval.title,
        },
        where: {
            id: interval.id,
            userId: id,
        },
    });
    return n;
}
