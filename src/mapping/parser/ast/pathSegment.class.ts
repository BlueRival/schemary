import { JSONType } from '../../../types.js';

// Base class for path segments
export abstract class PathSegment {
  protected constructor(public readonly sourceText: string) {}

  public getValue(
    previousValue: JSONType,
    remainingPath: PathSegment[] = [],
    traversedPath: PathSegment[] = [],
  ): JSONType | undefined {
    // add ourselves to the path
    traversedPath = traversedPath.concat(this);

    try {
      // get the value from this segment
      const myValue = this._getValue(previousValue);

      // if there are no more segments, be done
      if (remainingPath.length === 0) {
        return myValue;
      }

      // get ready to recuse into the next segment
      const [nextSegment, ...nextRemainingPath] = remainingPath;

      // recurse to get next value
      return nextSegment.getValue(myValue, nextRemainingPath, traversedPath);
    } catch (e) {
      PathSegment.handlePathError(e, traversedPath);
    }
  }

  public setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
    remainingPath: PathSegment[] = [],
    traversedPath: PathSegment[] = [],
  ): JSONType | undefined {
    // add ourselves to the path
    traversedPath = traversedPath.concat(this);

    try {
      // if no next segment, just set the value, its our value
      if (remainingPath.length === 0) {
        return this._setValue(destination, value);
      }

      // Pass the value/destination up to the next segment, and let it return
      // its value so we know what to set on this segment.
      const nextValue = this.getNextValue(
        destination,
        value,
        remainingPath,
        traversedPath,
      );

      return this._setValue(destination, nextValue);
    } catch (e) {
      PathSegment.handlePathError(e, traversedPath);
    }
  }

  public static getValue(
    source: JSONType,
    path: PathSegment[],
  ): JSONType | undefined {
    if (path.length === 0) {
      return source;
    }
    const [firstSegment, ...remainingPath] = path;

    return firstSegment.getValue(source, remainingPath);
  }

  public static setValue(
    destination: JSONType,
    value: JSONType | undefined,
    path: PathSegment[],
  ): JSONType | undefined {
    if (path.length === 0) {
      return value;
    }
    const [firstSegment, ...remainingPath] = path;

    return firstSegment.setValue(destination, value, remainingPath);
  }

  public static pathToString(path: PathSegment[]): string {
    let root = '<root>';

    if (path.length > 0) {
      root += '.';
    }

    return root + path.map((segment) => segment.sourceText).join('.');
  }

  /**
   * For non-terminal segments, we need the downstream value to set on the current segment.
   *
   * This method figures out the next segment from the path, and calls it to get it's value.
   *
   * A critical step is unwinding the destination. If the destination exists, we must pass that up, "unwinding" the
   * current destination. _getValue() returns the object/array that the next segment would be looking for, or, it
   * returns a place holder if this is the first time populating destination.
   *
   * @param {JSONType | undefined} destination - The current destination where the value is being assigned. Initially, it might be undefined.
   * @param {JSONType | undefined} value - The value to be set at the desired path location.
   * @param {PathSegment[]} remainingPath - The remaining path segments to be traversed to reach the target location.
   * @param {PathSegment[]} [traversedPath=[]] - An optional array to track the segments that have been traversed.
   * @return {JSONType} The updated JSON object after setting the value at the target location.
   */
  private getNextValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
    remainingPath: PathSegment[],
    traversedPath: PathSegment[] = [],
  ): JSONType {
    // We are not the last segment, so pass the value/destination up to the next segment
    const [nextSegment, ...nextRemainingPath] = remainingPath;

    // if this is the first traversal of the path, destination will be undefined
    const nextDestination = this._getValue(destination);

    return nextSegment.setValue(
      nextDestination,
      value,
      nextRemainingPath,
      traversedPath,
    );
  }

  private static handlePathError(error: unknown, path: PathSegment[]): never {
    const myError = error instanceof Error ? error : new Error(String(error));

    const errorPathString = PathSegment.pathToString(path);

    throw new Error(`${myError.message} at: ${errorPathString}`);
  }

  /**
   * Retrieves the value located at the specified path in the previousValue object.
   *
   * This is the abstract implementation which is a catch all for all subclasses.
   * Subclasses must override this method to provide the actual implementation.
   *
   * @param {JSONType} previousValue - The previousValue object or data structure to retrieve the value from.
   * @return {JSONType | undefined} The value found at the given path or `undefined` if the path does not exist.
   */
  protected abstract _getValue(previousValue: JSONType): JSONType | undefined;

  /**
   * Abstract method responsible for setting a value to a given destination.
   *
   * @param {JSONType | undefined} destination - The target JSON destination where the value should be set.
   * @param {JSONType | undefined} value - The value to be set in the destination.
   * @return {JSONType | undefined} The updated JSON destination after setting the value, or undefined if no update occurs.
   */
  protected abstract _setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined;
}
