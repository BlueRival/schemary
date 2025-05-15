import { JSONType, JSONArray } from '../../../types.js';
import {
  AbstractPathIteratorSegment,
  NoIterateResult,
} from './abstractPathIteratorSegment.class.js';

// Array index segment (e.g., [0], [-1])
export class ArrayIndexSegmentClass extends AbstractPathIteratorSegment {
  constructor(
    sourceText: string,
    public readonly index: number,
  ) {
    super(sourceText);
  }

  private _realIndex(arr: JSONArray): number {
    return this.index < 0 ? arr.length + this.index : this.index;
  }

  public getValue(source: JSONArray): NoIterateResult {
    // only works on truthy objects (including arrays)
    if (!Array.isArray(source)) {
      return { result: undefined, iterate: false };
    }

    const index = this._realIndex(source);

    if (index < 0) {
      throw new Error(`Reverse array index out of bounds: ${index}`);
    }

    // we can pull fields out of objects, but also arrays, like the length field
    return { result: source[index], iterate: false };
  }

  public setValue(
    destination: JSONArray | undefined,
    value: JSONType | undefined,
  ): JSONType {
    if (!Array.isArray(destination)) {
      destination = [];
    }

    const index = this._realIndex(destination);

    if (index < 0) {
      throw new Error(`Reverse array index out of bounds: ${index}`);
    }

    // we can pull fields out of objects, but also arrays, like the length field
    destination[index] = value;

    return destination;
  }
}
