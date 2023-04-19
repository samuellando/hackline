async function call(apiUrl: string, path: string, method: string, data: any, accessToken: string | undefined = undefined, pre = "api/") {
  let headers: any = {};
  let body: any = undefined;
  if (data != undefined) {
    body = JSON.stringify(data);
  }
  if (accessToken != undefined) {
    headers.Authorization = "Bearer " + accessToken;
  }
  const result = await fetch(apiUrl + "/" + pre + path, {
    method: method,
    headers: headers,
    body: body
  });
  return await result.json();
}

export async function get(apiUrl: string, path: string, data: any, accessToken: string | undefined = undefined) {
  path = path + "?" + new URLSearchParams(data);
  return await call(apiUrl, path, "GET", undefined, accessToken);
}

export async function post(apiUrl: string, path: string, data: any, accessToken: string | undefined = undefined) {
  return await call(apiUrl, path, "POST", data, accessToken);
}

export async function patch(apiUrl: string, path: string, data: any, accessToken: string | undefined = undefined) {
  return await call(apiUrl, path, "PATCH", data, accessToken);
}

export async function put(apiUrl: string, path: string, data: any, accessToken: string | undefined = undefined) {
  return await call(apiUrl, path, "PUT", data, accessToken);
}

export async function del(apiUrl: string, path: string, accessToken: string | undefined = undefined) {
  return await call(apiUrl, path, "DELETE", undefined, accessToken);
}

export async function getApiKey(apiUrl: string, accessToken: string | undefined = undefined) {
  return await call(apiUrl, "", "GET", undefined, accessToken, "api-key");
}

export async function deleteApiKey(apiUrl: string, accessToken: string | undefined = undefined) {
  return await call(apiUrl, "", "DELETE", undefined, accessToken, "api-key")
}

