import React, { useContext, useEffect } from "react";

import { Modal, IconButton } from "@material-ui/core";
import { Close as CloseIcon } from "@material-ui/icons";

import StatePlayer from "views/Player/State";

import { context } from "helpers/reducer";

function PlayerModal() {
  const { state, dispatch } = useContext(context);

  const handleClose = () => {
    dispatch({
      type: "SET_VIDEO",
      value: {
        open: false,
        magnet: undefined,
        name: undefined,
        path: undefined,
        sig: undefined,
      },
    });
  };

  useEffect(() => {
    // Hide html scrollbar to avoid scrolling while the modal is open
    (document.firstElementChild as HTMLHtmlElement).style.overflow = state.video
      .open
      ? "hidden"
      : "inherit";
  }, [state.video.open]);

  return (
    <>
      <Modal open={state.video.open} onClose={handleClose}>
        <div
          tabIndex={-1}
          style={{
            overflow: "hidden",
            width: "100vw",
            height: "100vh",
          }}
        >
          <StatePlayer />
          <IconButton
            aria-label="close"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
            }}
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </Modal>
    </>
  );
}

export default PlayerModal;
