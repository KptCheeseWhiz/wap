import React, { useState, useEffect, useRef } from "react";

import { useSnackbar } from "notistack";
import Plyr, { HTMLPlyrVideoElement } from "plyr-react";
import "plyr-react/dist/plyr.css";
import "./index.css";

import * as api from "helpers/api";
import { toURL } from "helpers/fetch";
import * as storage from "helpers/storage";

import offline from "views/Offline/offline.gif";
import Spinner from "components/Spinner";
import Pad from "components/Pad";

const WINDOW_TITLE = document.title;

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

  const ref = useRef<HTMLPlyrVideoElement>();
  const [isOk, setOk] = useState<boolean | null>(null);
  const [subtitles, setSubtitles] = useState<
    { label: string; srclang: string; index: number }[]
  >([]);

  // Cleanup player after unmount
  useEffect(() => () => ref?.current?.plyr?.destroy(), []);

  useEffect(() => {
    if (video)
      api
        .torrent_verify(video)
        .then(() => api.player_subtitles(video))
        .then((subs) => {
          if (subs.length > 0) {
            const plyr = storage.get("plyr") || {};
            if (
              plyr.captions &&
              (!plyr.language ||
                !subs.some((sub) => sub.srclang === plyr.language))
            )
              storage.set("plyr", { ...plyr, language: subs[0].srclang });
          }
          return subs;
        })
        .then(setSubtitles)
        .then(() => {
          document.title = video.name;
          setOk(true);
        })
        .catch((e: Error) => {
          if (e.message) enqueueSnackbar(e.message, { variant: "error" });
          setOk(false);
        });
    return () => {
      document.title = WINDOW_TITLE;
    };
  }, [video]);

  if (isOk === false)
    return (
      <img
        alt="An error has occured"
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
          ref={ref as any}
          title={video?.name}
          style={{ width: "100vw", height: "100vh" }}
          source={{
            title: video.name,
            type: "video",
            sources: [
              "video/mp4",
              // "video/webm", "video/ogg", "video/3gp",
            ].map((type) => ({
              src: toURL(window.location.origin + "/api/player/play", video),
              type,
            })),
            tracks: subtitles.map(({ label, srclang: srcLang, index }, i) => ({
              src: toURL(window.location.origin + "/api/player/subtitle", {
                ...video,
                index,
              }),
              kind: "subtitles",
              label,
              srcLang,
              default: !i,
            })),
          }}
          options={{
            captions: { active: true, update: true },
            invertTime: false,
            keyboard: {
              global: true,
            },
            tooltips: {
              controls: true,
              seek: true,
            },
            controls: [
              "play-large",
              "play",
              "progress",
              "current-time",
              "mute",
              "volume",
              "captions",
              "settings",
              "fullscreen",
            ],
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
