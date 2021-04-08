import React, { useContext, useEffect, useState } from "react";

import { Card, CardMedia, Grid, Typography } from "@material-ui/core";
import Carousel from "react-material-ui-carousel";

import * as jikan from "helpers/jikan";
import { context } from "helpers/reducer";

const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const today = days[new Date().getDay()];
while (days[0] !== today) days.push(days.shift() as string);

function Seasonal() {
  const { dispatch } = useContext(context);

  const [groupBy, setGroupBy] = useState<number>(12);
  const [animes, setAnimes] = useState<jikan.IAnime[]>([]);

  useEffect(() => {
    jikan.schedule().then((resp) =>
      setAnimes(
        Object.keys(resp)
          .sort((a, b) => days.indexOf(a) - days.indexOf(b))
          .reduce(
            (a, day) => [
              ...a,
              ...resp[day].sort((a, b) => b.members - a.members),
            ],
            [] as jikan.IAnime[]
          )
      )
    );

    function handleResize() {
      setGroupBy(Math.min(12, ~~(window.innerWidth / 130)));
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onClick = (title: string) => () =>
    dispatch({ type: "SET_QUERY", value: title });

  return (
    <Carousel indicators={false} animation={"slide"} autoPlay={false}>
      {animes
        .reduce(
          (a, b) => {
            if (a[a.length - 1].length >= groupBy) a.push([]);
            a[a.length - 1].push(b as any);
            return a;
          },
          [[]] as jikan.IAnime[][]
        )
        .map((elements, i) => (
          <Card
            key={i}
            style={{
              height: 200,
              padding: 5,
              paddingBottom: 0,
            }}
          >
            <Grid
              container
              spacing={1}
              direction="row"
              justify="space-between"
              style={{
                height: "100%",
                width: "auto",
              }}
            >
              {elements.map(({ title, image_url }, j) => (
                <Grid
                  item
                  key={`${i},${j}`}
                  xs={1}
                  style={{
                    height: "100%",
                    minWidth: 120,
                  }}
                >
                  <Card
                    style={{
                      height: "100%",
                      width: "100%",
                    }}
                    onClick={onClick(title)}
                  >
                    <CardMedia
                      title={title}
                      image={image_url}
                      style={{
                        height: "100%",
                        width: "auto",
                      }}
                    >
                      <Typography
                        style={{
                          backgroundColor: "black",
                          color: "white",
                          opacity: 0.7,
                          padding: 5,
                        }}
                      >
                        {title}
                      </Typography>
                    </CardMedia>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Card>
        ))}
    </Carousel>
  );
}

export default Seasonal;
