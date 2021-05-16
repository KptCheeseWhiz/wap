import EventEmitter from "events";

export const fetch = async <T>(
  input: RequestInfo,
  init?: RequestInit & { json?: any },
): Promise<T> => {
  if (init?.json) {
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(init.json);
  }

  return await window.fetch(input, init).then(async (resp) => {
    if (resp.headers.get("content-type")?.indexOf("application/json") !== -1) {
      if (resp.status === 204) return;
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

export const consume = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ee: EventEmitter,
) => {
  let canceled = false;
  ee.once("cancel", () => {
    canceled = true;
    reader.cancel();
  });

  function pump() {
    if (!reader) return ee.emit("done", canceled);

    reader
      .read()
      .then(({ done, value }) => {
        if (done) return ee.emit("done", canceled);

        if (!value && !done) return ee.emit("error", new Error("uhhh?")); // should only be empty when done
        ee.emit("chunk", value);
        pump();
      })
      .catch((err) => ee.emit("error", err));
  }
  pump();
};

export const download = (
  input: RequestInfo,
  init?: RequestInit & { json?: any },
): EventEmitter => {
  if (init?.json) {
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(init.json);
  }

  const ee = new EventEmitter();

  window
    .fetch(input, init)
    .then(async (resp) => {
      if (!resp.ok) throw new Error(await resp.text());
      if (!resp.body) return ee.emit("done", false);
      if (resp.headers.has("content-length")) {
        const total_length = Number(resp.headers.get("content-length"));
        let total = 0;
        ee.on("chunk", (value: Uint8Array) =>
          ee.emit("progress", (total += value.byteLength) / total_length),
        );
      }
      return consume(resp.body.getReader(), ee);
    })
    .catch((err) => ee.emit("error", err));

  return ee;
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
