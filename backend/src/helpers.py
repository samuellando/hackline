def cutOverlaps(all, backfill=True):
    intervals = sorted(all, key=lambda x: x.start)

    if len(intervals) == 0:
        return []

    results = []

    starts = []
    s = [] # Stack of events at this time.

    t = 0

    for interval in intervals:
        while len(s) > 0 and s[-1].end < interval.start:
            # Clear all the passed events in stack.
            t = s.pop().end
            while len(s) > 0 and s[-1].end <= t:
                s.pop()

            # If there are any events left, cut it around.
            if len(s) > 0:
                p = s[-1]
                starts.append({"start": t, "ref": p})

        # Add the interval to starts
        if len(starts) > 0 and interval.start == starts[-1]["start"]:
            if not interval.id == "running":
                starts[-1]["ref"] = interval
        else:
            starts.append({"start": interval.start, "ref": interval})
        s.append(interval)

    t = starts[-1]["ref"].end

    # Clear the stack.
    while len(s) > 0:
        while len(s) > 0 and s[-1].end <= t:
            s.pop()
        if len(s) > 0:
            p = s.pop()
            starts.append({"start": t, "ref": p})
            t = p.end


    # Convert starts to actual events.
    for i, s in enumerate(starts):
        interval = s["ref"].copy()
        istart = s["start"]
        nextStart = starts[i+1]["start"] if i < len(starts) - 1 else interval.end
        iend = min(nextStart, interval.end)

        interval.start = istart
        interval.end = iend


        if backfill: 
            if not (i == len(starts) - 1 and  interval.id == "running"):
                if interval.start != s["ref"].start or interval.id == 'running':
                    res = ar.post("intervals", interval.toDict())
                    interval = Interval.fromDict(res)
                elif interval.end != s["ref"].end:
                    if interval.id != "":
                        ar.patch("intervals/"+interval.id, interval.toDict())
                    else:
                       res = ar.post("intervals", interval.toDict())
                       interval = Interval.fromDict(res)

        results.append(interval)

    return results
