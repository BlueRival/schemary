import { describe, expect, it } from 'vitest';
import { PathSegment } from './pathSegment.class.js';
import { ArrayIndexSegmentClass } from './arrayIndexSegment.class.js';
import { ObjectFieldSegmentClass } from './objectFieldSegment.class.js';
import { JSONType } from '../../../types.js';

// Helper class that extends PathSegment for testing purposes
class TestPathSegment extends PathSegment {
  constructor(
    sourceText: string,
    public readonly id?: string, // Optional ID to identify specific instances
  ) {
    super(sourceText);
  }

  protected _getValue(previousValue: JSONType): JSONType | undefined {
    return previousValue;
  }

  protected _setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined {
    return value;
  }
}

describe('PathSegment', () => {
  describe('Static methods', () => {
    it('should get value with an empty path', () => {
      const source = { test: 'value' };
      const result = PathSegment.getValue(source, []);
      expect(result).toBe(source);
    });

    it('should get value with a single segment path', () => {
      const segment = new TestPathSegment('test');
      const source = { test: 'value' };

      const result = PathSegment.getValue(source, [segment]);

      // Our TestPathSegment returns the source without modification
      expect(result).toBe(source);
    });

    it('should get value with multiple segment path', () => {
      const segment1 = new TestPathSegment('segment1');
      const segment2 = new TestPathSegment('segment2');
      const segment3 = new TestPathSegment('segment3');
      const source = { test: 'value' };

      const result = PathSegment.getValue(source, [
        segment1,
        segment2,
        segment3,
      ]);

      // All our TestPathSegment instances pass through their input without modification
      expect(result).toBe(source);
    });

    it('should set value with an empty path', () => {
      const destination = { original: 'value' };
      const value = { new: 'value' };
      const result = PathSegment.setValue(destination, value, []);
      expect(result).toBe(value);
    });

    it('should set value with a single segment path', () => {
      const segment = new TestPathSegment('test');
      const destination = { original: 'value' };
      const value = { new: 'value' };

      const result = PathSegment.setValue(destination, value, [segment]);

      // Our TestPathSegment returns the value without modification
      expect(result).toBe(value);
    });

    it('should set value with multiple segment path', () => {
      const segment1 = new TestPathSegment('segment1');
      const segment2 = new TestPathSegment('segment2');
      const segment3 = new TestPathSegment('segment3');
      const destination = { original: 'value' };
      const value = { new: 'value' };

      const result = PathSegment.setValue(destination, value, [
        segment1,
        segment2,
        segment3,
      ]);

      // Our TestPathSegment chain returns the value without modification
      expect(result).toBe(value);
    });

    it('should convert a path to string representation', () => {
      const path = [
        new ObjectFieldSegmentClass('user', 'user'),
        new ArrayIndexSegmentClass('[0]', 0),
        new ObjectFieldSegmentClass('name', 'name'),
      ];

      const result = PathSegment.pathToString(path);
      expect(result).toBe('<root>.user.[0].name');
    });

    it('should handle empty path in pathToString', () => {
      const result = PathSegment.pathToString([]);
      expect(result).toBe('<root>');
    });
  });

  describe('getValue method', () => {
    it('should pass value through a single segment', () => {
      const segment = new TestPathSegment('test');
      const value = { data: 'test' };

      const result = segment.getValue(value);
      expect(result).toBe(value);
    });

    it('should handle multiple segments', () => {
      const segment1 = new TestPathSegment('segment1');
      const segment2 = new TestPathSegment('segment2');
      const segment3 = new TestPathSegment('segment3');
      const value = { data: 'test' };

      const result = segment1.getValue(value, [segment2, segment3]);
      expect(result).toBe(value);
    });

    it('should propagate errors with path information', () => {
      const segment = new TestPathSegment('test');
      // Override _getValue to throw an error
      segment['_getValue'] = () => {
        throw new Error('Test error');
      };

      expect(() => segment.getValue({})).toThrow('Test error at: <root>.test');
    });
  });

  describe('setValue method', () => {
    it('should set value when it is the last segment', () => {
      const segment = new TestPathSegment('test');
      const destination = { original: 'value' };
      const value = { new: 'value' };

      const result = segment.setValue(destination, value);
      expect(result).toBe(value);
    });

    it('should handle multiple segments', () => {
      const segment1 = new TestPathSegment('segment1');
      const segment2 = new TestPathSegment('segment2');
      const segment3 = new TestPathSegment('segment3');
      const destination = { original: 'value' };
      const value = { new: 'value' };

      const result = segment1.setValue(destination, value, [
        segment2,
        segment3,
      ]);
      expect(result).toBe(value);
    });

    it('should correctly handle exactly two segments to test getNextValue', () => {
      // Create custom TestPathSegment that keeps track of values
      class TrackingSegment extends TestPathSegment {
        public wasCalledWith: {
          destination: JSONType | undefined;
          value: JSONType | undefined;
        } | null = null;

        protected _setValue(
          destination: JSONType | undefined,
          value: JSONType | undefined,
        ): JSONType | undefined {
          this.wasCalledWith = { destination, value };
          return value;
        }
      }

      const segment1 = new TestPathSegment('segment1');
      const segment2 = new TrackingSegment('segment2');
      const destination = { original: 'value' };
      const value = { new: 'value' };

      const result = segment1.setValue(destination, value, [segment2]);

      // Verify segment2 was called with the correct parameters
      expect(segment2.wasCalledWith).not.toBeNull();
      expect(segment2.wasCalledWith?.destination).toBe(destination);
      expect(segment2.wasCalledWith?.value).toBe(value);
      expect(result).toBe(value);
    });

    it('should propagate errors with path information', () => {
      const segment = new TestPathSegment('test');
      // Override _setValue to throw an error
      segment['_setValue'] = () => {
        throw new Error('Test error');
      };

      expect(() => segment.setValue({}, {})).toThrow(
        'Test error at: <root>.test',
      );
    });
  });
});
