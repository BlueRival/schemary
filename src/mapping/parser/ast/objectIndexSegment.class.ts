import { AbstractPathIndexSegment } from './abstractPathIndexSegment.class.js';
import { JSONType, JSONObject } from '../../../types.js';

// Field access segment (e.g., "user")
export class ObjectIndexSegment extends AbstractPathIndexSegment {
  private fields: string[] = [];
  private multiMatch: boolean = false;

  constructor(
    text: string,
    public readonly name: string,
  ) {
    super(text);

    const multiNameMatch = name.match(/^{([^}]+)}$/);

    if (multiNameMatch) {
      this.fields = multiNameMatch[1].split(',').map((field) => field.trim());
      this.multiMatch = true;
    } else {
      this.fields = [name];
    }
  }

  private getValues(source: JSONType): JSONObject {
    const output: JSONObject = {};

    // if input is not a truthy object, return empty array
    if (typeof source !== 'object' || !source) {
      return output;
    }

    this.fields.forEach((field) => {
      output[field] =
        field in source ? (source as JSONObject)[field] : undefined;
    });

    return output;
  }

  public getValue(source: JSONType): JSONType {
    const output = this.getValues(source);

    if (this.multiMatch) {
      return output;
    }

    // return the actual item
    return output[this.name];
  }

  public setValue(
    source: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined {
    if (
      typeof source !== 'object' ||
      source === null ||
      Array.isArray(source)
    ) {
      source = {};
    }
    source = source as JSONObject;
    source[this.name] = value;
    return source;
  }
}
