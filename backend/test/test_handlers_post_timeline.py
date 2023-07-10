import sys
sys.path.append("backend/src")

import unittest

from main import postTimeline
from main import ar

class TestSetSetting(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        i = {'title': 'test', 'start': 0, 'end': 1000}
        postTimeline(i.copy())
        res = ar.get('intervals')
        del res[0]['id']
        self.assertListEqual(res, [i])

    def testPartialCover(self):
        old = {'title': 'old', 'start': 500, 'end': 1000}
        ar.post('intervals', old.copy())
        i = {'title': 'new', 'start': 0, 'end': 750}
        postTimeline(i.copy())
        res = ar.get('intervals')
        del res[0]['id']
        del res[1]['id']
        res.sort(key=lambda x: x['start'])
        old['start'] = 750
        self.assertListEqual(res, [i, old])

    def testCutOff(self):
        old = {'title': 'old', 'start': 0, 'end': 750}
        ar.post('intervals', old.copy())
        i = {'title': 'new', 'start': 500, 'end': 1000}
        postTimeline(i.copy())
        res = ar.get('intervals')
        del res[0]['id']
        del res[1]['id']
        res.sort(key=lambda x: x['start'])
        self.assertListEqual(res, [old, i])

    def testFullCover(self):
        old = {'title': 'old', 'start': 100, 'end': 750}
        ar.post('intervals', old.copy())
        i = {'title': 'new', 'start': 0, 'end': 1000}
        postTimeline(i.copy())
        res = ar.get('intervals')
        del res[0]['id']
        self.assertListEqual(res, [i])

if __name__ == '__main__':
    unittest.main()
