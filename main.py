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
        if not "start" in data:
            data["start"] = time.time() * 1000
        data["end"] = data["start"] + data["duration"]

    logsdb = ar["GET"]("logs")
    for k, v in logsdb.items():
        if v["start"] >= data["start"] and v["start"] <= data["end"] and v["end"] >= data["end"]:
            v["start"] = data["end"]
            ar["PATCH"]("logs/"+k, v)
        elif v["start"] >= data["start"] and v["end"] <= data["end"]:
            ar["DELETE"]("logs/"+k, v)

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
        c[0]["running"] = True
        logs.append(c[0])

    logs = cutOverlaps(logs)

    for log in logs:
        log["duration"] = log["end"] - log["start"]

    intervals = []
    for i in logs:
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

    return intervals

def cutOverlaps(all, backfill=True):
    intervals = sorted(all, key=lambda x: x["start"])

    if len(intervals) == 0:
        return []

    results = []

    starts = []
    s = [] # Stack of events at this time.

    t = 0

    for interval in intervals:
        while len(s) > 0 and s[-1]["end"] < interval["start"]:
            # Clear all the passed events in stack.
            t = s.pop()["end"]
            while len(s) > 0 and s[-1]["end"] <= t:
                s.pop()

            # If there are any events left, cut it around.
            if len(s) > 0:
                p = s[-1]
                starts.append({"start": t, "ref": p})

        # Add the interval to starts
        if len(starts) > 0 and interval["start"] == starts[-1]["start"]:
            if not interval["running"]:
                starts[-1]["ref"] = interval
        else:
            starts.append({"start": interval["start"], "ref": interval})
        s.append(interval)

    t = starts[-1]["ref"]["end"]

    # Clear the stack.
    while len(s) > 0:
        while len(s) > 0 and s[-1]["end"] <= t:
            s.pop()
        if len(s) > 0:
            p = s.pop()
            starts.append({"start": t, "ref": p})
            t = p["end"]


    # Convert starts to actual events.
    for i, s in enumerate(starts):
        interval = s["ref"].copy()
        istart = s["start"]
        nextStart = starts[i+1]["start"] if i < len(starts) - 1 else interval["end"]
        iend = min(nextStart, interval["end"])

        interval["start"] = istart
        interval["end"] = iend


        if backfill: 
            if interval["start"] != s["ref"]["start"] and not (i == len(starts) - 1 and  interval["running"]):
                res = ar["POST"]("logs", interval)
                interval = res["data"]
                interval["id"] = res["id"]
            elif interval["end"] != s["ref"]["end"]:
                if "id" in interval:
                    ar["PATCH"]("logs/"+interval["id"], interval)
                else:
                   res = ar["POST"]("logs", interval)
                   interval = res["data"]
                   interval["id"] = res["id"]

        results.append(interval)

    return results

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
