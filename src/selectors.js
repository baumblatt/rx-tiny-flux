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

  // Memoization state
  let lastResult;
  let lastArgs;
  let hasRun = false;

  /**
   * Checks if two arrays of arguments are shallowly equal.
   * @param {any[]} a - First array of arguments.
   * @param {any[]} b - Second array of arguments.
   * @returns {boolean} - True if the arrays are equal.
   */
  function areArgsEqual(a, b) {
    if (!b || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      // Strict equality check for each argument. This works because our improved
      // store logic preserves references for unchanged state slices.
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

	return (state) => {
	  const newArgs = inputSelectors.map(selector => selector(state));

	  if (hasRun && areArgsEqual(newArgs, lastArgs)) {
		  // If the inputs from selectors are the same as last time, return the cached result.
		  // This preserves reference equality for derived data.
		  return lastResult;
	  }

	  // Otherwise, compute the new result, cache it, and return it.
	  lastArgs = newArgs;
	  lastResult = projectionFn(...newArgs);
	  hasRun = true;

	  return lastResult;
  };
}
