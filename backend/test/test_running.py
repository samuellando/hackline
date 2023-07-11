import sys
sys.path.append("backend/src")

import unittest

from running import Running

class RunningTest(unittest.TestCase):
    def testConstructor(self):
        r = Running("title", 100)
        self.assertEqual(r.title, "title")
        self.assertEqual(r.start, 100)

    def testEqual(self):
        r1 = Running("title", 100)
        r2 = Running("title", 100)
        self.assertEqual(r1, r2)
        r1 = Running("title2", 100)
        r2 = Running("title", 100)
        self.assertNotEqual(r1, r2)
        r1 = Running("title", 1000)
        r2 = Running("title", 100)
        self.assertNotEqual(r1, r2)

    def testFromDict(self):
        d = {"title": "title", "start": 100}
        r1 = Running.fromDict(d)
        r2 = Running("title", 100)
        self.assertEqual(r1, r2)

    def testToDict(self):
        r = Running("title", 100)
        d = {"title": "title", "start": 100}
        self.assertEqual(r.toDict(), d)

if __name__ == '__main__':
    unittest.main()
