import sys
sys.path.append("backend/src")

import unittest

from main import getSettings
from main import setSettings
from main import setSetting
from main import ar


class TestGetSettings(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        self.assertEqual(getSettings(), {})

    def testGetSettings(self):
        d = {'a': 1, 'b': 2}
        ar.post('settings/settings', d)
        self.assertEqual(getSettings(), d)

class TestSetSettings(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        d = {'a': 1, 'b': 2}
        setSettings(d)
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, d)

    def testReplace(self):
        d = {'a': 1, 'b': 2}
        ar.post('settings/settings', d)
        d = {'c': 3, 'd': 4}
        setSettings(d)
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, d)

class TestSetSetting(unittest.TestCase):
    def setUp(self):
        ar.clear()

    def testEmpty(self):
        d = {'a': 1}
        setSettings(d)
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, d)

    def testMultiple(self):
        d = {'a': 1, 'b': 2}
        setSetting({'a': 1})
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, {'a': 1})
        setSetting({'b': 2})
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, d)

    def testReplace(self):
        setSettings({'a': 1})
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, {'a': 1})
        setSettings({'a': 2})
        res = ar.get('settings/settings')
        del res['id']
        self.assertEqual(res, {'a': 2})

if __name__ == '__main__':
    unittest.main()
