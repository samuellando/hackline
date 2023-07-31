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
						lte: end
					}
				},
				{
					end: {
						gte: start,
						lte: end
					}
				},
				{
					start: {
						lt: start
					},
					end: {
						gt: end
					}
				}
			]
		}
	});
	const timeline = new Timeline(intervals);
	timeline.trim(start, end);
	if (timeline.getOutOfSyncRange() != null) {
		await fixSplices(id, timeline);
		return getTimeline(id, start, end);
	} else {
		return timeline;
	}
}

export async function addInterval(id: string, interval: interval): Promise<interval> {
	// Adjust the intervals we need to.
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

	await prisma.interval.updateMany({
		data: {
			end: interval.start
		},
		where: {
			userId: id,
			start: {
				gte: interval.start,
				lte: interval.end
			},
			end: {
				gt: interval.end
			}
		}
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
