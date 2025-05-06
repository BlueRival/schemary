import { PathSegment } from './pathSegment.class.js';
import { JSONType, JSONArray } from '../../types.js';

// Array index segment (e.g., [0], [-1])
export class ArrayIndexSegmentClass extends PathSegment {
  constructor(
    text: string,
    public readonly index: number,
  ) {
    super(text);
  }

  private _realIndex(arr: JSONArray): number {
    return this.index < 0 ? arr.length + this.index : this.index;
  }

  protected _getValue(source: JSONType): JSONType | undefined {
    // only works on truthy objects (including arrays)
    if (!Array.isArray(source)) {
      return undefined;
    }

    const index = this._realIndex(source);

    if (index < 0) {
      throw new Error(`Reverse array index out of bounds: ${index}`);
    }

    // we can pull fields out of objects, but also arrays, like the length field
    return source[index];
  }

  protected _setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined {
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
