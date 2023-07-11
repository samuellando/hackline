import sys
sys.path.append("backend/src")

import unittest

from frontendRunning import FrontendRunning
from running import Running
from interval import Interval

class FrontendRunningTest(unittest.TestCase):
    def testConstructor(self):
        expected = {'title': 'testing', 'start': 100}
        r = FrontendRunning('testing', 100)
        self.assertEqual(r.title, expected['title'])
        self.assertEqual(r.start, expected['start'])

        expected = {'title': 'testing', 'start': 100, 'end': 200, 'fallback': 'fallback'}
        r = FrontendRunning('testing', 100, 200, 'fallback')
        self.assertEqual(r.title, expected['title'])
        self.assertEqual(r.start, expected['start'])
        self.assertEqual(r.end, expected['end'])
        self.assertEqual(r.fallback, expected['fallback'])

        with self.assertRaises(ValueError):
            r = FrontendRunning('testing', 100, 200)

        with self.assertRaises(ValueError):
            r = FrontendRunning('testing', 100, None, 'fallback')

    def testEqual(self):
        r1 = FrontendRunning('testing', 100, 200, 'fallback')
        r2 = FrontendRunning('testing', 100, 200, 'fallback')
        self.assertEqual(r1, r2)

        r1 = FrontendRunning('testing', 101, 200, 'fallback')
        r2 = FrontendRunning('testing', 100, 200, 'fallback')
        self.assertNotEqual(r1, r2)

    def testFromInterval(self):
        i = Interval('id', 'interval', 100, 200)
        expected = FrontendRunning('interval', 100)
        self.assertEqual(FrontendRunning.fromInterval(i), expected)
        fallback = Running('fallback', 50)
        i = Interval('id', 'interval', 100, 200,)
        expected = FrontendRunning('interval', 100, 200, "fallback")
        self.assertEqual(FrontendRunning.fromInterval(i, fallback), expected)

    def testFromRunning(self):
        i = Running('interval', 100)
        expected = FrontendRunning('interval', 100)
        self.assertEqual(FrontendRunning.fromRunning(i), expected)

    def testFromDict(self):
        d = {'title': 'testing', 'start': 100}
        expected = FrontendRunning('testing', 100)
        self.assertEqual(FrontendRunning.fromDict(d), expected)

        d = {'title': 'testing', 'start': 100, 'end': 200, 'fallback': 'fallback'}
        expected = FrontendRunning('testing', 100, 200, 'fallback')
        self.assertEqual(FrontendRunning.fromDict(d), expected)

        with self.assertRaises(ValueError):
            d = {'title': 'testing', 'start': 100, 'end': 200}
            FrontendRunning.fromDict(d)
    
        with self.assertRaises(ValueError):
            d = {'title': 'testing', 'start': 100, 'fallback': 'fallback'}
            FrontendRunning.fromDict(d)

    def testToDict(self):
        expected = FrontendRunning('testing', 100, 200, 'fallback')
        d = {'title': 'testing', 'start': 100, 'end': 200, 'fallback': 'fallback'}
        self.assertEqual(expected.toDict(), d)
        self.assertIsNot(expected.toDict(), d)

if __name__ == '__main__':
    unittest.main()
