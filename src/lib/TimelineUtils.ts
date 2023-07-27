import type { timeline } from '$lib/types';

type range = {
  start: number,
  end: number
}


export function findMissingRanges(start: number, end: number, timeline: timeline | null): range[] {
  if (timeline == null) {
    return [{ start: start, end: end }];
  }
  const gaps = [];

  let p = start;

  for (let i = 0; i < timeline.length; i++) {
    let range = timeline[i];
    if (range.start >= end) {
      break;
    }
    if (range.start > p) {
      gaps.push({ start: p, end: Math.min(range.start, end) });
    }

    p = Math.max(p, range.end);
  };

  if (end > p) {
    gaps.push({ start: p, end: end });
  }

  return gaps;
}


export function mergeTimelines(timeline1: timeline | null, timeline2: timeline) {
}

