/**
 * @typedef {import('./actions').Action} Action
 */

/**
 * A token to be used with `on` to catch any action.
 */
export function anyAction() {}

/**
 * Associates one or more action creators with a reducer function.
 * @param {...(function|function(any, Action): any)} args - A list of action creators, followed by the reducer function.
 * @returns {{ types: string[], reducerFn: function(any, Action): any }}
 */
export function on(...args) {
  // The last argument is the reducer function.
  const reducerFn = args.pop();
  // All previous arguments are the action creators.
  const actionCreators = args;

  // Checks if the `anyAction` token was used.
  const isCatchAll = actionCreators.includes(anyAction);
  if (isCatchAll && actionCreators.length > 1) {
    throw new Error('The `anyAction` token cannot be mixed with other action creators in a single `on` handler.');
  }

  const types = actionCreators.map(creator => creator.type);
  return { types, reducerFn, isCatchAll };
}

/**
 * Factory function to create a reducer.
 * A reducer is associated with a key that defines which top-level property of the state it manages.
 *
 * @param {string} featureKey - The key for the state slice this reducer manages.
 * @param {any} initialState - The initial state for this state slice.
 * @param  {...{ types: string[], reducerFn: function(any, Action): any }} ons - A list of handlers created with the `on` function.
 * @returns {{path: string, initialState: any, reducerFn: function(any, Action): any}} The reducer object.
 */
export function createReducer(featureKey, initialState, ...ons) {
  if (!featureKey || typeof featureKey !== 'string') {
    throw new Error('Reducer featureKey must be a non-empty string.');
  }

  // Separates specific handlers from generic (catch-all) ones.
  const specificHandlers = ons.filter(o => !o.isCatchAll);
  const catchAllHandler = ons.find(o => o.isCatchAll);

  const reducerFn = (state = initialState, action) => {
    // First, try to find a specific 'on' handler for the action.
    for (const handler of specificHandlers) {
      if (handler.types.includes(action.type)) {
        return handler.reducerFn(state, action);
      }
    }

    // If no specific handler matches, execute the 'any' handler, if it exists.
    if (catchAllHandler) {
      return catchAllHandler.reducerFn(state, action);
    }

    // If nothing matches, return the state unchanged.
    return state;
  };

  return { path: featureKey, initialState, reducerFn };
}