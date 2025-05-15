import { AbstractPathSegment } from './abstractPathSegment.class.js';
import { JSONArray, JSONType } from '../../../types.js';

export interface IterateResult {
  result: JSONArray;
  iterate: true;
}

export interface NoIterateResult {
  result: JSONType;
  iterate: false;
}

export type GetResult = IterateResult | NoIterateResult;

export abstract class AbstractPathIteratorSegment extends AbstractPathSegment {
  public abstract getValue(previousValue: JSONArray): GetResult;

  public abstract setValue(
    destination: JSONArray | undefined,
    value: JSONType,
  ): JSONType;
}
