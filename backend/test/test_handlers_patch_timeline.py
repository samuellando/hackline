import sys
sys.path.append("backend/src")

import unittest

from main import patchTimeline
from main import ar
from werkzeug.exceptions import NotFound

class TestPatchTimeline(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        i = {'title': 'new', 'start': 0, 'end': 1000}
        with self.assertRaises(NotFound):
            patchTimeline('', i.copy())

    def testUpdate(self):
        i = {'title': 'old', 'start': 0, 'end': 1000}
        r = ar.post('intervals', i.copy())
        i = {'title': 'new', 'start': 0, 'end': 1000}
        patchTimeline(r['id'], i.copy())
        r = ar.get('intervals/' + r['id'])
        self.assertEqual(r['title'], 'new')

if __name__ == '__main__':
    unittest.main()
