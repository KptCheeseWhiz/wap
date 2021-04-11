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
  for (let [k, v] of Object.entries(qs).filter(
    ([_, v]) => typeof v !== "undefined" && v !== null,
  ))
    url.searchParams.append(k, (v as string | number).toString());
  return url.href;
};

export const toQuery = (base: string, qs: any = {}) => {
  const url = new URLSearchParams();
  for (let [k, v] of Object.entries(qs).filter(
    ([_, v]) => typeof v !== "undefined" && v !== null,
  ))
    url.append(k, (v as string | number).toString());
  return base + "?" + url.toString();
};

export default fetch;
