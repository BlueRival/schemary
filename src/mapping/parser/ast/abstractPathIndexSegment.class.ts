import { JSONType } from '../../../types.js';
import { AbstractPathSegment } from './abstractPathSegment.class.js';

export abstract class AbstractPathIndexSegment extends AbstractPathSegment {
  /**
   * Retrieves the value located at the specified path in the previousValue object.
   *
   * This is the abstract implementation which is a catch all for all subclasses.
   * Subclasses must override this method to provide the actual implementation.
   *
   * @param {JSONType} previousValue - The previousValue object or data structure to retrieve the value from.
   * @return {JSONType | undefined} The value found at the given path or `undefined` if the path does not exist.
   */
  public abstract getValue(previousValue: JSONType): JSONType | undefined;

  /**
   * Abstract method responsible for setting a value to a given destination.
   *
   * @param {JSONType | undefined} destination - The target JSON destination where the value should be set.
   * @param {JSONType | undefined} value - The value to be set in the destination.
   * @return {JSONType | undefined} The updated JSON destination after setting the value, or undefined if no update occurs.
   */
  public abstract setValue(
    destination: JSONType | undefined,
    value: JSONType | undefined,
  ): JSONType | undefined;
}
