import { PathSegment } from './pathSegment.class.js';
import { JSONType, JSONObject } from '../../../types.js';

// Field access segment (e.g., "user")
export class ObjectFieldSegmentClass extends PathSegment {
  constructor(
    text: string,
    public readonly name: string,
  ) {
    super(text);
  }

  protected _getValue(source: JSONType): JSONType | undefined {
    // only works on truthy objects (including arrays)
    if (typeof source !== 'object' || source === null) {
      return undefined;
    }

    // we can pull fields out of objects, but also arrays, like the length field
    return (source as JSONObject)[this.name];
  }

  protected _setValue(
    source: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined {
    if (typeof source !== 'object' || source === null) {
      source = {};
    }
    source = source as JSONObject;
    source[this.name] = value;
    return source;
  }
}
