import unittest
import sys
sys.path.append("backend/src")

from main import getRunning
from main import ar

from interval import Interval
from running import Running
from frontendRunning import FrontendRunning

import time

class GetRunnning(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def test_empty(self):
        from werkzeug.exceptions import NotFound
        with self.assertRaises(NotFound): 
            getRunning()

    def testNoInterval(self):
        expected = Running.fromDict({"title": "testing", "start": 100})
        ar.post("running/running", expected.toDict())
        self.assertEqual(FrontendRunning.fromDict(getRunning()), FrontendRunning.fromRunning(expected))

    def testRunningInterval(self):
        fallback = Running.fromDict({"title": "fallback", "start": 100})
        ar.post("running/running", fallback.toDict())
        now = time.time() * 1000
        i = Interval('id', 'testing', now - 100, now + 20000)
        ar.post("intervals", i.toDict())
        self.assertEqual(FrontendRunning.fromDict(getRunning()), FrontendRunning.fromInterval(i, fallback))

    def testRunningNonOverlappingIntervals(self):
        now = time.time() * 1000
        i = Interval('id', 'testing2', 0, 10)
        ar.post("intervals", i.toDict())
        i = Interval('id', 'testing3', now + 10000, now - 10200)
        ar.post("intervals", i.toDict())
        r = Running.fromDict({"title": "testing", "start": 100})
        ar.post("running/running", r.toDict())
        self.assertEqual(FrontendRunning.fromDict(getRunning()), FrontendRunning.fromRunning(r))

    def testRunningElapsedInterval(self):
        now = time.time() * 1000
        i = Interval('id', 'testing2', 0, 1000)
        ar.post("intervals", i.toDict())
        r = Running.fromDict({"title": "testing", "start": 100})
        ar.post("running/running", r.toDict())
        expected = Running.fromDict({"title": "testing", "start": 1000})
        self.assertEqual(FrontendRunning.fromDict(getRunning()), FrontendRunning.fromRunning(expected))

if __name__ == '__main__':
    unittest.main()
