/**
 * Factory function to create an action.
 * @param {string} type - The action type.
 * @returns {function(any=): Action} A function that creates the action with an optional payload.
 */
export function createAction(type) {
  const actionCreator = (payload) => ({ type, ...payload });
  actionCreator.type = type; // Attaches the type directly to the function for easy access
  return actionCreator;
}
