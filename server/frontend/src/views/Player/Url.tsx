import React, { useState, useEffect } from "react";

import { useHistory } from "react-router";
import Player from "./index";

function UrlPlayer() {
  const history = useHistory();

  const [video, setVideo] = useState<{
    magnet: string;
    name: string;
    path: string;
    sig: string;
  }>();

  useEffect(() => {
    const { magnet, name, path, sig } = Object.fromEntries(
      new URLSearchParams(history.location.search.slice(1)).entries(),
    );

    if (
      magnet === undefined ||
      name === undefined ||
      path === undefined ||
      sig === undefined
    )
      return;

    window.document.title = name;
    setVideo({ magnet, name, path, sig });
  }, [history.location.search]);

  if (!video) return <span />;
  return <Player video={video} />;
}

export default UrlPlayer;
