import React from "react";

import { createStyles, makeStyles } from "@material-ui/core/styles";
import { LinearProgress } from "@material-ui/core";

const useStyles = makeStyles(() =>
  createStyles({
    finished: {
      transition: "opacity 1s linear",
      opacity: 0,
    },
  }),
);

function LoadingBar({ progress }: { progress: number }) {
  const classes = useStyles();

  return (
    <LinearProgress
      variant={progress === -1 ? "indeterminate" : "determinate"}
      className={progress === 100 ? classes.finished : ""}
      value={progress}
      color="secondary"
    />
  );
}

export default LoadingBar;
