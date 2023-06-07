import type { log, settings, running } from './types';
/* 
* This class provides all the essential methods for interacting with the backend. It takes care of centralizing and syncing data for the timeline, and settings endpoints.
 * It also provies some general rest API enpoints for workarounds and prototyping.
*/

interface data {
  [index: string]: any,
  settings: settings,
  timeline: log[],
  running: running
}

interface promises {
  [index: string]: any,
  settings: Promise<settings>,
  timeline: Promise<log[]>,
  running: Promise<running>
}

interface meta {
  [index: string]: number,
  settings: number,
  timeline: number
  running: number
}

export class ApiClient {
  data: data;
  refresh_interval: number;
  update_interval: number;
  lastChange: meta;
  promises: promises;
  commitPromise: Promise<any>;
  apiUrl: string;
  accessToken: string | undefined;
  pullInterval: ReturnType<typeof setInterval>;
  updateInterval: ReturnType<typeof setInterval>;

  constructor(apiUrl: string, accessToken: string | undefined = undefined, refresh_interval = 60000, update_interval = 10000) {
    this.data = { settings: {}, timeline: [], running: {} };
    this.lastChange = { timeline: 0, settings: 0, running: 0 };
    this.promises = { timeline: new Promise((f) => f([])), settings: new Promise((f) => f({})), running: new Promise((f) => f({})) };
    this.commitPromise = new Promise((f) => f(null));
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
    this.refresh_interval = refresh_interval;
    this.update_interval = update_interval;

    Object.keys(this.data).forEach((k) => {
      var s = localStorage.getItem(k);
      if (s != null) {
        this.data[k] = JSON.parse(s);
      }
      this.pullData(k);
    });

    this.pullInterval = setInterval(() => {
      Object.keys(this.data).forEach((k) => {
        var s = localStorage.getItem(k);
        if (s != null) {
          this.data[k] = JSON.parse(s);
        }
        this.pullData(k);
      });
    }, refresh_interval);

    this.updateInterval = setInterval(() => {
      this.updateTimeline();
      this.pullData('running');
    }, update_interval);
  }

  close() {
    clearInterval(this.pullInterval);
    clearInterval(this.updateInterval);
  }

  pullData(k: string) {
    this.promises[k] = this.promises[k].then(async () => {
      var limit = (new Date()).getTime();
      console.log("pulling", k);
      return await this.get(k, null).then((res: log[]) => {
        this.commit(k, res, limit);
        console.log("Done pulling", k);
        return res;
      }, () => { console.error("Failed to pull", k) });
    });
  }

  commit(k: string, data: any, asOf: number = (new Date()).getTime()) {
    this.commitPromise = this.commitPromise.then(() => {
      if (this.lastChange[k] > asOf) {
        console.error("Cannot change value", k, "Value has already been overwriten locally.")
        return null;
      }
      this.lastChange[k] = (new Date()).getTime();
      this.data[k] = data;
      localStorage.setItem(k, JSON.stringify(this.data[k]));
    });
  }

  updateTimeline() {
    this.promises.timeline = this.promises.timeline.then(async () => {
      if (this.data.timeline.length == 0) return this.data.timeline;
      let now = (new Date).getTime();
      let lastE = this.data.timeline[this.data.timeline.length - 1];
      let last = lastE.end;
      if (last > now) return this.data.timeline;
      console.log("updateing timeline from", (now - last) / 1000);
      return await this.get('timeline', { start: last }).then((res: log[]) => {
        var timeline: log[];
        if (res.length == 0) return this.data.timeline;
        if (res[0].id == lastE.id) {
          lastE.end = res[0].end;
          timeline = this.data.timeline.concat(res.slice(1));
        } else {
          timeline = this.data.timeline.concat(res);
        }
        this.commit('timeline', timeline, now);
        console.log("Done updateing timeline");
        return timeline;
      }, () => { console.error("Failed to udpate timeline"); return this.data.timeline; });
    });
  }

  lastChangeTimeline() {
    return this.lastChange.timeline;
  }

  lastChangeSettings() {
    return this.lastChange.settings;
  }

  lastChangeRunning() {
    return this.lastChange.running;
  }

  getTimeline(start: number | undefined = undefined, end: number | undefined = undefined) {
    let timeline = JSON.parse(JSON.stringify(this.data.timeline));
    if (typeof start !== "undefined") {
      for (let i = 0; i < timeline.length; i++) {
        if (timeline[i].end < start) {
          timeline.splice(i, 1);
          i--;
        } else if (timeline[i].start < start) {
          timeline[i].start = start;
        } else {
          break;
        }
      }
    }
    if (typeof end !== "undefined") {
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (timeline[i].start > end) {
          timeline.splice(i, 1);
        } else if (timeline[i].end > end) {
          timeline[i].end = end;
        } else {
          break;
        }
      }
      let last = timeline[timeline.length - 1];
      if (last.end < end) {
        if (last.id == "running") {
          last.end = end;
        } else {
          let running = this.getRunning();
          running.start = last.end;
          running.end = end;
          timeline.push(running);
        }
      }
    }
    return timeline;
  }

  getSettings() {
    return JSON.parse(JSON.stringify(this.data.settings));
  }

  getSetting(key: string) {
    let settings = JSON.parse(JSON.stringify(this.data.settings));
    if (key in settings) {
      return settings[key];
    } else {
      return null;
    }
  }

  setSetting(key: string, value: any) {
    var settings = JSON.parse(JSON.stringify(this.data.settings));
    settings[key] = value;
    this.commit('settings', settings, (new Date()).getTime());
    let data = {} as { [key: string]: any };
    data[key] = value;
    this.promises.settings.then(async () => await this.patch('settings', data));
  }

  getRunning() {
    let running = JSON.parse(JSON.stringify(this.data.running));
    let now = (new Date()).getTime();
    if (running.end === undefined || running.end > now) {
      return running;
    } else {
      return { title: running.fallback, start: running.end }
    }
  }

  setRunning(title: string, start: number = (new Date()).getTime()) {
    let r = { title: title, start: start };
    this.commit('running', r, start);
    this.promises.running = this.promises.running.then(async () => {
      await this.put('running', r);
    });
  }

  timelineAdd(log: log) {
    var limit = (new Date()).getTime();
    var timeline = this.timelinePreviewAdd(log);
    this.commit('timeline', timeline, limit);
    this.promises.timeline.then(async () => await this.post('timeline', log));
  }

  timelinePreviewAdd(log: log, start: number | undefined = undefined, end: number | undefined = undefined) {
    var timeline: log[];
    timeline = this.getTimeline(start, end);
    for (let i = 0; i < timeline.length; i++) {
      let e = timeline[i];
      console.log(e, log);
      /*
       * 0 0 0 0 => nothing
       * 0 1 0 0 => Move end to log.start.
       * 1 1 0 0 => Delete it.
       * 1 1 0 1 => Move start to log.end.
       * 0 1 0 1 => Splice it.
       */
      var c = 0;
      c = c | (e.start > log.start ? 0b1000 : 0);
      c = c | (e.end > log.start ? 0b0100 : 0);
      c = c | (e.start > log.end ? 0b0010 : 0);
      c = c | (e.end > log.end ? 0b0001 : 0);

      console.log("mask", c.toString(2));
      switch (c) {
        case 0b0100:
          e.end = log.start;
          break;
        case 0b1100:
          timeline.splice(i, 1);
          i--;
          break;
        case 0b1101:
          e.start = log.end;
          break;
        case 0b0101:
          let n = JSON.parse(JSON.stringify(e));
          e.end = log.start;
          n.start = log.end;
          timeline.splice(i + 1, 0, n);
          i++;
          break;
      }
    }

    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].start >= log.end) {
        timeline.splice(i, 0, log);
        break;
      }
    }

    return timeline;
  }

  timelineEdit(log: log) {
    let id = log.id;
    var limit = (new Date()).getTime();
    var timeline = this.getTimeline();
    timeline.forEach((e: log) => {
      if (e.id == id) {
        e.title = log.title;
      }
    });
    this.commit('timeline', timeline, limit);
    this.promises.timeline.then(async () => await this.patch('timeline/' + id, { title: log.title }));
  }

  get(path: string, data: any) {
    if (data !== null) {
      path = path + "?" + new URLSearchParams(data);
    }
    return this.call(path, "GET", undefined);

  }
  post(path: string, data: any) {
    return this.call(path, "POST", data);
  }

  patch(path: string, data: any) {
    return this.call(path, "PATCH", data);
  }

  put(path: string, data: any) {
    return this.call(path, "PUT", data);
  }

  del(path: string) {
    return this.call(path, "DELETE", undefined);
  }

  getApiKey() {
    return this.call("", "GET", undefined, "api-key");
  }

  deleteApiKey() {
    return this.call("", "DELETE", undefined, "api-key")
  }

  async call(path: string, method: string, data: any, pre = "api/") {
    let headers: any = {};
    let body: any = undefined;
    if (data != undefined) {
      body = JSON.stringify(data);
    }
    if (this.accessToken != undefined) {
      headers.Authorization = "Bearer " + this.accessToken;
    }
    return fetch(this.apiUrl + "/" + pre + path, {
      method: method,
      headers: headers,
      body: body
    }).then((res) => res.json());
  }
}
