import { AbstractPathIndexSegment } from './ast/abstractPathIndexSegment.class.js';
import { ArrayIndexSegmentClass } from './ast/arrayIndexSegment.class.js';
import { ArrayIteratorSegment } from './ast/arrayIteratorSegment.class.js';
import { ObjectIndexSegment } from './ast/objectIndexSegment.class.js';
import { AbstractPathIteratorSegment } from './ast/abstractPathIteratorSegment.class.js';
import { PathSegment } from './ast/types.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly pos: number,
  ) {
    super(`Parse error at position ${pos}: ${message}`);
  }
}

export class Parser {
  private position = 0;
  private segments: PathSegment[] | null = null;

  constructor(private readonly input: string) {}

  /**
   * Parse a path expression into a list of path segments
   */
  parsePath(): PathSegment[] {
    // only parse once
    if (this.segments) {
      return this.segments;
    }

    this.position = 0;

    // eat up leading whitespace
    while (this.peek() !== '' && /\s|\t/.test(this.peek())) {
      this.consume();
    }

    const segments: PathSegment[] = [];

    // Allow empty path as a special case to reference the root
    if (this.input.length < 1) {
      return segments;
    }

    // Parse segments until end of input
    while (this.position < this.input.length) {
      segments.push(this.parseSegment());

      // If we have a dot, consume it and continue parsing
      if (this.peek() === '.') {
        this.consume();
        continue;
      }

      // If we have an open bracket, it's the start of an array index or slice
      // We only treat it as a special segment if it's not a field name
      if (this.peek() === '[' && this.isIndexOrSlice()) {
        continue;
      }

      // If we've reached here, we're done with the path
      break;
    }

    this.segments = segments;
    return segments;
  }

  /**
   * Determines if the current bracket is part of an index or slice expression
   * rather than part of a field name
   */
  private isIndexOrSlice(): boolean {
    // Empty "[]" means a literal field name; otherwise treat as index or slice.
    if (this.position + 1 >= this.input.length) {
      throw new ParseError('Unclosed bracket in path', this.position);
    }
    return this.input[this.position + 1] !== ']';
  }

  private parseSegment(): PathSegment {
    const char = this.peek();

    // Array slice ([[start,end?]])
    if (
      char === '[' &&
      this.input[this.position + 1] === '[' &&
      this.isIndexOrSlice()
    ) {
      return this.parseArrayIteratorSegment();
    }

    // Array index ([index])
    if (char === '[' && this.isIndexOrSlice()) {
      return this.parseArrayIndexSegment();
    }

    // Field identifier (possibly with escapes)
    return this.parseObjectIndexSegment();
  }

  private parseObjectIndexSegment(): AbstractPathIndexSegment {
    let text = '';
    let name = '';
    let escaping = false;
    // Track if we're inside an escaped bracket sequence
    let insideEscapedBrackets = false;

    while (this.position < this.input.length) {
      const char = this.peek();

      // Handle escaping
      if (escaping) {
        // Track if we're escaping a bracket
        if (char === '[') {
          insideEscapedBrackets = true;
        } else if (char === ']') {
          insideEscapedBrackets = false;
        }

        // Properly handle all escaped characters
        name += char;
        escaping = false;
        text += this.consume();
        continue;
      }

      // Start escaping
      if (char === '\\') {
        escaping = true;
        text += this.consume();
        continue;
      }

      // Allow dots when inside escaped brackets
      if (char === '.' && insideEscapedBrackets) {
        name += char;
        text += this.consume();
        continue;
      }

      // End of identifier when we hit an unescaped delimiter
      if ((char === '.' || char === '[') && !escaping) {
        // Check if [ is the start of an index/slice and not part of a field name
        if (char === '[' && !this.isIndexOrSlice()) {
          name += char;
          text += this.consume();
          continue;
        }
        break;
      }

      name += char;
      text += this.consume();
    }

    if (!name) {
      throw new ParseError('Expected identifier', this.position);
    }

    return new ObjectIndexSegment(text, name);
  }

  private parseArrayIndexSegment(): AbstractPathIteratorSegment {
    let text = '';
    text += this.consume();

    // Check if the next character is a valid start for an integer
    if (!/[-\d]/.test(this.peek())) {
      throw new ParseError(
        `Expected integer, got '${this.peek()}'`,
        this.position,
      );
    }

    const index = this.parseInteger();
    text += index;

    // Ensure we have a closing bracket
    text += this.expect(']', 'array index closing bracket');

    return new ArrayIndexSegmentClass(text, index);
  }

  private parseArrayIteratorSegment(): AbstractPathIteratorSegment {
    let text = '';

    text += this.consume();
    text += this.consume();

    // Check if the next character is a valid start for an integer
    if (!/[-\d]/.test(this.peek())) {
      throw new ParseError(
        `Expected integer, got '${this.peek()}'`,
        this.position,
      );
    }

    const start = this.parseInteger();
    text += start;
    let end: number | undefined;

    if (this.peek() === ',') {
      text += this.consume();

      // Check if the next character after comma is a valid start for an integer
      if (!/[-\d]/.test(this.peek())) {
        throw new ParseError(
          `Expected integer after comma, got '${this.peek()}'`,
          this.position,
        );
      }

      end = this.parseInteger();
      text += end;
    }

    text += this.expect(']', 'slice closing bracket');
    text += this.expect(']', 'array slice closing bracket');

    return new ArrayIteratorSegment(text, start, end);
  }

  private parseInteger(): number {
    const start = this.position;

    // Handle negative numbers
    if (this.peek() === '-') {
      this.consume();
    }

    // Check if we have at least one digit
    if (!/\d/.test(this.peek())) {
      throw new ParseError(
        `Expected integer, got '${this.peek()}'`,
        this.position,
      );
    }

    // Parse digits
    while (/\d/.test(this.peek())) {
      this.consume();
    }

    const numStr = this.input.slice(start, this.position);
    const num = Number(numStr);

    if (!Number.isInteger(num) || !Number.isFinite(num)) {
      throw new ParseError('Invalid integer', start);
    }

    return num;
  }

  private peek(): string {
    if (this.position >= this.input.length) {
      return '';
    }

    return this.input[this.position];
  }

  private consume(): string {
    return this.input[this.position++];
  }

  private expect(char: string, message: string): string {
    const peeked = this.peek();
    if (peeked !== char) {
      throw new ParseError(
        `Expected ${message} '${char}', got '${peeked || 'end of input'}'`,
        this.position,
      );
    }
    return this.consume();
  }
}
