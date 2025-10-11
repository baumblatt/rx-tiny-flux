/**
 * @typedef {import('rx-tiny-flux').OperatorFunction} OperatorFunction
 * @typedef {import('rx-tiny-flux').Subscription} Subscription
 */

/**
 * @typedef {Object} Action
 * @property {string} type - The action type, a unique string describing it.
 * @property {any} [payload] - The data associated with the action.
 * @property {object} [context] - The instance context (e.g., Page) that dispatched the action.
 */

/**
 * @typedef {object} StorePage
 * @property {function(Action): void} dispatch
 *   Dispatches an action to the store. The plugin will automatically attach the
 *   current page instance as the `context` for the action.
 * 
 * @property {<T, A, B, C, D, E, F>(
 *   selector: (state: object) => T,
 *   op1?: OperatorFunction<T, A>,
 *   op2?: OperatorFunction<A, B>,
 *   op3?: OperatorFunction<B, C>,
 *   op4?: OperatorFunction<C, D>,
 *   op5?: OperatorFunction<D, E>,
 *   op6?: OperatorFunction<E, F>,
 *   callback: (value: F) => void
 * ) => Subscription} subscribe
 *   Subscribes to a slice of the store's state. The subscription is automatically
 *   managed and will be unsubscribed when the page is destroyed.
 *   You can pass any number of pipeable RxJS operators between the selector and the callback.
 * 
 * @property {function(
 *   actionTypes: (string | {type: string}) | Array<string | {type: string}>,
 *   callback: (action: Action) => void
 * ): void} listen
 *   Subscribes to specific store actions to trigger side-effects (e.g., UI notifications).
 *   The subscription is automatically managed and will be unsubscribed when the page is destroyed.
 *   Accepts a single action creator/type or an array of them.
 * 
 * @property {function(Action): void} onAction
 *   A handler for actions received via the messaging system from other contexts (e.g., Side Service).
 *   For Pages, this is typically a no-op as the global App instance handles incoming actions,
 *   but it is present on the instance.
 */