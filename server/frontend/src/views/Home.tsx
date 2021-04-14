import React from "react";

import { Typography, Link, Paper, Button } from "@material-ui/core";
import { useHistory, Redirect } from "react-router-dom";

import Pad from "components/Pad";

import * as storage from "helpers/storage";

function Home() {
  const history = useHistory();

  const onClick = (route: string) => (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    storage.set("gotit", "yes");
    history.push(route);
  };

  if (storage.get("gotit")) return <Redirect to="/search" />;

  return (
    <span
      style={{
        display: "flex",
        flexDirection: "row",
      }}
    >
      <Pad />
      <Paper
        style={{
          padding: 25,
          margin: 10,
          marginTop: 100,
        }}
      >
        <Typography variant="h2">Web Anime Player</Typography>
        <Typography variant="h5" style={{ marginTop: 10 }}>
          The stream links only work if you follow the instructions...
          <li>
            For Android users: install{" "}
            <Link
              target="_blank"
              rel="noreferer noopener"
              href="https://play.google.com/store/apps/details?id=org.videolan.vlc"
            >
              VLC
            </Link>
          </li>
          <li>For other users: use the embedded player</li>
        </Typography>
        <Button
          aria-label="Got it"
          style={{ marginTop: 10 }}
          variant="contained"
          color="secondary"
          href="/search"
          onClick={onClick("/search")}
          fullWidth
        >
          Got it
        </Button>
      </Paper>
      <Pad />
    </span>
  );
}

export default Home;
