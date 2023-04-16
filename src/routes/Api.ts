async function call(apiUrl: string, path: string, method: string, data: any, accessToken: string | undefined = undefined) {
  let headers: any = {};
  let body: any = undefined;
  if (data != undefined) {
    body = JSON.stringify(data);
  }
  if (accessToken != undefined) {
    headers.Authorization = "Bearer " + accessToken;
  }
  const result = await fetch(apiUrl + "/api/" + path, {
    method: method,
    headers: headers,
    body: body
  });
  const json = await result.json();
  console.log(json);
}

export async function get(apiUrl: string, path: string, accessToken: string | undefined = undefined) {
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
