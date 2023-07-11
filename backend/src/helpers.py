from interval import Interval

def cutOverlaps(all):
    intervals = sorted(all, key=lambda x: x.start)

    if len(intervals) == 0:
        return []

    s = [] # stack of interval references.
    starts = []

    t = 0
    for interval in intervals:
        # Bring "t" to the start eof ethis interval.
        while len(s) > 0 and t < interval.start:
            i = s.pop()
            # if passed.
            if i.end < t:
                continue
            # This is the next start.
            starts.append({"start": t, "ref": i})
            t = i.end
            # If the interval from the stack is not done, keep it in the stack.
            if t > interval.start:
                t = interval.start
                s.append(i)
        # Add the interval to stack.
        t = interval.start
        s.append(interval)

    # Clear the stack.
    while len(s) > 0:
        i = s.pop()
        # Skip if passed.
        if i.end < t:
            continue

        starts.append({"start": t, "ref": i})
        t = i.end

    # Finally convert to intervals.
    res = []
    for i in range(len(starts)):
        ref = starts[i]["ref"]
        start = starts[i]["start"]
        if i < len(starts) - 1:
            # Leave a gap, if there is a gap.
            next = min(ref.end, starts[i + 1]["start"])
        else:
            next = ref.end
        res.append(Interval(ref.id, ref.title, start, next))
    
    return res
