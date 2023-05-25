import { get, patch } from './Api';
var settings: any;
var synced: boolean = false;;

export class SettingsClient {
  settings: any = {};
  pulled: boolean = false;
  syncing: number = 0;
  apiUrl: string = "";
  accessToken: string | undefined = "";
  path = "settings/settings";

  constructor(apiUrl: string, accessToken: string | undefined = undefined) {
    this.pulled = false;
    this.syncing = 0;
    this.apiUrl = apiUrl;
    this.accessToken = accessToken;
    this.pull();
  }

  async pull() {
    if (this.syncing == 0) {
      get(this.apiUrl, this.path, null, this.accessToken).then((res) => {
        this.settings = res;
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.pulled = true;
      }, () => { console.error("Failed to pull settings") });
    }
  }

  async push() {
    this.syncing++;
    await patch(this.apiUrl, this.path, this.settings, this.accessToken);
    this.syncing--;
  }

  isSynced() {
    return this.syncing == 0 && this.pulled;
  }

  get(key: string) {
    if (!this.pulled) {
      var settingsS = localStorage.getItem('settings');
      if (settingsS != null) {
        settings = JSON.parse(settingsS);
      }
    } else {
      settings = this.settings;
    }
    return settings[key];
  }

  set(key: string, value: any) {
    this.settings[key] = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('settings', JSON.stringify(this.settings));
    }
    this.push();
  }
}
