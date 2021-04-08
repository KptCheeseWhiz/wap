import React, { useState, useContext, useEffect } from "react";

import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@material-ui/icons";
import { OutlinedInput, IconButton } from "@material-ui/core";

import { context } from "helpers/reducer";

function SearchBar() {
  const { state, dispatch } = useContext(context);
  
  const [query, setQuery] = useState<string>("");
  const [placeHolder, setPlaceHolder] = useState<string>("");

  useEffect(() => {
    if (query !== state.search.query) setQuery(state.search.query);
  }, [state.search.query]);

  useEffect(() => {
    switch (state.search.engine) {
      case "nyaa":
        setPlaceHolder("Search on nyaa.si");
        break;
      default:
        setPlaceHolder("Search on ???");
        break;
    }
  }, [state.search.engine]);

  const onClick = () => dispatch({ type: "SET_QUERY", value: query });

  const removeFavorite = () => {
    const index = state.favorites.indexOf(query);
    if (index === -1) return;
    dispatch({
      type: "SET_FAVORITES",
      value: [
        ...state.favorites.slice(0, index),
        ...state.favorites.slice(index + 1),
      ],
    });
  };

  const addFavorite = () =>
    dispatch({ type: "SET_FAVORITES", value: [query, ...state.favorites] });

  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) =>
    event.key === "Enter" && dispatch({ type: "SET_QUERY", value: query });

  const onChange = (statefn: React.Dispatch<any>) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => statefn(event.target.value);

  return (
    <OutlinedInput
      style={{ margin: 5 }}
      type="text"
      aria-label={placeHolder}
      placeholder={placeHolder}
      value={query}
      onKeyDown={onEnter}
      onChange={onChange(setQuery)}
      disabled={state.progress !== 100}
      endAdornment={
        <>
          {query &&
            (state.favorites.indexOf(query) === -1 ? (
              <IconButton aria-label="Favorite" onClick={addFavorite}>
                <StarBorderIcon />
              </IconButton>
            ) : (
              <IconButton aria-label="Unfavorite" onClick={removeFavorite}>
                <StarIcon />
              </IconButton>
            ))}
          <IconButton aria-label="Search" disabled={!query} onClick={onClick}>
            <SearchIcon />
          </IconButton>
        </>
      }
    />
  );
}

export default SearchBar;
