import fetch from "helpers/fetch";
import { pick } from "lodash";

export interface IAnime {
  mal_id: number;
  url: string;
  title: string;
  image_url: string;
  synopsis: string;
  type: string;
  airing_start: string | Date;
  episodes: number;
  members: number;
  genres: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
  source: string;
  producers: {
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }[];
  score: number;
  licensors: string[];
  r18: boolean;
  kids: boolean;
  continuing: boolean;
}

export const season = async (): Promise<IAnime[]> =>
  (await fetch<any>("https://api.jikan.moe/v3/season")).anime;

export const schedule = async (): Promise<{
  [day: string]: IAnime[];
}> =>
  pick(await fetch<any>("https://api.jikan.moe/v3/schedule"), [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]);
