import sys
sys.path.append("backend/src")

import unittest

from main import getTimeline
from main import ar

class TestGetTimeline(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        res = getTimeline({})
        self.assertListEqual(res, [])

    def testNoOverlaps(self):
        intervals = [
            {"start": 1, "end": 2, "title": "1"},
            {"start": 3, "end": 4, "title": "2"},
            {"start": 5, "end": 6, "title": "3"}
        ]
        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({})
        for i in res:
            del i['id']
        self.assertEqual(res, intervals)

    def testWithrunning(self):
        ar.post('running/running', {"start": 4, "title": "r"})
        intervals = [
            {"start": 1, "end": 2, "title": "1"},
            {"start": 3, "end": 4, "title": "2"},
            {"start": 5, "end": 6, "title": "3"}
        ]
        expected = [
            {"start": 1, "end": 2, "title": "1"},
            {"start": 3, "end": 4, "title": "2"},
            {"start": 4, "end": 5, "title": "r"},
            {"start": 5, "end": 6, "title": "3"},
            {"start": 6, "end": 200, "title": "r"}
        ]
        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({"end": 200})
        for i in res:
            del i['id']
        self.assertEqual(res, expected)


    def testCutOffStart(self):
        intervals = [
            {"start": 1, "end": 5, "title": "1"},
            {"start": 5, "end": 6, "title": "3"}
        ]
        expected = [
            {"start": 3, "end": 5, "title": "1"},
            {"start": 5, "end": 6, "title": "3"}
        ]

        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({'start': 3})
        for i in res:
            del i['id']
        self.assertEqual(res, expected)

    def testCutOffEnd(self):
        intervals = [
            {"start": 1, "end": 5, "title": "1"},
            {"start": 5, "end": 10, "title": "3"}
        ]
        expected = [
            {"start": 1, "end": 5, "title": "1"},
            {"start": 5, "end": 6, "title": "3"}
        ]

        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({'end': 6})
        for i in res:
            del i['id']
        self.assertEqual(res, expected)

    def testCutOffBoth(self):
        intervals = [
            {"start": 1, "end": 5, "title": "1"},
            {"start": 5, "end": 10, "title": "3"}
        ]
        expected = [
            {"start": 3, "end": 5, "title": "1"},
            {"start": 5, "end": 6, "title": "3"}
        ]

        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({'start': 3, 'end': 6})
        for i in res:
            del i['id']
        self.assertEqual(res, expected)

    def testSoManyOverlaps(self):
        intervals = [
            {"start": 0, "end": 100, "title": "1"},
            {"start": 10, "end": 90, "title": "2"},
            {"start": 20, "end": 80, "title": "3"},
            {"start": 50, "end": 85, "title": "4"},
        ]
        expected = [
            {"start": 0, "end": 10, "title": "1"},
            {"start": 10, "end": 20, "title": "2"},
            {"start": 20, "end": 50, "title": "3"},
            {"start": 50, "end": 85, "title": "4"},
            {"start": 85, "end": 90, "title": "2"},
            {"start": 90, "end": 100, "title": "1"},
        ]
        for i in intervals:
            ar.post('intervals', i.copy())
        res = getTimeline({})
        for i in res:
            del i['id']
        self.assertEqual(res, expected)

if __name__ == '__main__':
    unittest.main()
