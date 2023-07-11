import { describe, expect, test } from '@jest/globals';
import { mergeTimelines, findMissingRanges } from "$lib/TimelineUtils";
import type { interval } from "$lib/types";

describe('findMissingRanges', () => {
  test('empty', () => {
    let timeline: interval[] = [];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 100, end: 200 }]);
  });
  test('empty_in_range', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 0, end: 50 },
      { title: "", id: "", start: 90, end: 99 },
      { title: "", id: "", start: 205, end: 207 },
      { title: "", id: "", start: 290, end: 300 },
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 100, end: 200 }]);
  });
  test('middle', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 110, end: 120 }
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 100, end: 110 }, { start: 120, end: 200 }]);
  });
  test('less_start', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 90, end: 120 }
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 120, end: 200 }]);
  });
  test('start', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 100, end: 120 }
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 120, end: 200 }]);
  });
  test('greater_end', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 190, end: 205 }
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 100, end: 190 }]);
  });
  test('end', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 190, end: 200 }
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([{ start: 100, end: 190 }]);
  });
  test('multiple_middle', () => {
    let timeline: interval[] = [
      { title: "", id: "", start: 110, end: 120 },
      { title: "", id: "", start: 125, end: 135 },
      { title: "", id: "", start: 135, end: 140 },
      { title: "", id: "", start: 140, end: 145 },
      { title: "", id: "", start: 150, end: 190 },
    ];
    let gaps = findMissingRanges(100, 200, timeline)
    expect(gaps).toEqual([
      { start: 100, end: 110 },
      { start: 120, end: 125 },
      { start: 145, end: 150 },
      { start: 190, end: 200 },
    ]);
  });
});

describe('mergeTimelines', () => {
  test('merge', () => {
    let tl1: interval[] = [
      { title: "", id: "1", start: 0, end: 1 },
      { title: "", id: "2", start: 1, end: 2 },
      { title: "", id: "3", start: 3, end: 5 },
      { title: "", id: "9", start: 9, end: 10 },
    ];
    let tl2: interval[] = [
      { title: "", id: "3", start: 5, end: 6 },
      { title: "", id: "4", start: 6, end: 7 },
      { title: "", id: "5", start: 7, end: 8 },
      { title: "", id: "9", start: 8, end: 9 },
    ];
    let tl = mergeTimelines(tl1, tl2)
    expect(tl).toEqual([
      { title: "", id: "1", start: 0, end: 1 },
      { title: "", id: "2", start: 1, end: 2 },
      { title: "", id: "3", start: 3, end: 6 },
      { title: "", id: "4", start: 6, end: 7 },
      { title: "", id: "5", start: 7, end: 8 },
      { title: "", id: "9", start: 8, end: 10 },
    ]);
  });
});
