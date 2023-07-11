import sys
sys.path.append("backend/src")

import unittest
import json

from main import app
from main import ar

class TestFlaskHandlers(unittest.TestCase):
    def setUp(self):
        ar.clear()
        app.config.update({
        "TESTING": True,
        })

        self.client = app.test_client()

    def testGetRunning(self):
        res = self.client.get('/api/running')
        self.assertEqual(res.status_code, 404)
        d = {"start": 1, "title": "1"}
        ar.post('running/running', d)
        res = self.client.get('/api/running')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)

    def testPostAndPutRunning(self):
        d = {"start": 1, "title": "1"}
        res = self.client.post('/api/running', data=json.dumps(d))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)
        d = {"start": 200, "title": "2"}
        res = self.client.put('/api/running', data=json.dumps(d))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)

    def testGetSettings(self):
        res = self.client.get('/api/settings')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {})

    def testPutSettings(self):
        d = {"test": 1}
        res = self.client.put('/api/settings', data=json.dumps(d))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)

    def testPatchAndPostSetting(self):
        d = {"test": 1}
        res = self.client.post('/api/setting', data=json.dumps(d))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)
        d = {"test": 2}
        res = self.client.patch('/api/setting', data=json.dumps(d))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, d)

    def testPostTimeline(self):
        i = {"title": "1", "start": 1, "end": 2}
        res = self.client.post('/api/timeline', data=json.dumps(i))
        self.assertEqual(res.status_code, 200)
        i["id"] = res.json["id"]
        self.assertEqual(res.json, i)

    def testPatchTimeline(self):
        i = {"title": "2"}
        res = self.client.patch('/api/timeline/'+'1', data=json.dumps(i))
        self.assertEqual(res.status_code, 404)
        r = ar.post('intervals', {"title": "1", "start": 1, "end": 2})
        res = self.client.patch('/api/timeline/'+r["id"], data=json.dumps(i))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, {"title": "2", "start": 1, "end": 2, "id": r["id"]})

    def testGetTimeline(self):
        res = self.client.get('/api/timeline')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, [])
        r = ar.post('intervals', {"title": "1", "start": 1, "end": 2})
        res = self.client.get('/api/timeline', query_string={"start": 0, "end": 3})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json, [{"title": "1", "start": 1, "end": 2, "id": r["id"]}])
