import React from "react";

import { Switch, Route, Redirect } from "react-router-dom";

import UrlPlayer from "views/Player/Url";
import Search from "views/Search";

function Router() {
  return (
    <Switch>
      <Redirect exact from="/" to="/search" />
      <Route exact path="/search" component={Search} />
      <Route exact path="/player" component={UrlPlayer} />
      <Redirect path="**" to="/search" />
    </Switch>
  );
}

export default Router;
