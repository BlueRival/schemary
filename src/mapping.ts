import { z } from 'zod';
import { FormatShortNames } from './formatters/timestamp.js';

export { MappingPlanRuleOrder } from './mapping/plan.js';

export type TimeStampFormats = FormatShortNames;

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
import { InputArraySchema, InputObjectSchema, Overrides } from './types.js';

type MappingSchema<T> = InputObjectSchema<T> | InputArraySchema<T>;

export interface MappingPlanParams<L extends JSONType, R extends JSONType>
  extends MappingPlanParamsCore {
  leftSchema: MappingSchema<L>;
  rightSchema: MappingSchema<R>;
}

export class MappingPlan<
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
    overrideValues?: Overrides<z.infer<typeof this.rightSchema>>,
  ): z.infer<typeof this.rightSchema> {
    leftValue = this.leftSchema.parse(leftValue);

    const rightValue = mapCore(
      leftValue,
      this.core,
      overrideValues as Overrides<JSONType> | undefined, // mapCore just wants a JSONType, it doesn't care about schemas
      MAP_DIRECTION.LeftToRight,
    );

    return this.rightSchema.parse(rightValue);
  }

  public reverseMap(
    rightValue: z.infer<typeof this.rightSchema>,
    overrideValues?: Overrides<z.infer<typeof this.leftSchema>>,
  ): z.infer<typeof this.leftSchema> {
    rightValue = this.rightSchema.parse(rightValue);

    const leftValue = mapCore(
      rightValue,
      this.core,
      overrideValues as Overrides<JSONType> | undefined, // mapCore just wants a JSONType, it doesn't care about schemas
      MAP_DIRECTION.RightToLeft,
    );

    return this.leftSchema.parse(leftValue);
  }
}

export type MappingRuleParams = MappingRuleParamsCore<any, any>;

export function compile<
  L extends JSONType,
  R extends JSONType,
  LeftSchema extends MappingSchema<L>,
  RightSchema extends MappingSchema<R>,
>(
  rules: MappingRuleParams[],
  params: MappingPlanParams<L, R>,
): MappingPlan<LeftSchema, RightSchema, L, L, R, R> {
  const core = compileCore(rules, params);

  return new MappingPlan(
    core,
    params.leftSchema as LeftSchema,
    params.rightSchema as RightSchema,
  );
}
