import { Observable } from 'rxjs';
import { filter, map, mergeMap, tap } from './rxjs';

/**
 * @typedef {import('./actions').Action} Action
 */

/**
 * A custom RxJS operator that combines the source action with the latest value from the store,
 * using a provided selector.
 *
 * This operator is designed for environments like ZeppOS where the store instance is not
 * easily accessible at effect declaration time. It safely leverages the `subscribe` method
 * injected into the action's `context` by the `storePlugin`.
 *
 * It subscribes to get the current value, takes only that one value, and immediately
 * unsubscribes, preventing memory leaks.
 *
 * @param {function(object): any} selector - The selector function to get a slice of the state.
 * @returns {import('rxjs').OperatorFunction<Action, [Action, any]>} A new observable that emits an array containing the original action and the selected state slice.
 */
export const withLatestFromStore = (selector) => (source$) =>
  source$.pipe(
    mergeMap((action) => {
      if (!action.context || typeof action.context.subscribe !== 'function') {
        throw new Error(
          '[rx-tiny-flux] `withLatestFromStore` operator requires a `subscribe` method on `action.context`. Ensure you are using the `storePlugin` for ZeppOS.'
        );
      }

      // Create a new Observable that wraps the context's subscribe method.
      return new Observable((subscriber) => {
        // Use the safe, lifecycle-aware subscribe method from the context.
        const subscription = action.context.subscribe(selector, (stateSlice) => {
          subscriber.next(stateSlice); // Emit the state slice
          subscriber.complete(); // We only need the first value
        });

        // The returned function is the teardown logic, which unsubscribes.
        return () => {
          subscription.unsubscribe();
        };
      }).pipe(
        // Map the state slice to the desired [action, stateSlice] format.
        map((stateSlice) => [action, stateSlice])
      );
    })
  );

/**
 * A pipeable RxJS operator that filters an observable stream, allowing emissions
 * only if the code is running in the ZeppOS Side Service environment.
 */
export const isSideService = () => filter(() => typeof messaging !== 'undefined');

/**
 * A pipeable RxJS operator that filters an observable stream, allowing emissions
 * only if the code is running in the ZeppOS App or Page environment.
 */
export const isApp = () => filter(() => typeof messaging === 'undefined');

/**
 * A pipeable RxJS operator for effects, designed to propagate an action from one ZeppOS
 * context to another (e.g., App to Side Service).
 *
 * It uses the `context.call` method injected by the ZML plugin system. The `context`
 * property is removed from the action before sending to avoid circular data.
 *
 * @returns {import('rxjs').OperatorFunction<Action, Action>} An operator that performs the side effect of calling the other context.
 */
export const propagateAction = () => tap((action) => {
  if (action.context && typeof action.context.call === 'function') {
    // Destructure to remove the context before sending.
    // The receiving side will inject its own context.
    const { context, ...actionToSend } = action;
    action.context.call(actionToSend);
  }
});
