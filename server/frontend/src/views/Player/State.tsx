import React, { useContext } from "react";

import Player from "./index";
import { context } from "helpers/reducer";

function StatePlayer() {
  const { state } = useContext(context);

  if (
    !state.video ||
    state.video.magnet === undefined ||
    state.video.name === undefined ||
    state.video.path === undefined ||
    state.video.sig === undefined
  )
    return <span />;
  return (
    <Player
      video={{
        magnet: state.video.magnet,
        name: state.video.name,
        path: state.video.path,
        sig: state.video.sig,
      }}
    />
  );
}

export default StatePlayer;
