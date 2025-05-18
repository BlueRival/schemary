import { z } from 'zod';

export { MappingPlanRuleOrder as PlanRuleOrder } from './mapping/plan.js';

import {
  MappingPlan as MappingPlanCore,
  MappingRuleParams as MappingRuleParamsCore,
} from './mapping/plan.js';

import {
  compile as compileCore,
  MappingPlanParams as MappingPlanParamsCore,
} from './mapping/compile.js';

import { map as mapCore, MAP_DIRECTION } from './mapping/execute.js';

import { JSONType } from './types.js';
import {
  InputArraySchema,
  InputObjectSchema,
  NoInferPartial,
} from './types.js';
import { FormatShortNames } from './formatters/timestamp.js';

type MappingSchema<T> = InputObjectSchema<T> | InputArraySchema<T>;

export { MappingRuleFormatType as FormatType } from './mapping/plan.js';

export const Formatting = {
  TimeStamp: FormatShortNames,
};

export interface PlanParams<L extends JSONType, R extends JSONType>
  extends MappingPlanParamsCore {
  rules: RuleParams[];
  leftSchema: MappingSchema<L>;
  rightSchema: MappingSchema<R>;
}

export class Plan<
  LeftSchema extends InputObjectSchema<LO> | InputArraySchema<LA>,
  RightSchema extends InputObjectSchema<RO> | InputArraySchema<RA>,
  LO extends JSONType = JSONType,
  LA extends JSONType = JSONType,
  RO extends JSONType = JSONType,
  RA extends JSONType = JSONType,
> {
  constructor(
    private readonly core: MappingPlanCore,
    private readonly leftSchema: LeftSchema,
    private readonly rightSchema: RightSchema,
  ) {}

  public map(
    leftValue: z.infer<typeof this.leftSchema>,
    overrideValues?: NoInferPartial<z.infer<typeof this.rightSchema>>,
  ): z.infer<typeof this.rightSchema> {
    leftValue = this.leftSchema.parse(leftValue);

    const rightValue = mapCore(
      leftValue,
      this.core,
      overrideValues as NoInferPartial<JSONType> | undefined, // mapCore just wants a JSONType, it doesn't care about schemas
      MAP_DIRECTION.LeftToRight,
    );

    return this.rightSchema.parse(rightValue);
  }

  public reverseMap(
    rightValue: z.infer<typeof this.rightSchema>,
    overrideValues?: NoInferPartial<z.infer<typeof this.leftSchema>>,
  ): z.infer<typeof this.leftSchema> {
    rightValue = this.rightSchema.parse(rightValue);

    const leftValue = mapCore(
      rightValue,
      this.core,
      overrideValues as NoInferPartial<JSONType> | undefined, // mapCore just wants a JSONType, it doesn't care about schemas
      MAP_DIRECTION.RightToLeft,
    );

    return this.leftSchema.parse(leftValue);
  }
}

export type RuleParams = MappingRuleParamsCore<any, any>;

export function compilePlan<
  L extends JSONType,
  R extends JSONType,
  LeftSchema extends MappingSchema<L>,
  RightSchema extends MappingSchema<R>,
>(params: PlanParams<L, R>): Plan<LeftSchema, RightSchema, L, L, R, R> {
  const core = compileCore(params.rules, params);

  return new Plan(
    core,
    params.leftSchema as LeftSchema,
    params.rightSchema as RightSchema,
  );
}
