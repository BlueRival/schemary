import {
  MappingPlan,
  MappingPlanRuleOrder,
  MappingRuleFormatType,
} from './plan.js';
import { JSONType } from '../types.js';
import { format as TimestampFormatter } from '../formatters/timestamp.js';
import { extractValue, injectValue } from './parser/utilities.js';

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

    let formatType: MappingRuleFormatType | undefined;
    let formatSource: string | undefined;
    let formatDestination: string | undefined;

    if (rule.format) {
      formatType = rule.format.type;

      if (direction === MAP_DIRECTION.LeftToRight) {
        formatSource = rule.format.toLeft;
        formatDestination = rule.format.toRight;
      } else {
        formatSource = rule.format.toRight;
        formatDestination = rule.format.toLeft;
      }
    }

    // Determine the value to set
    let valueToSet: JSONType = undefined;

    // Separate this from the below because it is possible for overrideValues to be defined, BUT, the specific
    // path for this rule pulls out an undefined.
    if (overrideValues !== undefined) {
      valueToSet = extractValue(overrideValues, targetPath);
    }

    // We only look for literals and real values if overrides didn't have a value to set
    // We nest all this to avoid redundant checks
    if (valueToSet === undefined) {
      if (rule.hasLiteral) {
        valueToSet = rule.literal;
      } else if (sourcePath) {
        valueToSet = extractValue(sourceValue, sourcePath);

        if (transform) {
          // we know that whatever type is returned from transform is a JSONType
          valueToSet = transform(valueToSet) as JSONType;
        }

        if (formatType) {
          switch (formatType) {
            case MappingRuleFormatType.TIMESTAMP:
              if (typeof valueToSet !== 'string') {
                throw new Error(
                  'Can not apply timestamp formatting to non-string value',
                );
              }

              valueToSet = TimestampFormatter(
                valueToSet,
                formatDestination as string, // we know this is a string because of higher up logic
                formatSource as string, // we know this is a string because of higher up logic
              );

              break;
          }
        }
      }
    }

    // finally, send the value to set to the target path on the current result.
    result = injectValue(result, valueToSet, targetPath);
  }

  return result;
}
