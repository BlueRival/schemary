import { JSONType } from '../../types.js';
import { clone } from '../../schema.js';
import { AbstractPathIteratorSegment } from './ast/abstractPathIteratorSegment.class.js';
import { PathSegment } from './ast/types.js';

export function extractValue(
  source: JSONType,
  path: PathSegment[],
): JSONType | undefined {
  let currentValue = source; // seed the loop
  let remainingPath = [...path];

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

    // Iterators take an array as a hole, because they iterator through it,
    // returning either a slice or single item from the array.
    // If source value is not an array, we discard it.
    if (currentSegment instanceof AbstractPathIteratorSegment) {
      // we ignore any source that comes in as not an array if the current segment is an iterator
      if (!Array.isArray(currentValue)) {
        currentValue = [];
      }

      // let the iterator get iteration
      const { result, chain } = currentSegment.getValue(currentValue);

      // if the iterator wants the iteration to recurse, iterate will be true
      if (chain) {
        currentValue = result.map((item) => extractValue(item, remainingPath));

        // loop, we will parse the rest of it recursively.
        remainingPath = [];
      } else {
        // iterator wants us to use the literal value, regardless of type, so move on
        currentValue = result;
      }

      continue;
    }

    // if source is an array, and the current path segment is not an iterator, recursively apply the path
    if (Array.isArray(currentValue)) {
      // Put current segment back on the path and clear out current path for this
      // loop, we will parse the rest of it recursively.
      const recursedPath = [currentSegment, ...remainingPath];
      remainingPath = [];

      currentValue = currentValue.map((item) =>
        extractValue(item, recursedPath),
      );
      continue;
    }

    if ('getValue' in currentSegment) {
      currentValue = currentSegment.getValue(currentValue);
      continue;
    }

    throw new Error(`Unknown path segment type: ${String(currentSegment)}}`);
  }

  return currentValue;
}

export function injectValue(
  destination: JSONType | undefined,
  value: JSONType | undefined,
  path: PathSegment[],
): JSONType | undefined {
  if (path.length === 0) {
    return value;
  }

  if (path.length === 1) {
    if (path[0] instanceof AbstractPathIteratorSegment) {
      if (!Array.isArray(destination)) {
        destination = [];
      }
      return path[0].setValue(destination, value);
    }

    return path[0].setValue(destination, value);
  }

  let currentDestination = clone(destination);

  const [currentSegment, ...remainingPath] = path;

  if (currentSegment instanceof AbstractPathIteratorSegment) {
    // we ignore any source that comes in as not an array if the current segment is an iterator
    if (!Array.isArray(currentDestination)) {
      currentDestination = [];
    }

    const { result, chain } = currentSegment.getValue(currentDestination);

    if (chain) {
      console.log('chain iteration');
      currentDestination = result.map((item) =>
        injectValue(item, value, remainingPath),
      );
    } else {
      console.log('no chain iteration');
      currentDestination = injectValue(result, value, remainingPath);
    }
  } else {
    // if the current
    const nextDestination = currentSegment.getValue(currentDestination);

    const nextValue = injectValue(nextDestination, value, remainingPath);

    currentDestination = currentSegment.setValue(currentDestination, nextValue);
  }

  return currentDestination;
}
