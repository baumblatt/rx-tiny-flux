import { filter } from 'rxjs';

/**
 * @typedef {import('./actions').Action} Action
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
 * Factory function to create an effect.
 * An effect is a function that receives the stream of all actions
 * and returns a new stream of actions to be dispatched.
 *
 * @param {function(ActionStream): ActionStream} effectFn
 * @returns {function(ActionStream): ActionStream} The effect function.
 */
export function createEffect(effectFn) {
  if (typeof effectFn !== 'function') {
    throw new Error('Effect must be a function.');
  }
  return effectFn;
}