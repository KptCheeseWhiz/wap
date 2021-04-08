import React from "react";

import { Typography, Card, CardMedia } from "@material-ui/core";

import offline from "./offline.gif";
import Pad from "components/Pad";

function Offline() {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Pad />
      <Card
        style={{
          padding: 5,
          margin: 25,
        }}
      >
        <CardMedia
          title="offline"
          image={offline}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <Typography
            style={{
              backgroundColor: "black",
              color: "white",
              opacity: 0.7,
              padding: 5,
            }}
            variant="h1"
            align="center"
          >
            {"I cannyot tawk t-to my sewvew... Pwease twy again watew ow, if the pwobwem is on youw e-end, when you have a w-wowking intewnyet connyection >w<"}
          </Typography>
        </CardMedia>
      </Card>
      <Pad />
    </span>
  );
}

export default Offline;
