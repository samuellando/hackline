import type { log } from './types';
/* 
* This class provides all the essential methods for interacting with the backend. It takes care of centralizing and syncing data for the timeline, and settings endpoints.
 * It also provies some general rest API enpoints for workarounds and prototyping.
*/
export class ApiClient {
  settings: any = {};
  timeline: log[] = [];
  refresh_interval = 60000;
  pulled = { timeline: 0, settings: 0 };
  syncing = { timeline: 0, settings: 0 };
  apiUrl: string = "";
  accessToken: string | undefined = "";
  path = "settings/settings";

  constructor(apiUrl: string, accessToken: string | undefined = undefined, refresh_interval = 60000) {
    this.pulled = { timeline: 0, settings: 0 };
    this.syncing = { timeline: 0, settings: 0 };
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
    this.refresh_interval = refresh_interval;
    var timelineS = localStorage.getItem('timeline');
    if (timelineS != null) {
      this.timeline = JSON.parse(timelineS);
    }
    var settingsS = localStorage.getItem('settings');
    if (settingsS != null) {
      this.settings = JSON.parse(settingsS);
    }
    this.pull_timeline();
    this.pull_settings();
  }

  pull_timeline() {
    if (this.syncing.timeline == 0) {
      this.get("timeline", null).then((res: log[]) => {
        this.timeline = res;
        localStorage.setItem('timeline', JSON.stringify(this.timeline));
        this.pulled.timeline = Date.now();
        return this.timeline;
      }, () => { console.error("Failed to pull timeline") });
    }
  }

  pull_settings() {
    if (this.syncing.settings == 0) {
      this.get("settings", null).then((res) => {
        this.settings = res;
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.pulled.settings = Date.now();
        return this.settings;
      }, () => { console.error("Failed to pull settings") });
    }
  }

  get_timeline() {
    if (Date.now() - this.pulled.timeline < this.refresh_interval || this.syncing.timeline > 0) {
      return new Promise((res, _) => {
        res(this.timeline);
      });
    } else {
      this.pull_timeline();
    }
  }

  get_settings() {
    if (Date.now() - this.pulled.settings < this.refresh_interval || this.syncing.settings > 0) {
      return new Promise((res, _) => {
        res(this.settings);
      });
    } else {
      this.pull_settings();
    }
  }

  timeline_add(log: log) {
    this.timeline.foreach((e) => {
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
