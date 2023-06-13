import unittest
from main import cutOverlaps
from main import Interval

class Test(unittest.TestCase):
    def test_empty(self):
        self.assertListEqual([], cutOverlaps([], False))

    def test_no_overlaps(self):
        intervals = [
                {"start": 1, "end": 2, "title": "1"},
                {"start": 3, "end": 4, "title": "2"},
            {"start": 4, "end": 5, "title": "3"}
        ]

        expected = [
                {"start": 1, "end": 2, "title": "1"},
                {"start": 3, "end": 4, "title": "2"},
                {"start": 4, "end": 5, "title": "3"}
        ]

        intervals = map(lambda d: Interval.fromDict(d), intervals)
        expected = list(map(lambda d: Interval.fromDict(d), expected))

        self.assertListEqual(cutOverlaps(intervals, False), expected)

    def test_cut_around(self):
        intervals = [
                {"start": 1, "end": 4, "title": "1"},
                {"start": 2, "end": 3, "title": "2"},
        ]

        expected = [
                {"start": 1, "end": 2, "title": "1"},
                {"start": 2, "end": 3, "title": "2"},
                {"start": 3, "end": 4, "title": "1"}
        ]

        intervals = map(lambda d: Interval.fromDict(d), intervals)
        expected = list(map(lambda d: Interval.fromDict(d), expected))

        self.assertListEqual(cutOverlaps(intervals, False), expected)

    def test_cut_off(self):
        intervals = [
                {"start": 1, "end": 4, "title": "1"},
                {"start": 2, "end": 5, "title": "2"},
        ]

        expected = [
                {"start": 1, "end": 2, "title": "1"},
                {"start": 2, "end": 5, "title": "2"},
        ]

        intervals = map(lambda d: Interval.fromDict(d), intervals)
        expected = list(map(lambda d: Interval.fromDict(d), expected))

        self.assertListEqual(cutOverlaps(intervals, False), expected)

    def test_same_start(self):
        intervals = [
                {"start": 1, "end": 3, "title": "1", "running": False},
                {"start": 1, "end": 2, "title": "2", "running": False}
        ]

        expected = [
                {"start": 1, "end": 2, "title": "2", "running": False},
                {"start": 2, "end": 3, "title": "1", "running": False}
        ]

        intervals = map(lambda d: Interval.fromDict(d), intervals)
        expected = list(map(lambda d: Interval.fromDict(d), expected))

        self.assertListEqual(cutOverlaps(intervals, False), expected)

    def test_nested(self):
        intervals = [
                {"start": 9, "end": 10, "title": "1"},
                {"start": 8, "end": 11, "title": "2"},
                {"start": 7, "end": 12, "title": "3"},
                {"start": 6, "end": 13, "title": "4"},
                {"start": 5, "end": 14, "title": "5"},
                {"start": 4, "end": 15, "title": "6"},
                {"start": 3, "end": 16, "title": "7"},
                {"start": 2, "end": 17, "title": "8"},
                {"start": 1, "end": 18, "title": "9"}
        ]

        expected = [
                {"start": 9, "end": 10, "title": "1"},
                {"start": 8, "end": 9, "title": "2"},
                {"start": 10, "end": 11, "title": "2"},
                {"start": 7, "end": 8, "title": "3"},
                {"start": 11, "end": 12, "title": "3"},
                {"start": 6, "end": 7, "title": "4"},
                {"start": 12, "end": 13, "title": "4"},
                {"start": 5, "end": 6, "title": "5"},
                {"start": 13, "end": 14, "title": "5"},
                {"start": 4, "end": 5, "title": "6"},
                {"start": 14, "end": 15, "title": "6"},
                {"start": 3, "end": 4, "title": "7"},
                {"start": 15, "end": 16, "title": "7"},
                {"start": 2, "end": 3, "title": "8"},
                {"start": 16, "end": 17, "title": "8"},
                {"start": 1, "end": 2, "title": "9"},
                {"start": 17, "end": 18, "title": "9"}
        ]

        expected.sort(key=lambda x: x["start"])

        intervals = map(lambda d: Interval.fromDict(d), intervals)
        expected = list(map(lambda d: Interval.fromDict(d), expected))

        self.assertListEqual(cutOverlaps(intervals, False), expected)


if __name__ == '__main__':
    unittest.main()
