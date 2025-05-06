import { MappingPlan, MappingPlanRuleOrder } from './plan.js';
import { PathSegment } from './parser/ast/pathSegment.class.js';
import { JSONType } from './types.js';

function getValue(source: JSONType, path: PathSegment[]): JSONType | undefined {
  return PathSegment.getValue(source, path);
}

function setValue(
  destination: JSONType,
  value: JSONType | undefined,
  path: PathSegment[],
): JSONType | undefined {
  return PathSegment.setValue(destination, value, path);
}

export enum MAP_DIRECTION {
  LeftToRight = 0,
  RightToLeft = 1,
}

/**
 * Maps values from source to destination using the provided mapping plan
 *
 * @param sourceValue - Source object or array to map from
 * @param plan - Compiled mapping plan
 * @param direction - 0 for left→right, 1 for right→left
 * @param overrideValues - Optional values to override in the result
 * @returns The mapped object or array
 */
export function map(
  sourceValue: JSONType,
  plan: MappingPlan,
  overrideValues?: JSONType,
  direction: MAP_DIRECTION = MAP_DIRECTION.LeftToRight,
): JSONType {
  const order: MappingPlanRuleOrder =
    direction === MAP_DIRECTION.LeftToRight
      ? plan.toLeftOrder
      : plan.toRightOrder;

  const rules =
    order === MappingPlanRuleOrder.ASC ? plan.rules : plan.rules.reverse();

  // We build up the result on each iteration through the rules. setValueAtPath() will create a result if one doesn't
  // exist, or it will use the one that does exist after it was created on previous iterations of the rules loop.
  let result: JSONType = undefined;

  // Apply each mapping rule
  for (const rule of rules) {
    const targetPath =
      direction === MAP_DIRECTION.LeftToRight ? rule.rightPath : rule.leftPath;

    // target path will not exist if we are mapping into a literal, which means ignore this rule for this direction
    if (!targetPath) {
      continue;
    }

    const sourcePath =
      direction === MAP_DIRECTION.LeftToRight ? rule.leftPath : rule.rightPath;

    const transform =
      direction === MAP_DIRECTION.LeftToRight
        ? rule.rightTransform
        : rule.leftTransform;

    // Determine the value to set
    let valueToSet: JSONType = undefined;

    if (overrideValues !== undefined) {
      valueToSet = getValue(overrideValues, targetPath);
    }

    // We only look for literals and real values if overrides didn't have a value to set
    // We nest all this to avoid redundant checks
    if (valueToSet === undefined) {
      if (rule.hasLiteral) {
        valueToSet = rule.literal;
      } else if (sourcePath) {
        valueToSet = getValue(sourceValue, sourcePath);

        if (transform) {
          // we know that whatever type is returned from transform is a JSONType
          valueToSet = transform(valueToSet) as JSONType;
        }
      }
    }
    // finally, send the value to set to the target path on the current result.
    result = setValue(result, valueToSet, targetPath);
  }

  return result;
}
