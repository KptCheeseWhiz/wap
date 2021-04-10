const fetch = async <T>(
  input: RequestInfo,
  init?: RequestInit & { json?: any },
): Promise<T> => {
  if (init?.json) {
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(init.json);
  }

  return await window.fetch(input, init).then(async (resp) => {
    if (resp.headers.get("content-type")?.indexOf("application/json") !== -1) {
      const json = await resp.json();
      if (!resp.ok) {
        console.error(json);
        throw new Error(json.message);
      }
      return json;
    } else {
      const text = await resp.text();
      if (!resp.ok) {
        console.error(text);
        throw new Error(text);
      }
      return text;
    }
  });
};

export const toURL = (base: string, qs: any = {}) => {
  const url = new URL(base);
  for (let [k, v] of Object.entries(qs).filter(([_, v]) => !!v))
    url.searchParams.append(k, (v as string | number).toString());
  return url.href;
};

export const toQuery = (base: string, qs: any = {}) => {
  const url = new URLSearchParams();
  for (let [k, v] of Object.entries(qs).filter(([_, v]) => !!v))
    url.append(k, (v as string | number).toString());
  return base + "?" + url.toString();
};

export const toPayloadQuery = (base: string, qs: any = {}) =>
  base +
  "?payload=" +
  encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(qs))));

export default fetch;
