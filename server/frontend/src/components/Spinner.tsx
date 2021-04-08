import React from "react";

import { CircularProgress } from "@material-ui/core";

import Pad from "components/Pad";

function Spinner({ size, progress }: { size: number; progress?: number }) {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      <Pad />
      <span
        style={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Pad />
        <CircularProgress
          variant={progress ? "determinate" : "indeterminate"}
          value={progress}
          size={size}
          color="secondary"
        />
        <Pad />
      </span>
      <Pad />
    </span>
  );
}

export default Spinner;
