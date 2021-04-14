import React, { useContext, useState, useEffect } from "react";

import { useSnackbar } from "notistack";
import { useHistory } from "react-router-dom";
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableBody,
} from "@material-ui/core";

import SearchBar from "views/Search/SearchBar";
import Pagination from "views/Search/Pagination";
import TorrentRow from "views/Search/TorrentRow";
import Favorites from "views/Search/Favorites";
import Seasonal from "views/Search/Seasonal";

import { context } from "helpers/reducer";
import * as api from "helpers/api";
import { toQuery } from "helpers/fetch";

import LoadingBar from "components/LoadingBar";

function Search() {
  const { state, dispatch } = useContext(context);
  const { enqueueSnackbar } = useSnackbar();
  const history = useHistory();

  const [columns, setColumns] = useState<
    { name: string; value: string; sortable: boolean }[]
  >([]);
  const [result, setResult] = useState<{
    from: number;
    to: number;
    total: number;
    page: number;
    per_page: number;
    results: {
      title: string;
      download: string;
      magnet: string;
      sig: string;

      [key: string]: any;
    }[];
  }>();

  const searchtorrent = () => {
    dispatch({ type: "SET_PROGRESS", value: -1 });
    api
      .search({ ...state.search })
      .then(setResult)
      .then(() => history.push(toQuery("/search", state.search)))
      .catch((e: Error) => enqueueSnackbar(e.message, { variant: "error" }))
      .finally(() => dispatch({ type: "SET_PROGRESS", value: 100 }));
  };

  useEffect(() => {
    if (!state.search.query) return;
    if (result !== null && state.search.page !== 1)
      dispatch({ type: "SET_PAGE", value: 1 });
    else searchtorrent();
  }, [state.search.query, state.search.sort, state.search.order]);

  useEffect(() => {
    if (!state.search.query) return;
    searchtorrent();
  }, [state.search.page]);

  useEffect(() => {
    api
      .search_columns({ engine: state.search.engine })
      .then(setColumns)
      .catch((e) => enqueueSnackbar(e.message, { variant: "error" }));
  }, []);

  const sortHandler = (column: {
    name: string;
    value: string;
    sortable: boolean;
  }) => {
    if (!column.sortable) return () => {};
    return () =>
      dispatch({
        type: "SET_SORT_AND_ORDER",
        value: {
          sort: column.value,
          order:
            state.search.sort !== column.value
              ? "desc"
              : state.search.order === "asc"
              ? "desc"
              : "asc",
        },
      });
  };

  const pageCount = result ? Math.ceil(result.total / result.per_page) : 1;

  return (
    <span style={{ flexDirection: "column" }}>
      <Seasonal />
      <LoadingBar />
      <Favorites />
      <Paper>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <SearchBar />
          {result && columns && (
            <>
              <Pagination count={pageCount} />
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((column, i) => (
                        <TableCell key={i} component="th">
                          {(column.sortable && (
                            <TableSortLabel
                              active={state.search.sort === column.value}
                              disabled={state.progress !== 100}
                              direction={
                                state.search.order === "desc" ? "desc" : "asc"
                              }
                              onClick={sortHandler(column)}
                            >
                              {column.name}
                            </TableSortLabel>
                          )) ||
                            column.name}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.results.map((torrent: any, i: number) => (
                      <TorrentRow key={i} torrent={torrent} columns={columns} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Pagination count={pageCount} />
            </>
          )}
        </span>
      </Paper>
    </span>
  );
}

export default Search;
