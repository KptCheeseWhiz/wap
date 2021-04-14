import React, { useContext } from "react";

import { createStyles, makeStyles } from "@material-ui/core/styles";
import { LinearProgress } from "@material-ui/core";

import { context } from "helpers/reducer";

const useStyles = makeStyles(() =>
  createStyles({
    finished: {
      transition: "opacity 1s linear",
      opacity: 0,
    },
  })
);

function LoadingBar() {
  const classes = useStyles();
  const { state } = useContext(context);

  return (
    <LinearProgress
      variant={state.progress === -1 ? "indeterminate" : "determinate"}
      className={state.progress === 100 ? classes.finished : ""}
      value={state.progress}
      color="secondary"
    />
  );
}

export default LoadingBar;
