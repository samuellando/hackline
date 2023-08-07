import Timeline from '$lib/Timeline';
import prisma from '$lib/server/prisma';
import type { interval } from '$lib/types';

export async function fixSplices(id: string, timeline: Timeline) {
    await prisma.interval.createMany({
        data: timeline.getOutOfSyncIntervals().map((e) => {
            return {
                title: e.title,
                start: e.start,
                end: e.end,
                userId: id
            };
        })
    });
}

export async function getTimeline(id: string, start: Date, end: Date): Promise<Timeline> {
    const intervals = await prisma.interval.findMany({
        select: {
            start: true,
            end: true,
            title: true,
            id: true
        },
        where: {
            userId: id,
            OR: [
                {
                    start: {
                        gte: start,
                        lt: end
                    }
                },
                {
                    end: {
                        gt: start,
                        lte: end
                    }
                },
                {
                    start: {
                        lte: start
                    },
                    end: {
                        gte: end
                    }
                }
            ]
        }
    });
    const timeline = new Timeline(intervals, start, end);
    if (timeline.getOutOfSyncRange() != null) {
        await fixSplices(id, timeline);
        return await getTimeline(id, start, end);
    } else {
        return timeline;
    }
}

export async function addInterval(id: string, interval: interval): Promise<interval> {
    // Adjust the intervals we need to.
    // Delete all intervals that are inside the new interval.
    await prisma.interval.deleteMany({
        where: {
            userId: id,
            start: {
                gte: interval.start,
                lte: interval.end
            },
            end: {
                gte: interval.start,
                lte: interval.end
            }
        }
    });

    // Adjust all ends.
    await prisma.interval.updateMany({
        data: {
            end: interval.start
        },
        where: {
            userId: id,
            end: {
                gte: interval.start,
                lte: interval.end
            }
        }
    });

    // Adjust all starts.
    await prisma.interval.updateMany({
        data: {
            start: interval.end
        },
        where: {
            userId: id,
            start: {
                gte: interval.start,
                lte: interval.end
            }
        }
    });

    // Get all the spliced intervals.
    const spliced = await prisma.interval.findMany({
        where: {
            userId: id,
            start: {
                lt: interval.start,
            },
            end: {
                gt: interval.end
            }
        }
    });
    // Create the new intervals for spliced.
    await prisma.interval.createMany({
        data: spliced.map((e) => {
            return {
                title: e.title,
                start: interval.end,
                end: e.end,
                userId: id
            };
        })
    });

    const n = await prisma.interval.create({
        data: {
            title: interval.title,
            start: interval.start,
            end: interval.end,
            userId: id
        },
        select: {
            start: true,
            end: true,
            title: true,
            id: true
        }
    });

    return n;
}

export async function updateInterval(id: string, interval: interval): Promise<interval> {
    const n = await prisma.interval.update({
        data: {
            title: interval.title
        },
        where: {
            id: interval.id,
            userId: id
        },
        select: {
            start: true,
            end: true,
            title: true,
            id: true
        }
    });
    return n;
}
