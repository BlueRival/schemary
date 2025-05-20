import { JSONType, JSONArray } from '../../../types.js';
import { clone } from '../../../helpers.js';
import {
  AbstractPathIteratorSegment,
  ChainResult,
} from './abstractPathIteratorSegment.class.js';

export class ArrayIteratorSegment extends AbstractPathIteratorSegment {
  constructor(
    sourceText: string,
    public readonly start: number,
    public readonly size?: number,
  ) {
    super(sourceText);
  }

  private _getIterate(
    source: JSONArray,
    handler: (item: JSONType) => void,
  ): void {
    if (this.size === 0) {
      // case: [[*,0]]
      return;
    }

    // take natural length of source
    if (this.size === undefined) {
      // case: [[*]]
      source.slice(this.start).map((item) => handler(item));
      return;
    }

    // start index is the real absolute index start position relative to the source array
    let startIndex = this.start < 0 ? source.length + this.start : this.start;

    let size = this.size;

    let forward = true;
    // convert to positive logic
    if (size < 0) {
      // there is an off-by-one adjustment when startIndex is < 0, because negative counts count from 1, not 0
      startIndex += size + 1;
      size = -size; // invert size so it counts to the right of new start, instead of to the left.
      forward = false; // remember to reverse the value before merging it
    }

    // sliding the window for positive logic put the startIndex off the front of the array, adjust it and shrink size
    if (startIndex < 0) {
      if (size < -startIndex) {
        // not enough room to move start up, so we can't do anything
        return;
      }

      size += startIndex; // shrink size by the amount we moved start up
      startIndex = 0;
    }

    source = source.slice(startIndex, startIndex + size);

    if (!forward) {
      source.reverse();
    }

    source.map((item) => handler(item));
  }

  public getValue(source: JSONArray): ChainResult {
    const result: JSONArray = [];

    // runtime-check
    if (!Array.isArray(source)) {
      source = [];
    }

    this._getIterate(source, (item) => result.push(clone(item)));

    return { result, chain: true };
  }

  public setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONArray {
    if (!Array.isArray(destination)) {
      destination = [];
    }
    if (!Array.isArray(value)) {
      value = value === undefined ? [] : [value];
    }

    let start = this.start;
    let size = this.size;

    if (size === 0) {
      return destination;
    }

    if (size === undefined) {
      size = value.length;
    }

    // now that we know the exact size we will pull from value, clamp to that size
    value = value.slice(0, Math.abs(size));

    // convert to positive logic
    if (size < 0) {
      // if size is negative, it means we are starting at index X, counting down to some index Y, such that Y < X: say, index 5, 4, 3, 2
      // We will swap X and Y such that we start at index Y, and count up to index X: say, index 2, 3, 4, 5

      start += size + 1; // shift start down to where size would end up counting down, index is off by one so we add one to make it fit
      size = -size; // invert so it is positive logic

      // since we reversed the iteration order for destination, we must also reverse it for value we are setting
      value.reverse();
    }

    value = clone(value);

    // now that we have converted all values to positive logic, we can call native splice
    destination.splice(start, value.length, ...value);

    return destination;
  }
}
