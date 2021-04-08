const storage = (window as any).IS_ELECTRON
  ? (window as any).storage
  : window.localStorage;

export const get = (key: string): any | null =>
  JSON.parse(storage.getItem(key) || "null");

export const set = (key: string, value: any): void =>
  storage.setItem(key, JSON.stringify(value));

export const del = (key: string): void => storage.removeItem(key);

export const cls = (): void => storage.clear();
