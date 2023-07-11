class Running:
    def __init__(self, title: str, start: int):
        self.title = title
        self.start = start

    def __eq__(self, other):
        return self.title == other.title and self.start == other.start

    @staticmethod 
    def fromDict(d):
        return Running(d["title"], d["start"])


    def toDict(self):
        return {
                "title": self.title,
                "start": self.start,
                }

