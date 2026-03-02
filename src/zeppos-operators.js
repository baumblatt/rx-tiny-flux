import {filter, map, tap} from 'rxjs';

/**
 * @typedef {import('./types').Action} Action
 */

/**
 * A custom RxJS operator that combines the source action with the latest value from the store,
 * using a provided selector.
 *
 * This operator is designed for environments like ZeppOS where the store instance is not
 * easily accessible at effect declaration time. It safely leverages the `_store` instance
 * available on the action's `context`.
 *
 * It selects the current value from the store, takes only that one value, and completes,
 * preventing memory leaks.
 *
 * @param {...function(object): any} selectors - One or more selector functions to get slices of the state.
 * @returns {import('rxjs').OperatorFunction<Action, [Action, ...any[]]>} A new observable that emits an array containing the original action and the selected state slices.
 */
export const withLatestFromStore = (...selectors) => (source$) => source$.pipe(
    // Validate that the store is available on the action's context.
    tap(action => {
      if (!action.context || !action.context._store || !action.context._store._state$) {
        throw new Error(
          '[rx-tiny-flux] `withLatestFromStore` could not find a valid store on `action.context._store`. Ensure the `storePlugin` is correctly configured.'
        );
      }
    }),
    // Combine the action with the latest state slices from the store.
    // This is more direct and performant than using `mergeMap` because `_state$`
    // is a BehaviorSubject, allowing synchronous access to its current value.
    map(action => {
      const state = action.context._store._state$.getValue();
      return [action, ...selectors.map(selector => selector(state))];
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
	action.context.log(`Propagation action '${action.type}' through messaging.call(action).`);
    const { context, ...actionToSend } = action;
    const payloadSizeBytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(JSON.stringify(actionToSend)).length
      : unescape(encodeURIComponent(JSON.stringify(actionToSend))).length;
    action.context.log(`Payload size for action '${action.type}': ${payloadSizeBytes} bytes.`);
    action.context.call(actionToSend);
  } else {
	console.log(`No context: Action '${action.type}' not propagated through messaging.call(action).`);
  }
});
