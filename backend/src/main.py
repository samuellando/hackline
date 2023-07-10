from flask import Flask, request, abort
from flask import send_from_directory
import json
import anyrest
import time
from pymongo import MongoClient
from pymongo.server_api import ServerApi

from interval import Interval
from running import Running
from frontendRunning import FrontendRunning

app = Flask(__name__)

@app.route('/api/running', methods=["get"])
def getRunning():
    now = time.time() * 1000
    timeline = ar.query("intervals", [{"start": {"$lte": now}}, {"end": -1}, 1])
    # Todo: Overlaps...

    try:
        fallback = Running.fromDict(ar.get("running/running"))
    except:
        abort(404)

    if len(timeline) > 0:
        interval = Interval.fromDict(timeline[-1])
        fallback.start = max(int(fallback.start), interval.end)
        if interval.end < now:
            interval = None
    else:
        interval = None
    


    if interval is not None:
        running = FrontendRunning.fromInterval(interval, fallback)
    else:
        running = FrontendRunning.fromRunning(fallback)

    return running.toDict()

@app.route('/api/running', methods=["POST", "PUT"])
def postRunning(data = None):
    if data is None:
        data = json.loads(request.data)

    if not 'start' in data:
        data['start'] = time.time() * 1000

    new = Running(data['title'], data['start'])

    # First save the current running as an interval, manually.
    try:
        last = Running.fromDict(ar.get("running/running"))
        ar.post('intervals', Interval('id', last.title, last.start, new.start).toDict())
    except:
        pass

    # If we're curring off an interval, update it's end time.
    timeline = ar.query("intervals",[{"$and": [
            {"start": {"$lte": new.start}}, 
            {"end": {"$gte": new.start}}
        ]}, {"start": -1}, 1])
    # Todo: Overlaps...
    if len(timeline) > 0:
        interval = Interval.fromDict(timeline[-1])
        interval.end = new.start
        ar.put("intervals/{}".format(interval.id), interval.toDict())
    
    try: 
        res = ar.put("running/running", new.toDict())
    except:
        res = ar.post("running/running", new.toDict())

    return FrontendRunning.fromDict(res).toDict()


@app.route('/api/settings', methods=["GET"])
def getSettings():
    try:
        settings =  ar.get("settings/settings")
        del settings["id"]
        return settings
    except:
        return {}

@app.route('/api/setting', methods=["POST", "PATCH"])
def setSetting(data = None):
    if data is None:
        data = json.loads(request.data)

    try:
        settings = ar.patch("settings/settings", data)
    except:
        settings = ar.post("settings/settings", data)

    settings =  ar.get("settings/settings")
    del settings["id"]
    return settings

@app.route('/api/settings', methods=["PUT"])
def setSettings(data = None):
    if data is None:
        data = json.loads(request.data)

    try:
        settings = ar.put("settings/settings", data)
    except:
        settings = ar.post("settings/settings", data)

    settings =  ar.get("settings/settings")
    del settings["id"]
    return settings

@app.route('/api/timeline', methods=["POST"])
def postTimeline(data = None):
    if data is not None:
        new = Interval.fromDict(data)
    else:
        new = Interval.fromDict(json.loads(request.data))

    # Modify current intervals in case of a overlap.
    #
    #  new: |---|    |---| |---|
    #  old:   |---| |---|   |-|
    #  mod:     |-| |---|       
    #
    logsdb = ar.get("intervals")
    for v in logsdb:
        v = Interval.fromDict(v)
        # The first case.
        if v.start >= new.start and v.start <= new.end and v.end >= new.end:
            v.start = new.end
            ar.patch("intervals/"+v.id, v.toDict())
        # The last case.
        elif v.start >= new.start and v.end <= new.end:
            ar.delete("intervals/"+v.id, v.toDict())

    return ar.post("intervals", new.toDict())

@app.route('/api/timeline/<id>', methods=["PATCH"])
def patchTimeline(id, data = None):
    if data is None:
        data = json.loads(request.data)
    return ar.patch("intervals/" + id, {"title": data["title"]})

@app.route('/api/timeline', methods=["GET"])
def getTimeline(start=None, end=None):
    if start is None and end is None:
        args = request.args
        if "start" in args:
            start = float(args["start"])
        if "end" in args:
            end = float(args["end"])

    query = {"$or": []}
    if start != None and end != None:
        query["$or"].append({"$and": [
            {"start": {"$gte": start}},
            {"start": {"$lte": end}},
            ]})
        query["$or"].append({"$and": [
            {"end": {"$gte": start}},
            {"end": {"$lte": end}},
            ]})
        query["$or"].append({"$and": [
            {"start": {"$lte": start}},
            {"end": {"$gte": end}},
            ]})
    elif start != None:
        query["$or"].append({"end": {"$gte": start}})
        query["$or"].append({"start": {"$gte": start}})
    elif end != None:
        query["$or"].append({"end": {"$lte": end}})
        query["$or"].append({"start": {"$lte": end}})
    else:
        query = {}

    running = Running.fromDict(ar.get("running/running"))
    db = ar.query("intervals", [query])

    intervals = []
    for v in db:
        intervals.append(Interval.fromDict(v))

    if end is None:
        rend = time.time() * 1000
    else:
        rend = end

    intervals.append(Interval("running", running.title, running.start, rend))

    intervals = cutOverlaps(intervals)


    out = []
    for i in intervals:
        if start is not None and i.start < start:
            i.start = start

        if end is not None and i.end > end:
            i.end = end

        out.append(i.toDict())

    return out

def cutOverlaps(all, backfill=True):
    intervals = sorted(all, key=lambda x: x.start)

    if len(intervals) == 0:
        return []

    results = []

    starts = []
    s = [] # Stack of events at this time.

    t = 0

    for interval in intervals:
        while len(s) > 0 and s[-1].end < interval.start:
            # Clear all the passed events in stack.
            t = s.pop().end
            while len(s) > 0 and s[-1].end <= t:
                s.pop()

            # If there are any events left, cut it around.
            if len(s) > 0:
                p = s[-1]
                starts.append({"start": t, "ref": p})

        # Add the interval to starts
        if len(starts) > 0 and interval.start == starts[-1]["start"]:
            if not interval.id == "running":
                starts[-1]["ref"] = interval
        else:
            starts.append({"start": interval.start, "ref": interval})
        s.append(interval)

    t = starts[-1]["ref"].end

    # Clear the stack.
    while len(s) > 0:
        while len(s) > 0 and s[-1].end <= t:
            s.pop()
        if len(s) > 0:
            p = s.pop()
            starts.append({"start": t, "ref": p})
            t = p.end


    # Convert starts to actual events.
    for i, s in enumerate(starts):
        interval = s["ref"].copy()
        istart = s["start"]
        nextStart = starts[i+1]["start"] if i < len(starts) - 1 else interval.end
        iend = min(nextStart, interval.end)

        interval.start = istart
        interval.end = iend


        if backfill: 
            if not (i == len(starts) - 1 and  interval.id == "running"):
                if interval.start != s["ref"].start or interval.id == 'running':
                    res = ar.post("intervals", interval.toDict())
                    interval = Interval.fromDict(res)
                elif interval.end != s["ref"].end:
                    if interval.id != "":
                        ar.patch("intervals/"+interval.id, interval.toDict())
                    else:
                       res = ar.post("intervals", interval.toDict())
                       interval = Interval.fromDict(res)

        results.append(interval)

    return results

@app.route('/')
def index():
    return send_from_directory("../../build", "index.html")

@app.route('/<path:path>')
def frontend(path):
    try:
        return send_from_directory("../../build", path)
    except:
        return send_from_directory("../../build", path+".html")

import os
if "MONGODB_USER" in os.environ and "MONGODB_PASSWORD" in os.environ:
    uri = "mongodb+srv://{}:{}@hackline.1ofbp0v.mongodb.net/?retryWrites=true&w=majority".format(os.environ["MONGODB_USER"], os.environ["MONGODB_PASSWORD"])
else:
    uri = ""
    print("Missing username and password, this will fail if not in testing mode.")
import sys
if __name__ == '__main__':
    from flask_cors import CORS
    CORS(app)
    client = MongoClient(uri,
                         tls=True,
                         server_api=ServerApi('1'))
    db = client['test']
    ar = anyrest.addAnyrestHandlersMongoDB(app, db, "dev-pnkvmziz4ai48pb8.us.auth0.com", "https://timelogger/api", True)
    #ar = anyrest.addAnyrestHandlersTesting(app)
    app.run(host='127.0.0.1', port=8080, debug=True)
elif 'unittest' in sys.modules.keys():
    print("Using testing backend database.")
    ar = anyrest.addAnyrestHandlersTesting(app)
else:
    client = MongoClient(uri,
                         tls=True,
                         server_api=ServerApi('1'))
    db = client['production']
    ar = anyrest.addAnyrestHandlersMongoDB(app, db, "dev-pnkvmziz4ai48pb8.us.auth0.com", "https://timelogger/api", True)

