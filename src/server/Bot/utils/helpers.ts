export class CircularQueue {
  private _storage: number[];
  private _size: number;
  private _write: number;
  private _read: number;
  private _count: number;

  constructor(size: number) {
    this._storage = new Array(size + 1);
    this._size = size + 1;
    this._write = 0;
    this._read = 0;
    this._count = 0;
  }

  addToHead(val: any) {
    // Check if queue is full
    if (this._read === (this._write + 1) % this._size) {
      this._read = (this._read + 1) % this._size;
      this._count--;
    }

    this._storage[this._write] = val;
    this._write = (this._write + 1) % this._size;
    this._count++;
  }

  get size(): number {
    return this._count;
  }

  toArray(): any[] {
    let result: any = [];
    for (
      let i = 0, current = this._read;
      i < this._count;
      i++, current = (current + 1) % this._size
    ) {
      result.push(this._storage[current]);
    }

    return result;
  }
}
