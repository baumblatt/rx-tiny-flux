/**
 * Creates a selector function that extracts a top-level state slice (feature) using a key.
 * It is analogous to NgRx's `createFeatureSelector`.
 *
 * @param {string} featureKey - The key for the top-level feature in the state object.
 * @param {function(any): any} [projectionFn] - An optional function to transform the selected value.
 * @returns {function(object): any} A function that receives the complete state and returns the selected part.
 */
export function createFeatureSelector(featureKey, projectionFn) {
  return (state) => {
    const selectedValue = state[featureKey];
    // If a projection function was provided, apply it to the value. Otherwise, return the value directly.
    return projectionFn ? projectionFn(selectedValue) : selectedValue;
  };
}

/**
 * Creates a selector function that can compose multiple selectors, whose results
 * are passed as arguments to a final projection function.
 * It is analogous to NgRx's `createSelector`.
 *
 * @param {...Function} args - A list of input selector functions, followed by a projection function.
 * @returns {function(object): any} The final composed selector function.
 */
export function createSelector(...args) {
  // The last argument is always the projection function.
  const projectionFn = args.pop();
  // All previous arguments are the input selectors.
  const inputSelectors = args;

  if (typeof projectionFn !== 'function') {
    throw new Error('The last argument to createSelector must be a projection function.');
  }

  return (state) => {
    const inputs = inputSelectors.map(selector => selector(state));
    return projectionFn(...inputs);
  }
}
