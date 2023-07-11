from running import Running
from interval import Interval

class FrontendRunning(Running):
    def __init__(self, title: str, start: int, end: int | None = None, fallback: str | None = None):
        super().__init__(title, start)
        if (end != None) != (fallback != None): #xor
            raise(ValueError("end and fallback must be both None or both not None"))
        self.end =end
        self.fallback = fallback


    def __eq__(self, other):
        return self.title == other.title and self.start == other.start and self.end == other.end and self.fallback == other.fallback

    @staticmethod 
    def fromInterval(i : Interval, fallback : Running | None = None):
        return FrontendRunning(i.title, i.start, i.end if fallback is not None else None, fallback.title if fallback is not None else None)

    @staticmethod 
    def fromRunning(r: Running):
        return FrontendRunning(r.title, r.start)

    @staticmethod 
    def fromDict(d):
        return FrontendRunning(d["title"], d["start"], d.get('end'), d.get('fallback'))

    def toDict(self):
        d = { "title": self.title, "start": self.start }
        if self.end != None and self.fallback != None:
            d["end"] = self.end
            d["fallback"] = self.fallback
        return d
