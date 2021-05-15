const storage = (window as any).ELECTRON
  ? (window as any).storage
  : window.localStorage;

export const get = (key: string): any | null => {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch (e) {
    console.warn(`Unable to retreive ${key} from storage`);
    del(key);
    return null;
  }
};

export const set = (key: string, value: any): void =>
  storage.setItem(key, JSON.stringify(value));

export const del = (key: string): void => storage.removeItem(key);

export const cls = (): void => storage.clear();
