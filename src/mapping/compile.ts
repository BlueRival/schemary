// pass these through
export {
  MappingRuleParams,
  MappingPlanParams,
  MappingPlan,
  MappingPlanRuleOrder,
} from './plan.js';

import {
  MappingPlan,
  MappingRuleParams,
  MappingPlanParams,
  createMappingRule,
} from './plan.js';

/**
 * Compiles raw mappings into a mapping plan with validated and parsed paths.
 *
 * @param {MappingRule[]} mappingRules - An array of raw mapping objects that specify the input and output paths for the mapping rules.
 * @param {MappingPlanParams} [params] - Optional parameters for configuring the overall mapping plan.
 * @return {MappingPlan} A mapping plan containing processed and validated mapping rules based on the provided raw mappings.
 */
export function compile(
  mappingRules: MappingRuleParams<any, any>[],
  params?: MappingPlanParams,
): MappingPlan {
  const rules = mappingRules.map((mappingRuleParams, index) => {
    try {
      return createMappingRule(mappingRuleParams);
    } catch (e) {
      const myError = e instanceof Error ? e : new Error(String(e));
      throw new Error(`Rule ${index}: ${myError.message}`);
    }
  });

  return new MappingPlan(rules, params);
}
