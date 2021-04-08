import "webtorrent";

declare module "webtorrent" {
  interface TorrentFile {
    /**
     * Used to avoid adding new properties more than once
     */
    managed: boolean;

    /**
     * When this file was added
     */
    createdAt: Date;

    /**
     * When to remove this file from the cache
     */
    expiresAt: Date;

    /**
     * How many users are using this file
     */
    handles: number;

    /**
     * How many bytes have been uploaded to users
     */
    uploaded: number;
  }
}
