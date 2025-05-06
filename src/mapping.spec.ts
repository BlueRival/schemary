import { describe, expect, it } from 'vitest';
import * as mappingExports from './mapping.js';
import * as mappingModuleExports from './mapping/index.js';
import {
  compile,
  MappingRuleParams,
  MappingPlanParams,
  map,
  MappingPlan,
  MAP_DIRECTION,
} from './mapping.js';

// Helper function to check if an exported item is a function
function isFunction(item: unknown): boolean {
  return typeof item === 'function';
}

// Helper function to check if an exported item is a class or object type
function isObjectOrClass(item: unknown): boolean {
  return (
    typeof item === 'object' ||
    (typeof item === 'function' && item.prototype !== undefined)
  );
}

describe('Mapping Module Exports', () => {
  it('should export the compile function', () => {
    expect(isFunction(mappingExports.compile)).toBe(true);
    expect(compile).toBe(mappingModuleExports.compile);
  });

  it('should export the map function', () => {
    expect(isFunction(mappingExports.map)).toBe(true);
    expect(map).toBe(mappingModuleExports.map);
  });

  it('should export the MAP_DIRECTION enum', () => {
    expect(isObjectOrClass(mappingExports.MAP_DIRECTION)).toBe(true);
    expect(mappingExports.MAP_DIRECTION).toBe(
      mappingModuleExports.MAP_DIRECTION,
    );

    // Check that the enum has the expected values
    expect(mappingExports.MAP_DIRECTION.LeftToRight).toBe(0);
    expect(mappingExports.MAP_DIRECTION.RightToLeft).toBe(1);
  });

  it('should export the MappingPlan class', () => {
    expect(isObjectOrClass(mappingExports.MappingPlan)).toBe(true);
    expect(MappingPlan).toBe(mappingModuleExports.MappingPlan);

    // Create a simple instance to verify the class works
    const plan = new mappingExports.MappingPlan([]);
    expect(plan).toBeInstanceOf(mappingModuleExports.MappingPlan);
  });

  it('should maintain interface compatibility', () => {
    // Create a basic mapping rule
    const rule: MappingRuleParams<string, number> = {
      left: 'source.stringValue',
      right: 'target.numericValue',
      leftTransform: (rightValue: number) => String(rightValue),
      rightTransform: (leftValue: string) => Number(leftValue),
    };

    // Verify compile function works with the exported types
    const planParams: MappingPlanParams = {
      order: {
        toLeft: 0,
        toRight: 1,
      },
    };

    const plan = compile([rule], planParams);
    expect(plan).toBeInstanceOf(MappingPlan);
    expect(plan.rules.length).toBe(1);

    // Verify map function works with the exported types
    const source = { source: { stringValue: '42' } };
    const result = map(source, plan, undefined, MAP_DIRECTION.LeftToRight);

    // The result should have the mapped and transformed value
    expect(result).toEqual({ target: { numericValue: 42 } });
  });
});
