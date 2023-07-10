import unittest
import sys
sys.path.append("backend/src")

from main import getRunning
from main import postRunning
from main import ar

from interval import Interval
from running import Running
from frontendRunning import FrontendRunning

class PostRunning(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testPostEmpty(self):
        data = {'title': 'testing', 'start': 100}
        res = postRunning(data)
        self.assertEqual(FrontendRunning.fromDict(res), FrontendRunning.fromDict(data))
        self.assertEqual(Running.fromDict(ar.get('running/running')), Running.fromDict(data))

    def testPostNew(self):
        old = {'title': 'old', 'start': 100}
        ar.post('running/running', old)
        data = {'title': 'new', 'start': 200}
        res = postRunning(data)
        self.assertEqual(FrontendRunning.fromDict(res), FrontendRunning.fromDict(data))
        self.assertEqual(Running.fromDict(ar.get('running/running')), Running.fromDict(data))

        old["end"] = 200
        i = ar.get("intervals")[0]
        old["id"] = i["id"]
        self.assertEqual(Interval.fromDict(old), Interval.fromDict(i))

    def testPostCutOff(self):
        i = Interval('id', 'interval', 100, 200)
        i = Interval.fromDict(ar.post('intervals', i.toDict()))

        data = {'title': 'new', 'start': 150}
        res = postRunning(data)
        self.assertEqual(FrontendRunning.fromDict(res), FrontendRunning.fromDict(data))
        self.assertEqual(Running.fromDict(ar.get('running/running')), Running.fromDict(data))

        i2 = Interval.fromDict(ar.get("intervals/{}".format(i.id)))
        i.end = 150
        self.assertEqual(i, i2)
        
if __name__ == '__main__':
    unittest.main()
