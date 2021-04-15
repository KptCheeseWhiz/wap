import fetch, { toURL } from "helpers/fetch";

export const ping = async (): Promise<boolean> =>
  await fetch<{ pong: number }>("/api/ping")
    .then(({ pong }) => !!pong)
    .catch(() => false);

export const search = async (params: {
  query: string;
  engine: string;
  category?: string;
  filter?: string;
  sort?: string;
  order?: string;
  page?: number;
}): Promise<{
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
}> => await fetch(toURL(window.location.origin + "/api/search", params));

export const search_categories = async (params: {
  engine: string;
}): Promise<{ name: string; value: string }[]> =>
  await fetch(toURL(window.location.origin + "/api/search/categories", params));

export const search_columns = async (params: {
  engine: string;
}): Promise<{ name: string; value: string; sortable: boolean }[]> =>
  await fetch(toURL(window.location.origin + "/api/search/columns", params));

export const torrent_files = async (params: {
  magnet: string;
  sig: string;
}): Promise<{ name: string; path: string; size: number }[]> =>
  await fetch(toURL(window.location.origin + "/api/torrent/files", params));

export const torrent_status = async (): Promise<any> =>
  await fetch("/api/torrent/status");

export const torrent_verify = async (params: {
  magnet: string;
  name: string;
  path: string;
  sig: string;
}): Promise<void> =>
  await fetch(toURL(window.location.origin + "/api/torrent/verify", params));

export const player_subtitles = async (params: {
  magnet: string;
  name: string;
  path: string;
  sig: string;
}): Promise<{ language: string; title: string }[]> =>
  await fetch(toURL(window.location.origin + "/api/player/subtitles", params));
