import React, { useState, useEffect } from "react";

import { useSnackbar } from "notistack";
import { EventEmitter } from "events";
import { Button, ButtonProps } from "@material-ui/core";

import Spinner from "components/Spinner";
import { download } from "helpers/http";

function PreloadingButton(
  props: { href: string; onEnded?: (canceled: boolean) => void } & ButtonProps,
) {
  const { enqueueSnackbar } = useSnackbar();

  const [progress, setProgress] = useState(0);
  const [eventemitter, setEventEmitter] = useState(null as null | EventEmitter);

  useEffect(() => {
    if (!eventemitter) return;
    eventemitter.once("done", (canceled) => {
      setEventEmitter(null);
      if (props.onEnded) props.onEnded(canceled);
    });
    eventemitter.once("error", (err) => {
      enqueueSnackbar(err.message, { variant: "error" });
      setEventEmitter(null);
    });
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
