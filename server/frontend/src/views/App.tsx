import React, { useEffect, useReducer, useState } from "react";

import { reducer, initialState, context as Context } from "helpers/reducer";
import { ping } from "helpers/api";

import Router from "views/Router";
import Offline from "views/Offline";
import Spinner from "components/Spinner";

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    ping().then(setIsOnline);
  }, []);

  if (isOnline === null)
    return (
      <span style={{ width: "100vw", height: "100vh", display: "flex" }}>
        <Spinner size={250} />
      </span>
    );
  else if (!isOnline) return <Offline />;
  else
    return (
      <Context.Provider value={{ state, dispatch }}>
        <Router />
      </Context.Provider>
    );
}

export default App;
