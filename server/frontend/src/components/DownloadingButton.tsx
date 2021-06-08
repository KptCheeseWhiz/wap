import React, { useState, useEffect } from "react";

import { useSnackbar } from "notistack";
import { EventEmitter } from "events";
import { Button, ButtonProps } from "@material-ui/core";
import { saveAs } from "file-saver";

import Spinner from "components/Spinner";
import { download } from "helpers/http";

function DownloadingButton(
  props: { name: string; href: string } & ButtonProps,
) {
  const { enqueueSnackbar } = useSnackbar();

  const [progress, setProgress] = useState<number>(0);
  const [eventemitter, setEventEmitter] = useState<EventEmitter | null>(null);

  useEffect(() => {
    if (!eventemitter) return;
    let chunks: Uint8Array[] = [];
    eventemitter.once("done", (canceled) => {
      if (!canceled) saveAs(new Blob(chunks), props.name);
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
      setProgress(progress * 100),
    );

    return () => {
      eventemitter?.removeAllListeners();
    };
  }, [eventemitter]);

  const onClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    if (!eventemitter) setEventEmitter(download(props.href));
    else eventemitter.emit("cancel");
  };

  return (
    <Button
      aria-label={eventemitter !== null ? "Cancel" : "Download"}
      color="secondary"
      onClick={onClick}
      {...props}
    >
      {eventemitter !== null ? (
        <Spinner size={20} progress={progress} />
      ) : (
        "Download"
      )}
    </Button>
  );
}

export default DownloadingButton;
