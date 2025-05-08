import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { compilePlan, Plan, PlanRuleOrder, RuleParams } from './mapping.js';

// Define test schemas for left and right sides
const LeftObjectSchema = z.object({
  id: z.number(),
  username: z.string(),
  dob: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/)
    .refine(
      (val) =>
        !isNaN(
          Date.parse(val.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2')),
        ),
    ),
  age: z.number(),
  isActive: z.boolean().optional(),
});
type LeftObjectType = z.infer<typeof LeftObjectSchema>;

const RightObjectSchema = z.object({
  identifier: z.number(),
  user: z.string(),
  yearsOld: z.number(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => !isNaN(Date.parse(val.replace(/-/g, '/'))), {
      message: 'Invalid date',
    }),
  active: z.boolean().optional(),
  extraInfo: z.string(),
});
type RightObjectType = z.infer<typeof RightObjectSchema>;

// Test data
const validLeftObject: LeftObjectType = {
  id: 123,
  username: 'johndoe',
  dob: '03/02/1981',
  age: 30,
  isActive: true,
};

const validRightObject: RightObjectType = {
  identifier: 123,
  user: 'johndoe',
  dob: '1981-03-02',
  yearsOld: 30,
  active: true,
  extraInfo: 'Additional information',
};

const validMappingRules: RuleParams[] = [
  {
    left: 'id',
    right: 'identifier',
  },
  {
    left: 'username',
    right: 'user',
  },
  {
    left: 'dob',
    right: 'dob',
    transform: {
      toLeft: (dob: string): string => {
        const [year, month, day] = dob.split('-');
        return `${month}/${day}/${year}`;
      },
      toRight: (dob: string): string => {
        const [month, day, year] = dob.split('/');
        return `${year}-${month}-${day}`;
      },
    },
  },
  {
    left: 'age',
    right: 'yearsOld',
  },
  {
    left: 'isActive',
    right: 'active',
  },
  {
    literal: 'Additional information',
    right: 'extraInfo',
  },
];

describe('MappingPlan', () => {
  it('should compile mapping rules to a plan object', () => {
    const plan = compilePlan({
      rules: validMappingRules,
      leftSchema: LeftObjectSchema,
      rightSchema: RightObjectSchema,
    });

    expect(plan).toBeInstanceOf(Plan);
  });

  it('should compile mapping rules to a plan object with order params', () => {
    const plan = compilePlan({
      rules: validMappingRules,
      leftSchema: LeftObjectSchema,
      rightSchema: RightObjectSchema,
      order: {
        toRight: PlanRuleOrder.DESC,
        toLeft: PlanRuleOrder.DESC,
      },
    });

    expect(plan).toBeInstanceOf(Plan);
  });

  it('should process left to right transforms', () => {
    const plan = compilePlan({
      rules: validMappingRules,
      leftSchema: LeftObjectSchema,
      rightSchema: RightObjectSchema,
    });

    const rightObject = plan.map(validLeftObject);

    expect(rightObject).toStrictEqual(validRightObject);

    RightObjectSchema.parse(rightObject);
  });

  it('should process right to left transforms', () => {
    const plan = compilePlan({
      rules: validMappingRules,
      leftSchema: LeftObjectSchema,
      rightSchema: RightObjectSchema,
    });

    const leftObject = plan.reverseMap(validRightObject);

    expect(leftObject).toStrictEqual(validLeftObject);

    LeftObjectSchema.parse(leftObject);
  });
});
