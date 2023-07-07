import sys
sys.path.append("backend/src")

import unittest

from interval import Interval

class IntervalTest(unittest.TestCase):
    def testConstructor(self):
        i = Interval("id", "title", 100, 200)
        self.assertEqual(i.id, "id")
        self.assertEqual(i.title, "title")
        self.assertEqual(i.start, 100)
        self.assertEqual(i.end, 200)

    def testEq(self):
        i1 = Interval("id", "title", 100, 200)
        i2 = Interval("id", "title", 100, 200)
        self.assertEqual(i1, i2)
        i1 = Interval("id2", "title", 100, 200)
        i2 = Interval("id", "title", 100, 200)
        self.assertNotEqual(i1, i2)
        i1 = Interval("id", "title2", 100, 200)
        i2 = Interval("id", "title", 100, 200)
        self.assertNotEqual(i1, i2)
        i1 = Interval("id", "title", 1000, 200)
        i2 = Interval("id", "title", 100, 200)
        self.assertNotEqual(i1, i2)
        i1 = Interval("id", "title", 100, 2000)
        i2 = Interval("id", "title", 100, 200)
        self.assertNotEqual(i1, i2)
    
    def testFromDict(self):
        d = {"id": "id", "title": "title", "start": 100, "end": 200}
        i1 = Interval.fromDict(d)
        i2 = Interval("id", "title", 100, 200)
        self.assertEqual(i1, i2)

    def testFromDictDuration(self):
        d = {"id": "id", "title": "title", "start": 100, "duration": 200}
        i1 = Interval.fromDict(d)
        i2 = Interval("id", "title", 100, 300)
        self.assertEqual(i1, i2)
        d = {"id": "id", "title": "title", "start": 100, "end": 500, "duration": 200}
        i1 = Interval.fromDict(d)
        i2 = Interval("id", "title", 100, 300)
        self.assertEqual(i1, i2)

    def testToDict(self):
        i = Interval("id", "title", 100, 200)
        d = {"id": "id", "title": "title", "start": 100, "end": 200}
        self.assertEqual(i.toDict(), d)

    def testCopy(self): 
        i = Interval("id", "title", 100, 200)
        c = i.copy()
        self.assertEqual(i, c)
        self.assertIsNot(i, c)

if __name__ == '__main__':
    unittest.main()
