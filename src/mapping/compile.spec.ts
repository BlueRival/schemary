import { describe, expect, it, vi } from 'vitest';
import { compile } from './compile.js';
import * as planModule from './plan.js';
import { ObjectFieldSegmentClass } from './parser/ast/objectFieldSegment.class.js';
import { MappingRule } from './plan.js';

type MappingRuleAny = MappingRule<any, any>;

function expectLeftPath(rule: MappingRuleAny) {
  if (!rule.leftPath) {
    expect.fail('leftPath is undefined');
  }
  return rule.leftPath;
}

function expectRightPath(rule: MappingRuleAny) {
  if (!rule.rightPath) {
    expect.fail('rightPath is undefined');
  }
  return rule.rightPath;
}

describe('Mapping Compiler', () => {
  // One test to verify that left/right values get parsed correctly
  describe('Path Parsing', () => {
    it('should parse left and right path values', () => {
      const mappings = [
        { left: 'user.firstName', right: 'person.givenName' },
        { left: 'user.lastName', right: 'person.familyName' },
      ];

      const plan = compile(mappings);

      expect(plan.rules).toHaveLength(2);

      // Check first rule
      let leftPath = expectLeftPath(plan.rules[0]);
      expect(leftPath).toHaveLength(2);
      expect(leftPath[0]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((leftPath[0] as ObjectFieldSegmentClass).name).toBe('user');
      expect(leftPath[1]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((leftPath[1] as ObjectFieldSegmentClass).name).toBe('firstName');

      leftPath = expectLeftPath(plan.rules[0]);
      expect(leftPath).toHaveLength(2);
      expect(leftPath[0]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((leftPath[0] as ObjectFieldSegmentClass).name).toBe('user');
      expect(leftPath[1]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((leftPath[1] as ObjectFieldSegmentClass).name).toBe('firstName');

      let rightPath = expectRightPath(plan.rules[0]);
      expect(rightPath).toHaveLength(2);
      expect(rightPath[0]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((rightPath[0] as ObjectFieldSegmentClass).name).toBe('person');
      expect(rightPath[1]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((rightPath[1] as ObjectFieldSegmentClass).name).toBe('givenName');

      rightPath = expectRightPath(plan.rules[1]);
      expect(rightPath).toHaveLength(2);
      expect(rightPath[0]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((rightPath[0] as ObjectFieldSegmentClass).name).toBe('person');
      expect(rightPath[1]).toBeInstanceOf(ObjectFieldSegmentClass);
      expect((rightPath[1] as ObjectFieldSegmentClass).name).toBe('familyName');
    });
  });

  describe('Error Handling', () => {
    it('should include rule index in error message when rule creation fails', () => {
      // Mock createMappingRule to throw an error
      const mockError = new Error('Invalid mapping rule');

      vi.spyOn(planModule, 'createMappingRule').mockImplementationOnce(() => {
        throw mockError;
      });

      // Call compile with a rule that will trigger the mocked error
      const mappings = [
        { left: 'field1', right: 'field2' }, // This will throw the mocked error
        { left: 'field3', right: 'field4' },
      ];

      // Verify that the error message includes the rule index
      try {
        compile(mappings);
        // If we reach here, the test should fail
        expect.fail('Expected compile to throw an error');
      } catch (error) {
        // @ts-expect-error This is a test file
        expect(error.message).toBe('Rule 0: Invalid mapping rule');
      }

      // Restore the original function
      vi.restoreAllMocks();
    });

    it('should handle non-Error thrown values', () => {
      // Mock createMappingRule to throw a non-Error value
      vi.spyOn(planModule, 'createMappingRule').mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'This is a string error'; // Not an Error instance
      });

      const mappings = [{ left: 'field1', right: 'field2' }];

      try {
        compile(mappings);
        expect.fail('Expected compile to throw an error');
      } catch (error) {
        // @ts-expect-error This is a test file
        expect(error.message).toBe('Rule 0: This is a string error');
      }

      // Restore the original function
      vi.restoreAllMocks();
    });
  });
});
