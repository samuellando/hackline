import type { log, settings } from './types';
/* 
* This class provides all the essential methods for interacting with the backend. It takes care of centralizing and syncing data for the timeline, and settings endpoints.
 * It also provies some general rest API enpoints for workarounds and prototyping.
*/

interface data {
  [index: string]: any,
  settings: settings,
  timeline: log[]
}

interface meta {
  [index: string]: number,
  settings: number,
  timeline: number
}

export class ApiClient {
  data: data;
  refresh_interval: number;
  pulled: meta;
  syncing: meta;
  apiUrl: string;
  accessToken: string | undefined;
  interval: ReturnType<typeof setInterval>;

  constructor(apiUrl: string, accessToken: string | undefined = undefined, refresh_interval = 60000) {
    this.data = { settings: {}, timeline: [] };
    this.pulled = { timeline: 0, settings: 0 };
    this.syncing = { timeline: 0, settings: 0 };
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
    this.refresh_interval = refresh_interval;

    Object.keys(this.data).forEach((k) => {
      var s = localStorage.getItem(k);
      if (s != null) {
        this.data[k] = JSON.parse(s);
      }
      this.pullData(k);
    });

    this.pullTimeline();

    this.pullSettings();

    this.interval = setInterval(() => {
      this.pullTimeline();
      this.pullSettings();
    }, refresh_interval);
  }

  close() {
    clearInterval(this.interval);
  }

  pullData(k: string) {
    if (this.syncing[k] == 0) {
      this.syncing[k]++;
      console.log("pulling", k);
      return this.get(k, null).then((res: log[]) => {
        this.data[k] = res;
        localStorage.setItem(k, JSON.stringify(this.data[k]));
        this.pulled[k] = Date.now();
        this.syncing[k]--;
        console.log("Done pulling", k);
        return res;
      }, () => { console.error("Failed to pull", k) });
    } else {
      return new Promise((res, _) => {
        console.log("Can't pull", k, "because syncing")
        res(this.data[k]);
      });
    }
  }

  pullTimeline() {
    return this.pullData('timeline');
  }

  pullSettings() {
    return this.pullData('settings')
  }

  pulledTimeline() {
    return this.pulled.timeline;
  }

  pulledSettingsTime() {
    return this.pulled.settings;
  }

  getData(k: string) {
    if (Date.now() - this.pulled[k] < this.refresh_interval || this.syncing[k] > 0) {
      console.log("Using local", k, (Date.now() - this.pulled.timeline < this.refresh_interval) ? "because refresh interval not elapsed" : "because still syncing");
      return new Promise((res, _) => {
        res(this.data[k]);
      });
    } else {
      console.log("Not using local", k);
      return this.pull(k);
    }
  }

  getTimeline() {
    return this.getData("timeline");
  }

  getSettings() {
    return this.getData("settings");
  }

  timeline_add(log: log) {
    this.data.timeline.forEach((e) => {
      if (e["start"] >= log["start"] && e["start"] <= log["end"] && e["end"] >= log["end"]) {
        e["start"] = log["end"]
        this.patch("timeline/" + e["id"], e);
      } else if (e["start"] >= log["start"] && e["end"] <= log["end"]) {
        this.del("timeline/" + e["id"])
      }
    });
    this.post('timeline', log);
  }

  timeline_edit(id: string, log: log) {
    return;
  }

  settings_set(key: string, value: any) {
    return;
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
