import React, { useState, useEffect } from "react";

import { useSnackbar } from "notistack";
import { EventEmitter } from "events";
import { Button, ButtonProps } from "@material-ui/core";

import Spinner from "components/Spinner";

const consume = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ee: EventEmitter,
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

function PreloadingButton(
  props: { href: string; onEnded?: () => void } & ButtonProps,
) {
  const { enqueueSnackbar } = useSnackbar();

  const [progress, setProgress] = useState(0);
  const [eventemitter, setEventEmitter] = useState(null as null | EventEmitter);

  useEffect(() => {
    if (!eventemitter) return;
    eventemitter.once("done", () => {
      if (props.onEnded) props.onEnded();
      setEventEmitter(null);
    });
    eventemitter.once("error", (err) => {
      enqueueSnackbar(err.message, { variant: "error" });
      setEventEmitter(null);
    });
    eventemitter.on("progress", (progress: number) =>
      setProgress(progress * 100),
    );
  }, [eventemitter]);

  const onClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    if (!eventemitter) setEventEmitter(download(props.href));
    else eventemitter.emit("cancel");
  };

  return (
    <Button
      aria-label={eventemitter !== null ? "Cancel" : "Preload"}
      color="secondary"
      onClick={onClick}
      {...props}
    >
      {eventemitter !== null ? (
        <Spinner size={20} progress={progress} />
      ) : (
        "Preload"
      )}
    </Button>
  );
}

export default PreloadingButton;
