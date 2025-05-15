import { AbstractPathIndexSegment } from './ast/abstractPathIndexSegment.class.js';
import { JSONType } from '../../types.js';
import { AbstractPathIteratorSegment } from './ast/abstractPathIteratorSegment.class.js';
import { AbstractPathSegment } from './ast/abstractPathSegment.class.js';

export function extractValue(
  source: JSONType,
  path: AbstractPathSegment[],
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
    const currentSegment = remainingPath.shift() as AbstractPathSegment;

    // Iterators take an array as a hole, because they iterator through it,
    // returning either a slice or single item from the array.
    // If source value is not an array, we discard it.
    if (currentSegment instanceof AbstractPathIteratorSegment) {
      // we ignore any source that comes in as not an array if the current segment is an iterator
      if (!Array.isArray(currentValue)) {
        currentValue = [];
      }

      // let the iterator get iteration
      const { result, iterate } = currentSegment.getValue(currentValue);

      // if the iterator wants the iteration to recurse, iterate will be true
      if (iterate) {
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

    if (currentSegment instanceof AbstractPathIndexSegment) {
      currentValue = currentSegment.getValue(currentValue);
      continue;
    }

    throw new Error(
      `Unknown path segment type: ${currentSegment.constructor.name}`,
    );
  }

  return currentValue;
}

export function injectValue(
  destination: JSONType,
  value: JSONType | undefined,
  path: AbstractPathIndexSegment[],
): JSONType | undefined {
  if (path.length === 0) {
    return value;
  }
  const [firstSegment, ...remainingPath] = path;
  // TODO: write this
}
