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
from helpers import cutOverlaps

app = Flask(__name__)

@app.route('/api/running', methods=["get"])
def getRunning():
    '''
    Get the current running interval. 

    Returns:
        - A dict with the current running interval, as a FrontendRunning type.
            - start (int): the start time of the current running interval.
            - title (str): the title of the current running interval.
            - end (int): Optional, the end time of the current running interval.
            - Fallback (str): optional, the title of the fallback interval, after end has passed.
    Raises:
        - 404 if there is no running interval.
    '''
    now = time.time() * 1000
    timeline = ar.query("intervals", [{"start": {"$lte": now}}, {"end": -1}, 1])

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
    '''
    Saves the current runing interval, and starts a new one. 

    Params:
        - data (dict): A dict with the new running interval.
            - start: optional start time in milliseconds. Defaults to now.
            - title: the title of the new running interval.

    Returns:
        - A dict with the updated running interval, as a FrontendRunning type.
            - start: the start time of the new running interval.
            - title: the title of the new running interval.
    '''
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
    '''
    Get the current settings.

    Returns:
        Ket/value pairs of settings.
    '''
    try:
        settings =  ar.get("settings/settings")
        del settings["id"]
        return settings
    except:
        return {}

@app.route('/api/setting', methods=["POST", "PATCH"])
def setSetting(data = None):
    '''
    Set all settings. Replaces all settings.

    Params:
        - data (dict): A dict with the new settings.

    Returns:
        Ket/value pairs of settings.
    '''
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
    '''
    Set a individual setting. Keeps all other settings.

    Params:
        - data (dict): A dict with the new setting(s).

    Returns:
        Ket/value pairs of settings.
    '''
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
    '''
    Add a new interval to the timeline. Will also modify existing intervals if there is a overlap.

      new: |---|    |---| |---|
      old:   |---| |---|   |-|
      mod:     |-| |---|       

    Params:
        - data (dict): A dict with the new interval.

    Returns:
        - A dict with the new interval.
    '''
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
    '''
    Modify an existing interval in the timeline. Allows for changing the title.

    Params:
        - id (str): The id of the interval to modify.
        - data (dict): A dict with the new interval.

    Returns:
        - A dict with the modified interval.
    '''
    if data is None:
        data = json.loads(request.data)
    return ar.patch("intervals/" + id, {"title": data["title"]})

@app.route('/api/timeline', methods=["GET"])
def getTimeline(args = None):
    '''
    Get all the intervals as a timeline. Can be filtered by start and end time.

    - gives precience to intervals with newer start times, and end times.

    Foe example:
    | 1 |           
    | 2                |
           | 3       |
              | 4 | 

    Becomes: 

    | 1 | 2| 3| 4 |3 |2|

    Params:
        args (dict): A dict with the start and end times, optional.
            - start (int): The start time of the interval.
            - end (int): The end time of the interval.

    Returns:
        - A list of intervals, with no overlaps.
    '''

    if args is None:
        args = request.args
    # Get the start and end times from the request.
    start = None
    end = None
    if "start" in args:
        start = int(args["start"])
    if "end" in args:
        end = int(args["end"])

    # Build the query.
    #
    #      |s      |e
    # 1:     |-------|  
    # 2: |---|
    # 3: |------------|

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

    # Get the intervals.
    intervals = ar.query("intervals", [query])
    intervals = list(map(Interval.fromDict, intervals))

    # Also get the current running interval.
    if end is None:
        rend = int(time.time() * 1000)
    else:
        rend = end
    try:
        running = Running.fromDict(ar.get("running/running"))
        intervals.append(Interval("running", running.title, running.start, rend))
    except:
        pass

    # cut the overlaps.
    intervals = cutOverlaps(intervals)

    # Make the end intervals fit the bounds.
    if len(intervals) > 0 and start is not None and intervals[0].start < start:
        intervals[0].start = start

    if len(intervals) > 0 and end is not None and intervals[-1].end > end:
        intervals[-1].end = end

    return list(map(lambda x: x.toDict(), intervals))


@app.route('/')
def index():
    '''
    Serves the frontend home page.
    '''
    return send_from_directory("../../build", "index.html")

@app.route('/<path:path>')
def frontend(path):
    '''
    Serves the frontend.
    '''
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
    ar = anyrest.addAnyrestHandlersTesting(app, None, None, True)
else:
    client = MongoClient(uri,
                         tls=True,
                         server_api=ServerApi('1'))
    db = client['production']
    ar = anyrest.addAnyrestHandlersMongoDB(app, db, "dev-pnkvmziz4ai48pb8.us.auth0.com", "https://timelogger/api", True)

