import { JSONType } from '../../types.js';
import {
  AbstractPathIteratorSegment,
  IterationResult,
} from './ast/abstractPathIteratorSegment.class.js';
import { PathSegment } from './ast/types.js';
import { AbstractPathIndexSegment } from './ast/abstractPathIndexSegment.class.js';

function generatePathString(path: unknown[]): string {
  return path
    .map((segment) => {
      if (segment instanceof AbstractPathIteratorSegment) {
        return segment.sourceText;
      }

      if (segment instanceof AbstractPathIndexSegment) {
        return `.${segment.sourceText}`;
      }

      return '<invalid path segment>';
    })
    .join('');
}

export class PathError extends Error {
  constructor(message: unknown, traversedPath: PathSegment[]) {
    if (message instanceof PathError) {
      return message;
    }

    const myError =
      message instanceof Error ? message : new Error(String(message));

    const pathString = generatePathString(traversedPath).replace(/^\./, '');

    super(`Exception at ${pathString}: ${myError.message}`);

    this.stack = myError.stack;
  }
}

function _extractIteratorValue(
  currentValue: JSONType,
  currentSegment: AbstractPathIteratorSegment,
  remainingPath: PathSegment[],
  traversePath: PathSegment[] = [],
): IterationResult {
  // we ignore any source that comes in as not an array if the current segment is an iterator
  if (!Array.isArray(currentValue)) {
    currentValue = [];
  }

  // let the iterator get iteration
  const { result, chain } = currentSegment.getValue(currentValue);

  // if the iterator wants the iteration to recurse, iterate will be true
  if (chain) {
    // loop, we will parse the rest of the path recursively, so this loop can end
    const recursedPath = remainingPath;
    remainingPath = [];

    currentValue = result.map((item) =>
      _extractValue(item, recursedPath, traversePath),
    );

    return { result: currentValue, chain };
  }

  return { result, chain };
}

function _extractIndexValueChained(
  currentValue: JSONType[],
  currentSegment: AbstractPathIndexSegment,
  remainingPath: PathSegment[],
  traversePath: PathSegment[] = [],
): JSONType[] {
  // The current segment is not an iterator, but we got an array as the value.
  // We auto-chain and iterate here. This means we need to unwind the path first.
  remainingPath.unshift(currentSegment); // put the current segment back on the stack
  traversePath.pop(); // remove the current segment from the traversal path

  return currentValue.map((item) =>
    _extractValue(item, remainingPath, traversePath),
  );
}

function _extractIndexValueUnchained(
  currentValue: JSONType,
  currentSegment: AbstractPathIndexSegment,
): JSONType {
  return currentSegment.getValue(currentValue);
}

function _extractValue(
  source: JSONType,
  path: PathSegment[],
  traversePath: PathSegment[] = [],
): JSONType | undefined {
  let currentValue = source; // seed the loop

  if (!Array.isArray(path)) {
    throw new Error('Path must be an array');
  }

  // shallow copy so we don't modify original paths
  let remainingPath = [...path];
  traversePath = [...traversePath];

  try {
    /**
     * Walk down the path of segments. If an explicit iterator is found, we force
     * an array at this point in time even if the current value is not an array.
     *
     * This is because the mapper is only interested in sources that match its
     * expected schema. If the actual input doesn't match it, the mapper enforces
     * the schema.
     *
     * If an array is encountered when the current segment is NOT an iterator,
     * we recursively map the remaining path for each item in the array.
     *
     * If we are not encountering an array, or an iterator segment, just extract the
     * value from the current variable using the current segment.
     */
    while (remainingPath.length > 0) {
      // we know shift will return an entry because we are in a while(path.length > 0) loop
      const currentSegment = remainingPath.shift() as PathSegment;
      traversePath.push(currentSegment);

      // Iterators take an array as a hole, because they iterator through it,
      // returning either a slice or single item from the array.
      // If source value is not an array, we discard it.
      if (currentSegment instanceof AbstractPathIteratorSegment) {
        const { result, chain } = _extractIteratorValue(
          currentValue,
          currentSegment,
          remainingPath,
          traversePath,
        );

        currentValue = result;

        if (chain) {
          // iterator recursed
          remainingPath = [];
        }

        continue;
      }

      // the current source is an array, but the segment is not an iterator, so we default to chaining
      if (Array.isArray(currentValue)) {
        currentValue = _extractIndexValueChained(
          currentValue,
          currentSegment,
          remainingPath,
          traversePath,
        );

        // clear the remaining path for this loop because it will be handled in the recursion
        remainingPath = [];

        continue;
      }

      // non-array value and non-iterator segment is a straight forward extract
      currentValue = _extractIndexValueUnchained(currentValue, currentSegment);
    }
  } catch (e) {
    if (e instanceof PathError) {
      throw e;
    }

    throw new PathError(e, traversePath);
  }

  return currentValue;
}

function _injectValueIterator(
  currentDestination: JSONType,
  currentSegment: AbstractPathIteratorSegment,
  value: JSONType | undefined,
  remainingPath: PathSegment[],
  traversedPath: PathSegment[],
): JSONType | undefined {
  // we ignore any source that comes in as not an array since current segment is an iterator
  if (!Array.isArray(currentDestination)) {
    currentDestination = [];
  }

  const { result, chain } = currentSegment.getValue(currentDestination);
  let nextValue: JSONType;

  if (chain) {
    // if value is not an array, we just make it one and pass it to the first slot in the chained iterator
    const arrValue = Array.isArray(value) ? value : [value];

    nextValue = arrValue.map((item, index) =>
      _injectValue(
        index < result.length ? result[index] : undefined,
        item,
        remainingPath,
        traversedPath,
      ),
    );
  } else {
    nextValue = _injectValue(result, value, remainingPath, traversedPath);
  }

  return currentSegment.setValue(currentDestination, nextValue);
}

function _injectValueIndex(
  currentDestination: JSONType,
  currentSegment: AbstractPathIndexSegment,
  value: JSONType | undefined,
  remainingPath: PathSegment[],
  traversedPath: PathSegment[],
): JSONType | undefined {
  const nextDestination = currentSegment.getValue(currentDestination);

  const nextValue = _injectValue(
    nextDestination,
    value,
    remainingPath,
    traversedPath,
  );

  return currentSegment.setValue(currentDestination, nextValue);
}

function __injectValue(
  destination: JSONType | undefined,
  value: JSONType | undefined,
  currentSegment: PathSegment,
  remainingPath: PathSegment[],
  traversedPath: PathSegment[] = [],
): JSONType | undefined {
  if (currentSegment instanceof AbstractPathIteratorSegment) {
    return _injectValueIterator(
      destination,
      currentSegment,
      value,
      remainingPath,
      traversedPath,
    );
  }

  return _injectValueIndex(
    destination,
    currentSegment,
    value,
    remainingPath,
    traversedPath,
  );
}

function _injectValue(
  destination: JSONType | undefined,
  value: JSONType | undefined,
  path: PathSegment[],
  traversedPath: PathSegment[] = [],
): JSONType | undefined {
  if (!Array.isArray(path)) {
    throw new Error('Path must be an array');
  }

  if (path.length === 0) {
    return value;
  }

  try {
    const [currentSegment, ...remainingPath] = path;
    traversedPath.push(currentSegment);

    return __injectValue(
      destination,
      value,
      currentSegment,
      remainingPath,
      traversedPath,
    );
  } catch (e) {
    if (e instanceof PathError) {
      throw e;
    }

    throw new PathError(e, traversedPath);
  }
}

export function extractValue(
  source: JSONType,
  path: PathSegment[],
): JSONType | undefined {
  return _extractValue(source, path);
}

export function injectValue(
  destination: JSONType | undefined,
  value: JSONType | undefined,
  path: PathSegment[],
): JSONType | undefined {
  return _injectValue(destination, value, path);
}
