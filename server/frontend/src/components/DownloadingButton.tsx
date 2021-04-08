import React, { useState, useEffect } from "react";

import { useSnackbar } from "notistack";
import { EventEmitter } from "events";
import { Button } from "@material-ui/core";
import { saveAs } from "file-saver"

import Spinner from "components/Spinner";

const consume = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ee: EventEmitter
) => {
  let cancel = false;
  ee.once("cancel", () => {
    cancel = true;
    reader.cancel();
  });

  function pump() {
    if (!reader) return ee.emit("done", cancel);

    reader
      .read()
      .then(({ done, value }) => {
        if (done) return ee.emit("done", cancel);

        if (!value && !done) return ee.emit("error", new Error("uhhh?")); // should only be empty when done
        ee.emit("chunk", value);
        pump();
      })
      .catch((err) => ee.emit("error", err));
  }
  pump();
};

const download = (
  input: RequestInfo,
  init?: RequestInit & { json?: any }
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
          ee.emit("progress", (total += value.byteLength) / total_length)
        );
      }
      return consume(resp.body.getReader(), ee);
    })
    .catch((err) => ee.emit("error", err));

  return ee;
};

function LoadingButton({ url, name }: { url: string; name: string }) {
  const { enqueueSnackbar } = useSnackbar();

  const [progress, setProgress] = useState(0);
  const [eventemitter, setEventEmitter] = useState(null as null | EventEmitter);

  useEffect(() => {
    if (!eventemitter) return;
    let chunks: Uint8Array[] = [];
    eventemitter.once("done", (cancel) => {
      if (!cancel) saveAs(new Blob(chunks), name);
      chunks = [];
      setEventEmitter(null);
    });
    eventemitter.once("error", (err) => {
      enqueueSnackbar(err.message, { variant: "error" });
      chunks = [];
      setEventEmitter(null);
    });
    eventemitter.on("chunk", (chunk: Uint8Array) => chunks.push(chunk));
    eventemitter.on("progress", (progress: number) =>
      setProgress(progress * 100)
    );
  }, [eventemitter]);

  const onClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    if (!eventemitter) setEventEmitter(download(url));
    else eventemitter.emit("cancel");
  };

  return (
    <Button
      aria-label={eventemitter !== null ? "Cancel" : "Download"}
      color="secondary"
      href={url}
      onClick={onClick}
    >
      {eventemitter !== null ? (
        <Spinner size={20} progress={progress} />
      ) : (
        "Download"
      )}
    </Button>
  );
}

export default LoadingButton;
