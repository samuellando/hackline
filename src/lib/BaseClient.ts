import type { apiKey } from '$lib/types';

export class BaseClient {
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

  private async call<T>(path: string, method: string, data: any, pre = "api/"): Promise<T> {
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
