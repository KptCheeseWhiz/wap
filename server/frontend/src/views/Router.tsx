import React from "react";

import { Switch, Route, Redirect } from "react-router-dom";

import Home from "views/Home";
import Search from "views/Search";

function Router() {
  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route exact path="/search" component={Search} />
      <Redirect path="**" to="/" />
    </Switch>
  );
}

export default Router;
