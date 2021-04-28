import React, { useState, useContext } from "react";
import "./index.css";

import { IconButton, Menu, MenuItem } from "@material-ui/core";
import { Settings as IconSettings } from "@material-ui/icons";
import smalltalk from "smalltalk";

import { context } from "helpers/reducer";

function Settings({
  style,
}: {
  style?: React.CSSProperties;
}) {
  const { state, dispatch } = useContext(context);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(event.currentTarget);

  const handleClose = (action: string) => async () => {
    switch (action) {
      case "seasonal":
        dispatch({ type: "SET_CAROUSEL_TYPE", value: "seasonal" });
        break;
      case "mal_watching":
        if (
          !state.carousel.usernames["mal"] ||
          state.carousel.type === "mal_watching"
        ) {
          // Scuffed... but that will do for now
          const username = await smalltalk
            .prompt<string>("MyAnimeList username", "")
            .catch(() => "");
          if (!username) return;

          dispatch({
            type: "SET_CAROUSEL",
            value: { type: "mal_watching", usernames: { mal: username } },
          });
        } else dispatch({ type: "SET_CAROUSEL_TYPE", value: "mal_watching" });
        break;
    }
    setAnchorEl(null);
  };

  return (
    <span style={style}>
      <IconButton aria-label="close" onClick={handleSettingsClick}>
        <IconSettings />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose("")}
        disableScrollLock={true}
      >
        <MenuItem onClick={handleClose("seasonal")}>
          {state.carousel.type === "seasonal" && ">"}Seasonal
        </MenuItem>
        <MenuItem onClick={handleClose("mal_watching")}>
          {state.carousel.type === "mal_watching" && ">"}MyAnimeList
        </MenuItem>
      </Menu>
    </span>
  );
}

export default Settings;
