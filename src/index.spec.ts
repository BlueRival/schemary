import { describe, it, expect } from 'vitest';
import * as Index from './index.js';
import * as Types from './types.scoped.js';
import * as Schema from './schema.js';
import * as Mapping from './mapping.js';

describe('index.ts', () => {
  it('should export Types module', () => {
    expect(Index.Types).toBeDefined();
    // Verify that it's the same module we're importing directly
    expect(Index.Types).toEqual(Types);
  });

  it('should export Schema module', () => {
    expect(Index.Schema).toBeDefined();
    // Verify that it's the same module we're importing directly
    expect(Index.Schema).toEqual(Schema);
  });

  it('should export Mapping module', () => {
    expect(Index.Mapping).toBeDefined();
    // Verify that it's the same module we're importing directly
    expect(Index.Mapping).toEqual(Mapping);
  });

  // Note: We don't test for specific types from the Types module
  // because TypeScript types are erased at runtime.
  // The TypeScript compiler will check these types during development and build.

  it('should export specific functions from Schema module', () => {
    // Check the main schema functions
    expect(Index.Schema.shift).toBeDefined();
    expect(typeof Index.Schema.shift).toBe('function');

    expect(Index.Schema.validate).toBeDefined();
    expect(typeof Index.Schema.validate).toBe('function');

    expect(Index.Schema.clone).toBeDefined();
    expect(typeof Index.Schema.clone).toBe('function');

    expect(Index.Schema.extract).toBeDefined();
    expect(typeof Index.Schema.extract).toBe('function');
  });

  it('should export specific functions and classes from Mapping module', () => {
    // Check the main mapping exports
    expect(Index.Mapping.PlanRuleOrder).toBeDefined();
    expect(Index.Mapping.Plan).toBeDefined();
    expect(typeof Index.Mapping.Plan).toBe('function');

    expect(Index.Mapping.compilePlan).toBeDefined();
    expect(typeof Index.Mapping.compilePlan).toBe('function');
  });
});
