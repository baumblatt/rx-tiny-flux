import { filter } from 'rxjs';

/**
 * @typedef {import('./types').Action} Action
 * @typedef {import('rxjs').Observable<Action>} ActionStream
 */

/**
 * Custom RxJS operator to filter actions by type.
 * @param {...(function(any=): Action)} actionCreators - The action creators whose types will be used for filtering.
 * @returns {import('rxjs').OperatorFunction<Action, Action>}
 */
export function ofType(...actionCreators) {
  // Extracts the 'type' string from each action creator passed as an argument.
  const allowedTypes = actionCreators.map(creator => creator.type);

  return filter(action => allowedTypes.includes(action.type));
}

/**
 * Factory function to create an effect and attaches metadata to it.
 *
 * @param {function(ActionStream): ActionStream} effectFn A function that takes an actions stream and returns a new stream.
 * @param {object} [config] - An optional configuration object.
 * @param {boolean} [config.dispatch=true] - If false, the effect's output will not be dispatched as an action.
 * @returns {function(ActionStream): ActionStream} The effect function with a `_rxEffect` property for metadata.
 */
export function createEffect(effectFn, config = { dispatch: true }) {
  if (typeof effectFn !== 'function') {
    throw new Error('Effect must be a function.');
  }
  // Attach metadata to the function object itself.
  // This allows the store to identify it as an effect and read its configuration.
  Object.defineProperty(effectFn, '_rxEffect', {
    value: { dispatch: config.dispatch !== false }, // Default to true
    enumerable: false,
  });
  return effectFn;
}