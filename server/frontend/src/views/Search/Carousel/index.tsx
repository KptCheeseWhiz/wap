import React, { useContext, useEffect, useState } from "react";

import { useSnackbar } from "notistack";
import { Card, CardMedia, Grid, Typography } from "@material-ui/core";
import MaterialCarousel from "react-material-ui-carousel";

import Options from "./Options";

import * as jikan from "helpers/jikan";
import { context } from "helpers/reducer";

function Carousel() {
  const { enqueueSnackbar } = useSnackbar();
  const { state, dispatch } = useContext(context);

  const [groupBy, setGroupBy] = useState<number>(12);
  const [animes, setAnimes] = useState<jikan.IAnime[]>([]);

  useEffect(() => {
    function handleResize() {
      setGroupBy(Math.min(12, ~~(window.innerWidth / 130)));
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      switch (state.carousel.type) {
        case "seasonal":
          jikan.schedule().then(setAnimes);
          break;
        case "mal_watching":
          if (state.carousel.usernames["mal"]) {
            jikan
              .watching({ username: state.carousel.usernames["mal"] })
              .then(setAnimes)
              .catch((e) => {
                if (e.message) enqueueSnackbar(e.message, { variant: "error" });
                dispatch({
                  type: "SET_CAROUSEL",
                  value: { type: "seasonal", usernames: { mal: "" } },
                });
              });
          } else dispatch({ type: "SET_CAROUSEL_TYPE", value: "seasonal" });
          break;
      }
    } catch (e) {
      if (e.message) enqueueSnackbar(e.message, { variant: "error" });
      dispatch({ type: "SET_CAROUSEL_TYPE", value: "seasonal" });
    }
  }, [state.carousel.type, state.carousel.usernames]);

  const onAnimeClick = (title: string) => () =>
    dispatch({ type: "SET_QUERY", value: title });

  return (
    <>
      <MaterialCarousel indicators={false} animation={"slide"} autoPlay={false}>
        {(animes || [])
          .reduce(
            (a, b) => {
              if (a[a.length - 1].length >= groupBy) a.push([]);
              a[a.length - 1].push(b as any);
              return a;
            },
            [[]] as jikan.IAnime[][],
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
                justify="space-around"
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
                      onClick={onAnimeClick(title)}
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
      </MaterialCarousel>
      <Options />
    </>
  );
}

export default Carousel;
