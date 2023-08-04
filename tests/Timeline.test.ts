import { describe, expect, test } from '@jest/globals';
import Timeline from '$lib/Timeline';
import type { interval } from '$lib/types';

describe('constructor start and end', () => {
	test('empty', () => {
		const intervals: interval[] = [];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).not.toBe(intervals);
		expect(timeline.intervals).toEqual(intervals);
		expect(timeline.start.getTime()).toBe(0);
		expect(timeline.end.getTime()).toBe(0);
	});
	test('list, infer', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).not.toBe(intervals);
		expect(timeline.intervals).toEqual(intervals);
		expect(timeline.start.getTime()).toBe(100);
		expect(timeline.end.getTime()).toBe(400);
	});
	test('list, provided', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals, new Date(75), new Date(425));
		expect(timeline.intervals).not.toBe(intervals);
		expect(timeline.intervals).toEqual(intervals);
		expect(timeline.start.getTime()).toBe(75);
		expect(timeline.end.getTime()).toBe(425);
	});
	test('timeline, infer', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals, new Date(75), new Date(425));
		const timeline2 = new Timeline(timeline);
		// Should not do a malloc.
		expect(timeline.intervals).toBe(timeline2.intervals);
		expect(timeline2.start.getTime()).toBe(75);
		expect(timeline2.end.getTime()).toBe(425);
	});
	test('timeline, infer', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals, new Date(75), new Date(425));
		const timeline2 = new Timeline(timeline, new Date(200), new Date(250));
		// Should not do a malloc.
		expect(timeline.intervals).toBe(timeline2.intervals);
		expect(timeline2.start.getTime()).toBe(200);
		expect(timeline2.end.getTime()).toBe(250);
	});
});

describe('cutting overlaps', () => {
	test('no overlaps', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(intervals);
	});
	test('one overlap', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 }
		];
		const expected = [
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(expected);
	});
	test('multiple overlaps', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(225), end: new Date(300), title: '3', id: 3 },
			{ start: new Date(275), end: new Date(350), title: '4', id: 4 },
			{ start: new Date(345), end: new Date(400), title: '5', id: 5 }
		];
		const expected: interval[] = [
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(225), title: '2', id: 2 },
			{ start: new Date(225), end: new Date(275), title: '3', id: 3 },
			{ start: new Date(275), end: new Date(345), title: '4', id: 4 },
			{ start: new Date(345), end: new Date(400), title: '5', id: 5 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(expected);
	});
	test('cut around', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(300), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 }
		];
		const expected = [
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(250), end: new Date(300), title: '1', id: -1 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(expected);
	});
	test('multiple cut around', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(300), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(50), end: new Date(350), title: '3', id: 3 },
			{ start: new Date(0), end: new Date(400), title: '4', id: 4 }
		];
		const expected = [
			{ start: new Date(0), end: new Date(50), title: '4', id: 4 },
			{ start: new Date(50), end: new Date(100), title: '3', id: 3 },
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(250), end: new Date(300), title: '1', id: -1 },
			{ start: new Date(300), end: new Date(350), title: '3', id: -1 },
			{ start: new Date(350), end: new Date(400), title: '4', id: -1 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(expected);
	});
	test('mix, with gaps', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(300), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(50), end: new Date(350), title: '3', id: 3 },
			{ start: new Date(0), end: new Date(400), title: '4', id: 4 },
			{ start: new Date(500), end: new Date(650), title: '5', id: 5 },
			{ start: new Date(600), end: new Date(650), title: '6', id: 6 }
		];
		const expected = [
			{ start: new Date(0), end: new Date(50), title: '4', id: 4 },
			{ start: new Date(50), end: new Date(100), title: '3', id: 3 },
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(250), title: '2', id: 2 },
			{ start: new Date(250), end: new Date(300), title: '1', id: -1 },
			{ start: new Date(300), end: new Date(350), title: '3', id: -1 },
			{ start: new Date(350), end: new Date(400), title: '4', id: -1 },
			{ start: new Date(500), end: new Date(600), title: '5', id: 5 },
			{ start: new Date(600), end: new Date(650), title: '6', id: 6 }
		];
		const timeline = new Timeline(intervals);
		expect(timeline.intervals).toEqual(expected);
	});
});

describe('adding', () => {
	test('empty', () => {
		const intervals: interval[] = [];
		const expected = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.add({ start: new Date(100), end: new Date(200), title: '1', id: 1 });
		expect(timeline2.intervals).toEqual(expected);
	});
	test('no overlap', () => {
		const intervals: interval[] = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const expected = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(300), end: new Date(400), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.add({ start: new Date(300), end: new Date(400), title: '2', id: 2 });
		expect(timeline2.intervals).toEqual(expected);
	});
	test('overlaps', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(250), end: new Date(300), title: '2', id: 2 }
		];
		const expected = [
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(275), title: '3', id: 3 },
			{ start: new Date(275), end: new Date(300), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.add({ start: new Date(150), end: new Date(275), title: '3', id: 3 });
		expect(timeline2.intervals).toEqual(expected);
	});
	test('cut around', () => {
		const intervals: interval[] = [
			{ start: new Date(100), end: new Date(200), title: '1', id: 1 },
			{ start: new Date(250), end: new Date(300), title: '2', id: 2 }
		];
		const expected = [
			{ start: new Date(100), end: new Date(150), title: '1', id: 1 },
			{ start: new Date(150), end: new Date(275), title: '3', id: 3 },
			{ start: new Date(275), end: new Date(300), title: '2', id: 2 }
		];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.add({ start: new Date(150), end: new Date(275), title: '3', id: 3 });
		expect(timeline2.intervals).toEqual(expected);
	});
	test('over', () => {
		const intervals: interval[] = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const expected = [{ start: new Date(50), end: new Date(300), title: '2', id: 2 }];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.add({ start: new Date(50), end: new Date(300), title: '2', id: 2 });
		expect(timeline2.intervals).toEqual(expected);
	});
});

describe('updateing', () => {
	test('not found', () => {
		const intervals: interval[] = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const expected = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.update({
			start: new Date(50),
			end: new Date(300),
			title: '2',
			id: 2
		});
		expect(timeline2.intervals).toEqual(expected);
	});
	test('match', () => {
		const intervals: interval[] = [{ start: new Date(100), end: new Date(200), title: '1', id: 1 }];
		const expected = [{ start: new Date(100), end: new Date(200), title: '2', id: 1 }];
		const timeline = new Timeline(intervals);
		const timeline2 = timeline.update({
			start: new Date(50),
			end: new Date(300),
			title: '2',
			id: 1
		});
		expect(timeline2.intervals).toEqual(expected);
	});
});

describe('out of sync', () => {});

describe('missing', () => {});

describe('merging', () => {});
