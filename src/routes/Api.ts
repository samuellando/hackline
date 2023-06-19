import type { interval, settings, running, apiKey } from './types';

class BaseClient {
  apiUrl: string;
  accessToken: string | undefined;

  constructor(apiUrl: string, accessToken: string | undefined = undefined) {
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
  }

  get<T>(path: string, data: any): Promise<T> {
    if (data !== null) {
      path = path + "?" + new URLSearchParams(data);
    }
    return this.call<T>(path, "GET", undefined);

  }
  post<T>(path: string, data: T): Promise<T> {
    return this.call<T>(path, "POST", data);
  }

  patch<T>(path: string, data: any): Promise<T> {
    return this.call<T>(path, "PATCH", data);
  }

  put<T>(path: string, data: T): Promise<T> {
    return this.call<T>(path, "PUT", data);
  }

  del(path: string): Promise<null> {
    return this.call<null>(path, "DELETE", undefined);
  }

  getApiKey(): Promise<apiKey> {
    return this.call<apiKey>("", "GET", undefined, "api-key");
  }

  deleteApiKey(): Promise<null> {
    return this.call<null>("", "DELETE", undefined, "api-key")
  }

  async call<T>(path: string, method: string, data: any, pre = "api/"): Promise<T> {
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
    }).then((res) => res.json() as Promise<T>);
  }
}

enum endpoints {
  settings = "settings",
  timeline = "timeline",
  running = "running"
}

type endpointTypes = {
  settings: settings | null;
  timeline: timeline | null;
  running: running | null;
};

type timeline = interval[];

type data = {
  [key in endpoints]: key extends keyof endpointTypes ? endpointTypes[key] : never;
}

type promises = {
  [key in endpoints]: Promise<key extends keyof endpointTypes ? endpointTypes[key] : never>;
}

type meta = {
  [key in endpoints]: number
}

function deepClone<T>(e: T): T {
  return JSON.parse(JSON.stringify(e));
}

/* 
* This class provides all the essential methods for interacting with the backend. It takes care of centralizing and syncing data for the timeline, and settings endpoints.
 * It also provies some general rest API enpoints for workarounds and prototyping.
*/
export class ApiClient extends BaseClient {
  data: data;
  refresh_interval: number;
  update_interval: number;
  /*
   * These can be used to chain promises for each data element. That way we can ensure the operations do not run concurently.
   */
  promises: promises;
  /*
   * Commit promises ensure that when we write data locally, we are not overwriting a more recent data, chaining promises onto it 
   * allows monitoring and updating lastChange without any race conditions. 
   * Specifically for the following:
   * 1. Read table -> takes 5 secounds -> commits.
   * 2. At the same time we update the table -> commits locally imedietly -> does whatever it needs to do to sync.
   * 3. after 5 secounds, the data recieved from the read operation will be discarded because lastChange > start time of the read.
   */
  commitPromises: promises;
  lastChange: meta;
  syncing: meta;
  pullInterval: ReturnType<typeof setInterval>;
  updateInterval: ReturnType<typeof setInterval>;

  constructor(apiUrl: string, accessToken: string | undefined = undefined, refresh_interval = 60000, update_interval = 10000) {
    super(apiUrl, accessToken);
    this.refresh_interval = refresh_interval;
    this.update_interval = update_interval;

    this.data = Object.fromEntries(
      Object.values(endpoints).map(key => [key, null])
    ) as data;

    this.promises = Object.fromEntries(
      Object.values(endpoints).map(key => [key, Promise.resolve(null)])
    ) as promises;

    this.commitPromises = Object.fromEntries(
      Object.values(endpoints).map(key => [key, Promise.resolve(null)])
    ) as promises;

    this.lastChange = Object.fromEntries(
      Object.values(endpoints).map(key => [key, 0])
    ) as meta;

    this.syncing = Object.fromEntries(
      Object.values(endpoints).map(key => [key, 0])
    ) as meta;

    // Try to load the data from local storage, and start a new pull.
    for (const k in endpoints) {
      var s = localStorage.getItem(k);
      if (s != null) {
        this.data[k as endpoints] = JSON.parse(s);
      }
      this.pullData(k as endpoints);
    }

    // Set up the pull and update intervals. 
    this.pullInterval = setInterval(() => {
      for (const k in endpoints) {
        this.pullData(k as endpoints);
      }
    }, refresh_interval);

    this.updateInterval = setInterval(() => {
      this.updateTimeline();
      this.pullData(endpoints.running);
    }, update_interval);
  }

  close(): void {
    clearInterval(this.pullInterval);
    clearInterval(this.updateInterval);
  }

  private commit<T extends endpoints>(k: T, data: endpointTypes[T], asOf: number = (new Date()).getTime()): promises[T] {
    this.commitPromises[k] = this.commitPromises[k].then(() => {
      if (this.lastChange[k] > asOf) {
        console.error("Cannot change value", k, "Value has already been overwriten locally.")
        return this.data[k];
      }
      this.lastChange[k] = (new Date()).getTime();
      this.data[k] = data;
      localStorage.setItem(k, JSON.stringify(this.data[k]));
      return data;
    }) as promises[T];
    return this.commitPromises[k];
  }

  private pullData<T extends endpoints>(k: T): promises[T] {
    // Since we don't want concurent reads, chain this promise.
    this.syncing[k]++;
    return this.promises[k].then(async () => {
      // This is the max commit time.
      var limit = (new Date()).getTime();
      console.log("pulling", k);
      return await this.get<endpointTypes[T]>(k, null).then(async (res) => {
        console.log("Done pulling", k, "and commiting.");
        await this.commit(k, res, limit);
        this.syncing[k]--;
        return res;
      }, () => { console.error("Failed to pull", k); return this.data[k]; });
    }) as promises[T];
  }

  private updateTimeline(): promises[endpoints.timeline] {
    this.syncing.timeline++;
    return this.promises.timeline.then(async () => {
      if (this.data.timeline === null || this.data.timeline.length == 0) {
        return this.data.timeline;
      }
      let now = (new Date).getTime();
      // We want to pull since the end of the last entry.
      let lastE = this.data.timeline[this.data.timeline.length - 1];
      let last = lastE.end;
      if (last >= now) {
        this.syncing.timeline--;
        return this.data.timeline;
      }
      console.log("updateing timeline from", (now - last) / 1000);
      return await this.get<timeline>('timeline', { start: last }).then(async (res) => {
        var timeline: timeline;
        if (res.length == 0) return this.data.timeline;
        if (this.data.timeline == null) return res; // Impossible.
        if (res[0].id == lastE.id) {
          // Merge the last entry with the first.
          lastE.end = res[0].end;
          timeline = this.data.timeline.concat(res.slice(1));
        } else {
          timeline = this.data.timeline.concat(res);
        }
        console.log("Done updateing timeline and commiting.");
        await this.commit(endpoints.timeline, timeline, now);
        this.syncing.timeline--;
        return timeline;
      }, () => { console.error("Failed to udpate timeline"); return this.data.timeline; });
    });
  }

  lastChangeTimeline(): number {
    return this.lastChange.timeline;
  }

  lastChangeSettings(): number {
    return this.lastChange.settings;
  }

  lastChangeRunning(): number {
    return this.lastChange.running;
  }

  getSyncing(): { [id: string]: number } {
    let d: { [id: string]: number } = {};
    for (const k in endpoints) {
      if (this.syncing[k as endpoints] != 0) {
        d[k] = this.syncing[k as endpoints];
      }
    }
    return d;
  }

  getTimeline(start: number | undefined = undefined, end: number | undefined = undefined): timeline {
    if (this.data.timeline === null) return [];
    let timeline = deepClone<timeline>(this.data.timeline);
    if (typeof start !== "undefined") {
      for (let i = 0; i < timeline.length; i++) {
        if (timeline[i].end < start) {
          // Remove it.
          timeline.splice(i, 1);
          i--;
        } else if (timeline[i].start < start) {
          // Move the beginging.
          timeline[i].start = start;
        } else {
          break;
        }
      }
    }
    if (typeof end !== "undefined") {
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (timeline[i].start > end) {
          // Remove it.
          timeline.splice(i, 1);
        } else if (timeline[i].end > end) {
          // Move the begining.
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
          if (running !== null) {
            running.start = last.end;
            running.end = end;
            let interval = running as interval;
            interval.id = "running";
            timeline.push(interval);
          }
        }
      }
    }
    return timeline;
  }

  getSettings(): settings {
    if (this.data.settings === null) return {};
    return deepClone<settings>(this.data.settings);
  }

  getSetting(key: string) {
    let settings = this.getSettings();
    if (key in settings) {
      return settings[key];
    } else {
      return null;
    }
  }

  setSetting(key: string, value: any): promises[endpoints.settings] {
    this.syncing.settings++;
    let settings = this.getSettings();
    settings[key] = value;
    this.commit(endpoints.settings, settings, (new Date()).getTime());
    let data = {} as settings;
    data[key] = value;
    this.promises.settings = this.promises.settings.then(async () => {
      let settings = await this.patch<settings>('settings', data)
      this.syncing.settings--;
      return settings;
    });
    return this.promises.settings;
  }

  getRunning(): running | null {
    if (this.data.running === null) return null;
    let running = deepClone<running>(this.data.running);
    let now = (new Date()).getTime();
    if (typeof running.end == "undefined" || running.end > now || typeof running.fallback == "undefined") {
      return running;
    } else {
      return { title: running.fallback, start: running.end }
    }
  }

  setRunning(title: string, start: number = (new Date()).getTime()): promises[endpoints.running] {
    this.syncing.running++;
    let r: running = { title: title, start: start };
    this.commit(endpoints.running, r, start);
    this.promises.running = this.promises.running.then(async () => {
      let running = await this.put<running>('running', r);
      this.syncing.running--;
      return running;
    });
    return this.promises.running;
  }

  timelineAdd(log: interval): promises[endpoints.timeline] {
    this.syncing.timeline++;
    var limit = (new Date()).getTime();
    var timeline = this.timelinePreviewAdd(log);
    this.commit(endpoints.timeline, timeline, limit);
    this.promises.timeline = this.promises.timeline.then(async () => {
      await this.post<interval>('timeline', log);
      this.syncing.timeline--;
      return timeline;
    });
    return this.promises.timeline;
  }

  timelinePreviewAdd(log: interval, start: number | undefined = undefined, end: number | undefined = undefined): timeline {
    let timeline = this.getTimeline(start, end);
    for (let i = 0; i < timeline.length; i++) {
      let e = timeline[i];
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

    var inserted = false
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].start >= log.end) {
        timeline.splice(i, 0, log);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      timeline.push(log);
    }

    return timeline;
  }

  timelineEdit(log: interval): promises[endpoints.timeline] {
    this.syncing.timeline++;
    let id = log.id;
    var limit = (new Date()).getTime();
    var timeline = this.getTimeline();
    timeline.forEach((e: interval) => {
      if (e.id == id) {
        e.title = log.title;
      }
    });
    this.commit(endpoints.timeline, timeline, limit);

    this.promises.timeline = this.promises.timeline.then(async () => {
      await this.patch('timeline/' + id, { title: log.title })
      this.syncing.timeline--;
      return timeline;
    });
    return this.promises.timeline;
  }
}

