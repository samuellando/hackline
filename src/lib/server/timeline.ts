import Timeline from '$lib/Timeline';

export function getTimeline(id: string, start: number, end: number): Timeline {
    let timeline = new Timeline([]);
    timeline.trim(start, end);
    return timeline;
}
