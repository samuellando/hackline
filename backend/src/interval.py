import time

class Interval:
    def __init__(self, id: str, title: str, start: int, end: int):
        self.id = id
        self.title = title
        self.start = start
        self.end = end

    def __eq__(self, other):
        return self.id == other.id and self.title == other.title and self.start == other.start and self.end == other.end

    @staticmethod 
    def fromDict(d):
        d = d.copy()
        if not "id" in d:
            d["id"] = ""
        if not "start" in d:
            d["start"] = time.time() * 1000
        if 'duration' in d:
            return Interval(d["id"], d["title"], d["start"], d["start"] + d["duration"])
        else:
            return Interval(d["id"], d["title"], d["start"], d["end"])

    def toDict(self):
        return {
                "id": self.id,
                "title": self.title,
                "start": self.start,
                "end": self.end
                }

    def copy(self):
        return Interval.fromDict(self.toDict())
