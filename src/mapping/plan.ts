import { clone } from '../schema.js';
import { JSONType } from '../types.js';
import { Parser } from './parser/core.js';
import { PathSegment } from './parser/ast/types.js';

/**
 * Represents a mapping structure where a string key is mapped to a literal JSON
 * type.
 *
 * This interface is designed to define a mapping that includes a left-hand side
 * identifier or key and its corresponding literal value that adheres to a
 * JSON-defined data type.
 *
 * There is no right side because literal replaces the right side.
 *
 * In the event of a left-to-right mapping, the rule is ignored.
 *
 * Properties:
 * - `left`: A string representing the key or identifier in the mapping.
 * - `literal`: A value compliant with JSON data types, representing the
 * associated value for the key.
 */
interface MappingRuleParamsLiteralLeft {
  left: string;
  literal: JSONType;
}

/**
 * Represents a mapping structure where a string key is mapped to a literal JSON
 * type.
 *
 * This interface is designed to define a mapping that includes a right-hand
 * side identifier or key and its corresponding literal value that adheres to a
 * JSON-defined data type.
 *
 * There is no left side because literal replaces the left side.
 *
 * In the event of a right-to-left mapping, the rule is ignored.
 *
 * Properties:
 * - `right`: A string representing the key or identifier in the mapping.
 * - `literal`: A value compliant with JSON data types, representing the
 * associated value for the key.
 */
interface MappingRuleParamsLiteralRight {
  right: string;
  literal: JSONType;
}

/**
 * Represents a transformation interface where a mapping between a left-hand
 * value and a right-hand value is established. Each side of the mapping has
 * an associated transformation function that operates on the corresponding
 * value type.
 *
 * This interface provides the flexibility to define bi-directional
 * transformations, ensuring consistency between the left and right values
 * during data exchanges or conversions.
 *
 * Note: Notice that when one transform is present both are required. This is
 * because if the left side is transformed, the right side must also be
 * transformed to match if going in the other direction.
 *
 * Properties:
 * - `left`: Denotes the source field or key on the left side of the mapping.
 * - `right`: Denotes the destination field or key on the right side of the mapping.
 * - `leftTransform`: A function that converts or transforms a value from the right side
 *   of the mapping into a corresponding value suitable for the left side.
 * - `rightTransform`: A function that converts or transforms a value from the left side
 *   of the mapping into a corresponding value suitable for the right side.
 */
export interface MappingRuleParamsLiteralTransform<
  LeftValueType extends JSONType,
  RightValueType extends JSONType,
> {
  left: string;

  right: string;

  transform: {
    toLeft: (rightValue: RightValueType) => LeftValueType;
    toRight: (leftValue: LeftValueType) => RightValueType;
  };
}

/**
 * Represents a mapping structure with two string properties (`left` and `right`)
 * that represent different paths through a potentially nested JSON structure.
 *
 * This interface is designed to define a mapping that includes a left-hand side
 * identifier or key and its corresponding right-hand side identifier or key.
 *
 * The value from either side is passed directly through to the other side, with
 * no transformation.
 *
 * If the value itself needs to be transformed, say converting date formats, or
 * between string codes and numeric enum representations, use leftTransform and
 * rightTransform to define the transformation.
 *
 * Properties:
 * - `left`: A string representing the key or identifier in the mapping.
 * - `right`: A string representing the key or identifier in the mapping.
 */
interface MappingRuleParamsLiteralNeither {
  left: string;
  right: string;
}

export enum MappingRuleFormatType {
  TIMESTAMP = 'timestamp',
}

interface MappingRuleParamsFormat {
  left: string;
  right: string;
  format: {
    type: MappingRuleFormatType;
    toLeft: string;
    toRight: string;
  };
}

export type MappingRuleParamsStatic =
  | MappingRuleParamsLiteralLeft
  | MappingRuleParamsLiteralRight
  | MappingRuleParamsLiteralNeither
  | MappingRuleParamsFormat;

export type MappingRuleParams<
  LeftTransformType extends JSONType,
  RightTransformType extends JSONType,
> =
  | MappingRuleParamsStatic
  | MappingRuleParamsLiteralTransform<LeftTransformType, RightTransformType>;

export function createMappingRule<
  LeftTransformType extends JSONType,
  RightTransformType extends JSONType,
>(
  params: MappingRuleParamsLiteralTransform<
    LeftTransformType,
    RightTransformType
  >,
): MappingRule<LeftTransformType, RightTransformType>;

export function createMappingRule(
  params: MappingRuleParamsStatic,
): MappingRule<any, any>;

export function createMappingRule(
  params: MappingRuleParams<any, any>,
): MappingRule<any, any> {
  return new MappingRule(params);
}

/**
 * Represents a mapping rule that defines transformation and mapping logic
 * between two paths (left and right) in an object.
 */
export class MappingRule<
  LeftTransformType extends JSONType,
  RightTransformType extends JSONType,
> {
  public readonly leftPath?: PathSegment[];
  public readonly rightPath?: PathSegment[];
  public readonly leftTransform?: (
    value: RightTransformType,
  ) => LeftTransformType;
  public readonly rightTransform?: (
    value: LeftTransformType,
  ) => RightTransformType;
  private readonly myLiteral?: JSONType;
  public readonly hasLiteral: boolean = false;
  public readonly format?: {
    type: MappingRuleFormatType;
    toLeft: string;
    toRight: string;
  };

  constructor(
    params: MappingRuleParams<LeftTransformType, RightTransformType>,
  ) {
    if (!('left' in params) && !('right' in params)) {
      throw new Error('rule must have left or right');
    }

    if ('leftTransform' in params !== 'rightTransform' in params) {
      throw new Error(
        'rule must have both leftTransform and rightTransform or neither',
      );
    }

    if ('left' in params) {
      try {
        this.leftPath = new Parser(params.left).parsePath();
      } catch (e) {
        const myError = e instanceof Error ? e : new Error(String(e));
        throw new Error(`Left: ${myError.message}`);
      }
    }

    if ('right' in params) {
      try {
        this.rightPath = new Parser(params.right).parsePath();
      } catch (e) {
        const myError = e instanceof Error ? e : new Error(String(e));
        throw new Error(`Right: ${myError.message}`);
      }
    }

    if ('transform' in params) {
      this.leftTransform = params.transform.toLeft;
      this.rightTransform = params.transform.toRight;
    }

    if ('literal' in params) {
      this.hasLiteral = true;
      this.myLiteral = params.literal;
    }

    if ('format' in params) {
      this.format = params.format;
    }
  }

  public get literal(): JSONType | undefined {
    if (!this.hasLiteral) {
      throw new Error(
        'rule has no literal, check hasLiteral before calling literal()',
      );
    }

    return clone(this.myLiteral);
  }
}

/**
 * An enumeration representing the possible ordering for rules.
 * Provides constants for ascending and descending order.
 *
 * By default, rules process in ascending order.
 *
 *
 * Enum members:
 * - `ASC`: Corresponds to an ascending order (value: 0).
 * - `DESC`: Corresponds to a descending order (value: 1).
 */
export enum MappingPlanRuleOrder {
  ASC = 0,
  DESC = 1,
}

export interface MappingPlanParams {
  order?: {
    toLeft?: MappingPlanRuleOrder;
    toRight?: MappingPlanRuleOrder;
  };
}

/**
 * A complete mapping plan with validated rules
 */
export class MappingPlan {
  // default rule iteration orders
  private readonly myOrder = {
    toLeft: MappingPlanRuleOrder.ASC,
    toRight: MappingPlanRuleOrder.ASC,
  };

  constructor(
    public readonly rules: MappingRule<any, any>[],
    params?: MappingPlanParams,
  ) {
    if (params?.order?.toRight) {
      this.myOrder.toRight = params.order.toRight;
    }

    if (params?.order?.toLeft) {
      this.myOrder.toLeft = params.order.toLeft;
    }
  }

  public get toLeftOrder(): MappingPlanRuleOrder {
    return this.myOrder.toLeft;
  }

  public get toRightOrder(): MappingPlanRuleOrder {
    return this.myOrder.toRight;
  }
}
