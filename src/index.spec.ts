import { describe, it, expect } from 'vitest';
import * as Index from './index.js';
import * as Types from './types.scoped.js';
import * as Schema from './schema.js';
import * as Mapping from './mapping.js';
import * as JSON from './json.js';

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

  it('should export JSON module', () => {
    expect(Index.JSON).toBeDefined();
    // Verify that it's the same module we're importing directly
    expect(Index.JSON).toEqual(JSON);
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

    expect(Index.Mapping.FormatType).toBeDefined();
    expect(typeof Index.Mapping.FormatType).toBe(typeof Mapping.FormatType);

    expect(Index.Mapping.Formatting).toBeDefined();
    expect(typeof Index.Mapping.Formatting.TimeStamp).toBe(
      typeof Mapping.Formatting,
    );
  });

  it('should export specific functions from JSON module', () => {
    expect(Index.JSON.parse).toBeDefined();
    expect(typeof Index.JSON.parse).toBe('function');

    expect(Index.JSON.stringify).toBeDefined();
    expect(typeof Index.JSON.stringify).toBe('function');
  });
});
