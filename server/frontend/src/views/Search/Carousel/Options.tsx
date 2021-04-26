import React, { useState, useContext } from "react";

import { IconButton, Menu, MenuItem } from "@material-ui/core";
import { Settings as IconSettings } from "@material-ui/icons";

import { context } from "helpers/reducer";

function Options() {
  const { state, dispatch } = useContext(context);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSettingsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (action: string) => () => {
    switch (action) {
      case "seasonal":
        dispatch({ type: "SET_CAROUSEL_TYPE", value: "seasonal" });
        break;
      case "mal_watching":
        if (
          !state.carousel.usernames["mal"] ||
          state.carousel.type === "mal_watching"
        ) {
          const username = prompt("MyAnimeList username");
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
    <>
      <IconButton
        aria-label="close"
        size="small"
        style={{
          position: "fixed",
          top: 5,
          right: 5,
        }}
        onClick={handleSettingsClick}
      >
        <IconSettings />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose("")}
      >
        <MenuItem onClick={handleClose("seasonal")}>
          {state.carousel.type === "seasonal" && ">"}Seasonal
        </MenuItem>
        <MenuItem onClick={handleClose("mal_watching")}>
          {state.carousel.type === "mal_watching" && ">"}MyAnimeList
        </MenuItem>
      </Menu>
    </>
  );
}

export default Options;
