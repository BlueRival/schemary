import { AbstractPathSegment } from './abstractPathSegment.class.js';
import { JSONArray, JSONType } from '../../../types.js';

interface IterationChainResult {
  result: JSONType;
  chain: boolean;
}

export interface ChainResult extends IterationChainResult {
  result: JSONArray;
  chain: true;
}

export interface NoChainResult extends IterationChainResult {
  result: JSONType;
  chain: false;
}

export type IterationResult = ChainResult | NoChainResult;

export abstract class AbstractPathIteratorSegment extends AbstractPathSegment {
  public abstract getValue(previousValue: JSONArray): IterationResult;

  public abstract setValue(
    destination: JSONArray | undefined,
    value: JSONType,
  ): JSONType;
}
