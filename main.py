from flask import Flask, request
from flask import send_from_directory
import json
import firebase_admin
from firebase_admin import firestore
import anyrest
import time
from datetime import datetime

import os
os.environ['GRPC_DNS_RESOLVER'] = 'native'

firebase_app = firebase_admin.initialize_app(options={'projectId': 'timelogger-slando'})
db = firestore.client()

app = Flask(__name__)
ar = anyrest.addAnyrestHandlers(app, db, "dev-pnkvmziz4ai48pb8.us.auth0.com", "https://timelogger/api")

@app.route('/api/run', methods=["POST"])
def run():
    cur = ar["GET"]("run")
    data = json.loads(request.data)
    data["start"] = time.time() * 1000
    l = list(cur.items())
    if len(l) == 0:
        return ar["POST"]("run", data)
    else:
        past = l[0][1]
        past["end"] = data["start"]
        ar["POST"]("logs", past)
        return ar["PATCH"]("run/"+l[0][0], data)

@app.route('/api/logs', methods=["POST"])
def log():
    data = json.loads(request.data)
    if "duration" in data:
        data["start"] = time.time() * 1000
        data["end"] = data["start"] + data["duration"]
    return ar["POST"]("logs", data)

@app.route('/api/timeline', methods=["GET"])
def getTimeline():
    args = request.args;
    start = None
    end = None
    if "start" in args:
        start = float(args.get("start"))
    if "end" in args:
        end = float(args.get("end"))
    cur = ar["GET"]("run")
    logs = []
    logsdb = ar["GET"]("logs")
    for k, v in logsdb.items():
        v["id"] = k
        logs.append(v)

    c = list(cur.values())
    if len(c) != 0:
        c[0]["end"] = time.time() * 1000
        logs.append(c[0])

    from datetime import datetime
    logs = cutOverlaps(logs, start, end)

    for log in logs:
        log["duration"] = log["end"] - log["start"]
    return logs

def cutOverlaps(all, start=None, end=None):
    intervals = []

    for i in all:
        insert = True
        if start is not None:
            if i["end"] < start:
                insert = False
            elif i["start"] < start:
                i["start"] = start
        if end is not None:
            if i["start"] > end:
                insert = False
            elif i["end"] > end:
                i["end"] = end

        if insert:
            intervals.append(i)

    intervals = sorted(intervals, key=lambda x: x["start"])

    if len(intervals) == 0:
        return []

    result = [intervals[0]]
    for interval in intervals[1:]:
        result.append(interval)
        if interval["start"] < result[-2]["end"]:
            end = result[-2]["end"]
            result[-2]["end"] = interval["start"]
            if interval["end"] < end:
                n = result[-2].copy()
                n["end"] = end
                n["start"] = interval["end"]
                result.append(n)

    return result

@app.route('/')
def index():
    return send_from_directory("build", "index.html")

@app.route('/<path:path>')
def frontend(path):
    return send_from_directory("build", path)

if __name__ == '__main__':
    from flask_cors import CORS
    CORS(app)
    app.run(host='127.0.0.1', port=8080, debug=True)
    #client = app.test_client()
    #client.get("/api/timeline?start=1681876800000&end=1681963200000", headers={"api-key": ""})
