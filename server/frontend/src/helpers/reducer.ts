import React from "react";

import { merge as _merge } from "lodash";

import * as storage from "helpers/storage";

export interface IState {
  progress: number;
  favorites: string[];
  search: {
    engine: string;
    query: string;
    page: number;
    sort?: string;
    order?: string;
  };
  video: {
    open: boolean;
    magnet?: string;
    name?: string;
    path?: string;
    sig?: string;
  };
}

export type IActionType =
  | "SET_PROGRESS"
  | "SET_QUERY"
  | "SET_PAGE"
  | "SET_SORT_AND_ORDER"
  | "SET_FAVORITES";

export type IAction =
  | { type: "SET_PROGRESS"; value: number }
  | { type: "SET_QUERY"; value: string }
  | { type: "SET_PAGE"; value: number }
  | { type: "SET_SORT_AND_ORDER"; value: { sort: string; order: string } }
  | { type: "SET_FAVORITES"; value: string[] }
  | {
      type: "SET_VIDEO";
      value: {
        open: boolean;
        magnet?: string;
        name?: string;
        path?: string;
        sig?: string;
      };
    }
  | { type: "SET_VIDEO_OPEN"; value: boolean };

export interface IContextProps {
  state: IState;
  dispatch: (action: IAction) => void;
}

const query = new URLSearchParams(window.location.search);
export const initialState: IState = {
  progress: 100,
  favorites: storage.get("favorites") || [],
  search: {
    engine: "nyaa",
    query: query.get("query") || "",
    page: Math.max(+(query.get("page") || 1), 1),
    sort: query.get("sort") || undefined,
    order: query.get("order") || undefined,
  },
  video: {
    open: false,
  },
};

export function reducer(state: IState, action: IAction): IState {
  switch (action.type) {
    case "SET_PROGRESS":
      return { ...state, progress: action.value };
    case "SET_QUERY":
      return _merge(
        {},
        state,
        { search: { query: action.value } },
        { search: { sort: undefined, order: undefined } },
      );
    case "SET_PAGE":
      return _merge({}, state, { search: { page: action.value } });
    case "SET_SORT_AND_ORDER":
      return _merge({}, state, {
        search: { sort: action.value.sort, order: action.value.order },
      });
    case "SET_FAVORITES":
      storage.set("favorites", action.value);
      return { ...state, favorites: action.value };
    case "SET_VIDEO":
      return _merge({}, state, {
        video: {
          open: action.value.open,
          magnet: action.value.magnet,
          name: action.value.name,
          path: action.value.path,
          sig: action.value.sig,
        },
      });
    case "SET_VIDEO_OPEN":
      return _merge({}, state, {
        video: {
          open: action.value,
        },
      });
    default:
      return state;
  }
}

export const context = React.createContext({} as IContextProps);
