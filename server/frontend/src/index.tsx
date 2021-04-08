import React from "react";
import ReactDOM from "react-dom";
import { SnackbarProvider } from "notistack";
import { BrowserRouter } from "react-router-dom";
import {
  CssBaseline,
  unstable_createMuiStrictModeTheme as createMuiTheme,
  MuiThemeProvider,
} from "@material-ui/core";

import "./index.css";
import App from "views/App";

ReactDOM.render(
  <React.StrictMode>
    <MuiThemeProvider
      theme={createMuiTheme({
        palette: {
          type: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light",
        },
      })}
    >
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SnackbarProvider>
    </MuiThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
