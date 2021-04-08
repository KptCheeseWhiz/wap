import React, { useContext } from "react";

import { Pagination as LabPagination } from "@material-ui/lab";

import Pad from "components/Pad";

import { context } from "helpers/reducer";

function Pagination({ count }: { count: number }) {
  const { state, dispatch } = useContext(context);

  const onChange = (_: React.ChangeEvent<unknown>, page: number) => {
    dispatch({ type: "SET_PAGE", value: page });
  };

  return (
    <span style={{ display: "flex" }}>
      <Pad />
      <LabPagination
        count={count}
        page={state.search.page}
        onChange={onChange}
        siblingCount={1}
        disabled={state.progress !== 100}
      />
      <Pad />
    </span>
  );
}

export default Pagination;
