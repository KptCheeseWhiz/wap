import { pick } from "lodash";

import { fetch } from "helpers/http";
import * as storage from "helpers/storage";

export interface IAnime {
  mal_id: number;
  url: string;
  title: string;
  image_url: string;
  type: string;
  score: number;
}

export const season = async (): Promise<IAnime[]> => {
  let cache = storage.get("jikan_cache");
  if (!cache) {
    cache = Date.now();
    storage.set("jikan_cache", cache);
  }

  return (await fetch<any>(`https://api.jikan.moe/v3/season?cache=${cache}`))
    .anime;
};

const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const today = days[new Date().getDay()];
while (days[0] !== today) days.push(days.shift() as string);
export const schedule = async (): Promise<IAnime[]> => {
  let cache = storage.get("jikan_cache");
  if (!cache) {
    cache = Date.now();
    storage.set("jikan_cache", cache);
  }

  const resp = pick(
    await fetch<any>(`https://api.jikan.moe/v3/schedule?cache=${cache}`),
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  ) as any;

  return Object.keys(resp)
    .sort((a, b) => days.indexOf(a) - days.indexOf(b))
    .reduce(
      (a, day) => [
        ...a,
        ...resp[day].sort((a: any, b: any) => b.members - a.members),
      ],
      [] as IAnime[],
    );
};

export const watching = async (params: {
  username: string;
}): Promise<IAnime[]> => {
  let cache = storage.get("jikan_cache");
  if (!cache) {
    cache = Date.now();
    storage.set("jikan_cache", cache);
  }

  const myanimes: IAnime[] = (
    await fetch<any>(
      `https://api.jikan.moe/v3/user/${encodeURIComponent(
        params.username,
      )}/animelist/watching?cache=${cache}`,
    )
  ).anime;

  return (await schedule()).filter((anime) => {
    const index = myanimes.findIndex((a: IAnime) => a.mal_id === anime.mal_id);
    if (index !== -1) {
      myanimes.splice(index, 1);
      return true;
    }
    return false;
  });
};
