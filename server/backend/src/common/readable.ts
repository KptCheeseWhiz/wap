import { Readable } from "stream";

import { sleep } from "@/common/utils.helper";

export class IndexedReadable extends Readable {
  private _chunks: Buffer[] = [];
  private _rindex = 0;
  private _chunk_offset = 0;

  set(chunk: Buffer, index: number) {
    if (this.destroyed) throw new Error("destroyed");
    this._chunks[index] = chunk;
  }

  end() {
    this._chunks.push(null);
  }

  async _read(size: number) {
    if (!this._chunks[this._rindex])
      while (this._chunks[this._rindex] === undefined) await sleep(10);
    if (this._chunks[this._rindex] === null) super.push(null);
    else {
      super.push(
        this._chunks[this._rindex].slice(
          this._chunk_offset,
          (this._chunk_offset += size),
        ),
      );
      if (this._chunk_offset >= this._chunks[this._rindex].length) {
        this._chunks[this._rindex++] = null;
        this._chunk_offset = 0;
      }
    }
  }
}

export class LockingReadable extends Readable {
  private _chunk: Buffer = undefined;
  private _chunk_offset = 0;

  async set(chunk: Buffer): Promise<void> {
    if (this.destroyed) throw new Error("destroyed");
    while (this._chunk !== undefined) await sleep(10);
    this._chunk = chunk;
  }

  async end() {
    while (this._chunk !== undefined) await sleep(10);
    this._chunk = null;
  }

  async _read(size: number) {
    if (!this._chunk) while (this._chunk === undefined) await sleep(10);
    if (this._chunk === null) super.push(null);
    else {
      super.push(
        this._chunk.slice(this._chunk_offset, (this._chunk_offset += size)),
      );
      if (this._chunk_offset >= this._chunk.length) {
        this._chunk = undefined;
        this._chunk_offset = 0;
      }
    }
  }
}
