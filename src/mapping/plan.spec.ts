import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MappingPlan,
  MappingPlanRuleOrder,
  MappingRule,
  MappingRuleParams,
} from './plan.js';
import { Parser } from './parser/core.js';
import { JSONType } from '../types.js';

export type MappingRulesParamsAny = MappingRuleParams<any, any>;

describe('MappingRule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor validation', () => {
    it('should create a rule with left path and right path', () => {
      const rule = new MappingRule({
        left: 'user.name',
        right: 'profile.name',
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.leftPath?.length).toBe(2);
      expect(rule.rightPath).toBeDefined();
      expect(rule.rightPath?.length).toBe(2);
      expect(rule.leftTransform).toBeUndefined();
      expect(rule.rightTransform).toBeUndefined();
      expect(rule.hasLiteral).toBe(false);
    });

    it('should create a rule with right path and literal value', () => {
      const rule = new MappingRule({
        right: 'person.fullName',
        literal: 'John Doe',
      });

      expect(rule.rightPath).toBeDefined();
      expect(rule.rightPath?.length).toBe(2);
      expect(rule.leftPath).toBeUndefined();
      expect(rule.leftTransform).toBeUndefined();
      expect(rule.rightTransform).toBeUndefined();
      expect(rule.hasLiteral).toBe(true);
    });

    it('should create a rule with left and transform functions', () => {
      const leftTransform = (value: JSONType) => value;
      const rightTransform = (value: JSONType) => value;

      const rule = new MappingRule({
        left: 'user.age',
        right: 'person.years',
        transform: {
          toLeft: leftTransform,
          toRight: rightTransform,
        },
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.rightPath).toBeDefined();
      expect(rule.leftTransform).toBe(leftTransform);
      expect(rule.rightTransform).toBe(rightTransform);
      expect(rule.hasLiteral).toBe(false);
    });

    it('should create a rule with left path and literal value', () => {
      const literal = 'defaultName';

      const rule = new MappingRule({
        left: 'user.name',
        literal,
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.rightPath).toBeUndefined();
      expect(rule.hasLiteral).toBe(true);
      expect(rule.literal).toBe(literal);
    });

    it('should create a rule with right path and literal value', () => {
      const literal = 42;

      const rule = new MappingRule({
        right: 'person.age',
        literal,
      });

      expect(rule.rightPath).toBeDefined();
      expect(rule.leftPath).toBeUndefined();
      expect(rule.hasLiteral).toBe(true);
      expect(rule.literal).toBe(literal);
    });

    it('should create a rule with both paths and literal value', () => {
      const literal = { status: 'active' };

      const rule = new MappingRule({
        left: 'user.status',
        right: 'person.accountStatus',
        literal,
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.rightPath).toBeDefined();
      expect(rule.hasLiteral).toBe(true);
      expect(rule.literal).toEqual(literal);
      // Ensure literal is a clone (different reference)
      expect(rule.literal).not.toBe(literal);
    });

    it('should handle complex path expressions', () => {
      const rule = new MappingRule({
        left: 'users[0].addresses[-1].street',
        right: 'people[[0,3]].contactInfo.streetAddress',
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.leftPath?.length).toBe(5);
      expect(rule.rightPath).toBeDefined();
      expect(rule.rightPath?.length).toBe(4);
    });

    it('should handle escaped characters in path expressions', () => {
      const rule = new MappingRule({
        left: 'data.\\[field\\].value',
        right: 'output.escaped\\.property',
      });

      expect(rule.leftPath).toBeDefined();
      expect(rule.leftPath?.length).toBe(3);
      expect(rule.rightPath).toBeDefined();
      expect(rule.rightPath?.length).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should throw error when neither left nor right is provided', () => {
      expect(
        () => new MappingRule({} as unknown as MappingRulesParamsAny),
      ).toThrow('rule must have left or right');
    });

    it('should throw error when only leftTransform is provided', () => {
      const leftTransform = (value: JSONType) => value;

      expect(
        () =>
          new MappingRule({
            left: 'user.name',
            leftTransform,
          } as unknown as MappingRulesParamsAny),
      ).toThrow(
        'rule must have both leftTransform and rightTransform or neither',
      );
    });

    it('should throw error when only rightTransform is provided', () => {
      const rightTransform = (value: JSONType) => value;

      expect(
        () =>
          new MappingRule({
            right: 'person.name',
            rightTransform,
          } as unknown as MappingRulesParamsAny),
      ).toThrow(
        'rule must have both leftTransform and rightTransform or neither',
      );
    });

    it('should throw error for invalid left path', () => {
      expect(
        () =>
          new MappingRule({
            left: 'users[abc]',
          } as unknown as MappingRulesParamsAny),
      ).toThrow(/Left: Parse error/);
    });

    it('should throw error for invalid right path', () => {
      expect(
        () =>
          new MappingRule({
            right: 'people[[0,',
          } as unknown as MappingRulesParamsAny),
      ).toThrow(/Right: Parse error/);
    });

    it('should throw error when accessing literal on rule without literal', () => {
      const rule = new MappingRule({
        left: 'user.name',
      } as unknown as MappingRulesParamsAny);

      // Need to suppress ESLint error about accessing property that may throw
      expect(() => rule.literal).toThrow(
        'rule has no literal, check hasLiteral before calling literal()',
      );
    });

    it('should handle non-Error exceptions when parsing left path', () => {
      // Save the original implementation
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalParsePath = Parser.prototype.parsePath;

      // Mock the parsePath method to throw a non-Error value
      Parser.prototype.parsePath = vi.fn().mockImplementation(function () {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'This is a string exception, not an Error';
      });

      // Create a rule that should trigger the error handling
      expect(
        () =>
          new MappingRule({
            left: 'user.problematic',
            right: 'person.name',
          }),
      ).toThrow(/Left: This is a string exception, not an Error/);

      // Restore the original implementation
      Parser.prototype.parsePath = originalParsePath;
    });

    it('should handle non-Error exceptions when parsing right path', () => {
      // Save the original implementation
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalParsePath = Parser.prototype.parsePath;
      let parseCount = 0;

      // Mock the parsePath method to throw a non-Error value
      Parser.prototype.parsePath = vi.fn().mockImplementation(function () {
        parseCount++;

        if (parseCount <= 1) {
          return [];
        }

        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'This is a string exception, not an Error';
      });

      // Create a rule that should trigger the error handling
      expect(
        () =>
          new MappingRule({
            left: 'user.name',
            right: 'person.problematic',
          }),
      ).toThrow(/Right: This is a string exception, not an Error/);

      // Restore the original implementation
      Parser.prototype.parsePath = originalParsePath;
    });
  });

  describe('Literal handling', () => {
    it('should return a clone of literal values', () => {
      const originalLiteral = { name: 'John', details: { age: 30 } };
      const rule = new MappingRule({
        left: 'user',
        literal: originalLiteral,
      });

      let returnedLiteral = rule.literal;

      if (!returnedLiteral) {
        expect.fail('returnedLiteral should not be undefined');
      }
      returnedLiteral = returnedLiteral as typeof originalLiteral;

      // Should be equal in value
      expect(returnedLiteral).toEqual(originalLiteral);

      // Should be a different object reference
      expect(returnedLiteral).not.toBe(originalLiteral);

      // Should be a deep clone
      expect(returnedLiteral.details).not.toBe(originalLiteral.details);

      // Modifying the returned literal shouldn't affect future calls
      returnedLiteral.name = 'Changed';
      expect(originalLiteral.name).toBe('John');
    });

    it('should properly clone complex literal values', () => {
      const complexLiteral: JSONType = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          key: 'value',
          list: ['a', 'b', 'c'],
        },
      };

      const rule = new MappingRule({
        right: 'data',
        literal: complexLiteral,
      });

      const returnedLiteral = rule.literal;
      expect(returnedLiteral).toEqual(complexLiteral);
      expect(returnedLiteral).not.toBe(complexLiteral);
    });

    it('should handle primitive literals', () => {
      const testCases = [
        { value: 'string value', desc: 'string' },
        { value: 42, desc: 'number' },
        { value: true, desc: 'boolean' },
        { value: null, desc: 'null' },
      ];

      for (const { value } of testCases) {
        const rule = new MappingRule({ left: 'field', literal: value });
        expect(rule.literal).toBe(value);
      }
    });
  });
});

describe('MappingPlan', () => {
  const createSampleRules = () => [
    new MappingRule({ left: 'user.id', right: 'person.identifier' }),
    new MappingRule({ left: 'user.name', right: 'person.fullName' }),
    new MappingRule({
      left: 'user.email',
      right: 'person.contactInfo.email',
    }),
  ];

  describe('Construction and defaults', () => {
    it('should create a plan with default rule orders', () => {
      const rules = createSampleRules();
      const plan = new MappingPlan(rules);

      expect(plan.rules).toBe(rules);
      expect(plan.rules.length).toBe(3);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);
    });

    it('should create a plan with custom toLeft order', () => {
      const rules = createSampleRules();
      const plan = new MappingPlan(rules, {
        order: { toLeft: MappingPlanRuleOrder.DESC },
      });

      expect(plan.rules).toBe(rules);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.DESC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);
    });

    it('should create a plan with custom toRight order', () => {
      const rules = createSampleRules();
      const plan = new MappingPlan(rules, {
        order: { toRight: MappingPlanRuleOrder.DESC },
      });

      expect(plan.rules).toBe(rules);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.DESC);
    });

    it('should create a plan with both custom orders', () => {
      const rules = createSampleRules();
      const plan = new MappingPlan(rules, {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      });

      expect(plan.rules).toBe(rules);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.DESC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.DESC);
    });

    it('should handle empty rules array', () => {
      const plan = new MappingPlan([]);

      expect(plan.rules).toEqual([]);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);
    });
  });

  describe('Order accessors', () => {
    it('should return the correct toLeftOrder', () => {
      const rules = createSampleRules();

      const ascPlan = new MappingPlan(rules, {
        order: { toLeft: MappingPlanRuleOrder.ASC },
      });
      expect(ascPlan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);

      const descPlan = new MappingPlan(rules, {
        order: { toLeft: MappingPlanRuleOrder.DESC },
      });
      expect(descPlan.toLeftOrder).toBe(MappingPlanRuleOrder.DESC);
    });

    it('should return the correct toRightOrder', () => {
      const rules = createSampleRules();

      const ascPlan = new MappingPlan(rules, {
        order: { toRight: MappingPlanRuleOrder.ASC },
      });
      expect(ascPlan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);

      const descPlan = new MappingPlan(rules, {
        order: { toRight: MappingPlanRuleOrder.DESC },
      });
      expect(descPlan.toRightOrder).toBe(MappingPlanRuleOrder.DESC);
    });
  });

  describe('Edge cases', () => {
    it('should handle partial order parameters', () => {
      const rules = createSampleRules();

      // Empty order object
      const emptyOrderPlan = new MappingPlan(rules, { order: {} });
      expect(emptyOrderPlan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);
      expect(emptyOrderPlan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);

      // Only one direction specified
      const partialOrderPlan = new MappingPlan(rules, {
        order: { toLeft: MappingPlanRuleOrder.DESC },
      });
      expect(partialOrderPlan.toLeftOrder).toBe(MappingPlanRuleOrder.DESC);
      expect(partialOrderPlan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);
    });

    it('should handle rules with diverse configurations', () => {
      // Creating rules with valid MappingRuleParams combinations
      const diverseRules = [
        new MappingRule({ left: 'a.b', right: 'a2.b2' }),
        new MappingRule({ literal: 'default value', right: 'c.d' }),
        new MappingRule({ left: 'e.f', right: 'g.h' }),
        new MappingRule({ left: 'i.j', literal: 'static value' }),
        new MappingRule({
          left: 'k.l',
          right: 'm.n',
          transform: {
            toLeft: (rightValue: string) => rightValue.split('.'),
            toRight: (leftValue: string[]) => leftValue.join('.'),
          },
        }),
      ];

      const plan = new MappingPlan(diverseRules);

      expect(plan.rules.length).toBe(5);
      expect(plan.toLeftOrder).toBe(MappingPlanRuleOrder.ASC);
      expect(plan.toRightOrder).toBe(MappingPlanRuleOrder.ASC);
    });
  });
});
