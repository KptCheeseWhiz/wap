import React, { useState, useEffect } from "react";

import { useHistory } from "react-router";
import { useSnackbar } from "notistack";
import Plyr from "plyr-react";
import "plyr-react/dist/plyr.css";
import "./index.css";

import * as api from "helpers/api";
import { toURL } from "helpers/fetch";

import offline from "views/Offline/offline.gif";
import Spinner from "components/Spinner";
import Pad from "components/Pad";

function Player({
  video,
}: {
  video: {
    magnet: string;
    name: string;
    path: string;
    sig: string;
  };
}) {
  const { enqueueSnackbar } = useSnackbar();

  const [isOk, setOk] = useState<boolean | null>(null);
  const [subtitles, setSubtitles] = useState<
    { language: string; title: string }[]
  >([]);

  useEffect(() => {
    if (video)
      api
        .torrent_verify(video)
        .then(() => setOk(true))
        .then(() => api.player_subtitles(video))
        .then(setSubtitles)
        .catch((e: Error) => {
          if (e.message) enqueueSnackbar(e.message, { variant: "error" });
          setOk(false);
        });
  }, [video]);

  if (isOk === false)
    return (
      <img
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#303030",
        }}
        src={offline}
      />
    );

  return (
    <span
      style={{
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#303030",
      }}
    >
      <Pad />
      {isOk === true ? (
        <Plyr
          title={video?.name}
          style={{ width: "100vw", height: "100vh" }}
          source={{
            type: "video",
            // Try them all, maybe it will be in the right format
            sources: [
              "video/mp4",
              "video/webm" /*, "video/ogg", "video/3gp"*/,
            ].map((type) => ({
              src: toURL(window.location.origin + "/api/player/play", video),
              type,
            })),
            tracks: subtitles.map(({ language, title }, i) => ({
              src: toURL(window.location.origin + "/api/player/subtitle", {
                ...video,
                index: i,
              }),
              kind: "captions",
              label: title,
              srclang: language,
            })),
          }}
          options={{
            captions: { active: true, update: true },
            fullscreen: { enabled: true },
          }}
        />
      ) : (
        <Spinner size={250} />
      )}
      <Pad />
    </span>
  );
}

export default Player;
