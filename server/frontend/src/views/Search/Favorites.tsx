import React, { useContext } from "react";
import { Chip } from "@material-ui/core";

import { context } from "helpers/reducer";

function Favorites() {
  const { state, dispatch } = useContext(context);

  const handleClick = (value: string) => () => {
    dispatch({ type: "SET_QUERY", value });
  };

  const handleDelete = (value: string) => () => {
    const index = state.favorites.indexOf(value);
    if (index === -1) return;
    dispatch({
      type: "SET_FAVORITES",
      value: [
        ...state.favorites.slice(0, index),
        ...state.favorites.slice(index + 1),
      ],
    });
  };

  if (state.favorites.length === 0) return <span />;
  return (
    <span
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        margin: 5,
      }}
    >
      {state.favorites.map((fav, i) => (
        <Chip
          key={i}
          label={fav}
          onClick={handleClick(fav)}
          onDelete={handleDelete(fav)}
          disabled={state.progress !== 100}
          style={{ margin: 2 }}
        />
      ))}
    </span>
  );
}

export default Favorites;
