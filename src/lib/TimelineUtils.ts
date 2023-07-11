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
  if (timeline1 == null) {
    return timeline2;
  }

  // Combine both timelines into a single array
  const combinedTimeline = timeline1.concat(timeline2);

  // Sort the combined timeline based on the start timestamps
  combinedTimeline.sort((a, b) => a.start - b.start);

  const mergedTimeline: timeline = [];

  // Iterate over the combined timeline and merge overlapping or adjacent ranges
  combinedTimeline.forEach(range => {
    const lastMergedRange = mergedTimeline[mergedTimeline.length - 1];

    if (!lastMergedRange || range.start > lastMergedRange.end) {
      // If the current range does not overlap with the last merged range,
      // add it to the merged timeline
      mergedTimeline.push(range);
    } else {
      if (range.end > lastMergedRange.end) {
        if (range.id == lastMergedRange.id) {
          lastMergedRange.end = range.end;
        } else {
          lastMergedRange.end = range.start;
          mergedTimeline.push(range);
        }
      }
    }
  });

  return mergedTimeline;
}

