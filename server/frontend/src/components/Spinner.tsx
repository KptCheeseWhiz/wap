import React from "react";

import { CircularProgress } from "@material-ui/core";

import Centered from "components/Centered";

function Spinner({ size, progress }: { size: number; progress?: number }) {
  return (
    <Centered
      component={"span"}
      style={{ width: "100%", height: "100%" }}
      direction={"row"}
    >
      <CircularProgress
        variant={progress && progress !== -1 ? "determinate" : "indeterminate"}
        value={progress}
        size={size}
        color="secondary"
      />
    </Centered>
  );
}

export default Spinner;
