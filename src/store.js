import {BehaviorSubject, Subject} from 'rxjs';
import {distinctUntilChanged, map, scan, shareReplay, startWith} from 'rxjs/operators';

/**
 * @typedef {import('./types').Action} Action
 */

export class Store {
  /**
   * @private
   * @type {BehaviorSubject<object>}
   */
  _state$;

  /**
   * @private
   * @type {Subject<Action>}
   */
  _actions$ = new Subject();

  /**
   * Public observable stream of all dispatched actions.
   * Useful for effects and plugins.
   * @type {import('rxjs').Observable<Action>}
   */
  get actions$() {
    return this._actions$.asObservable();
  }

  /**
   * @private
   * @type {Array<{path: string, initialState: any, reducerFn: function(any, Action): any}>}
   */
  _reducers = [];

  /**
   * @private
   * @type {object|null}
   */
  _context = null;

  /**
   * @param {object} initialState - The initial state of the application.
   */
  constructor(initialState = {}) {
    // The initial state is now deep-cloned to prevent external mutations.
    // `structuredClone` is modern and ideal, but `JSON.parse` is a safe fallback.
    const initialStoreState = typeof structuredClone === 'function' ? structuredClone(initialState) : JSON.parse(JSON.stringify(initialState));
    this._state$ = new BehaviorSubject(initialStoreState);

    const dispatcher$ = this._actions$;

    const state$ = dispatcher$.pipe(
      scan((currentState, action) => {
        // Create a shallow copy of the state. This is key to preserving references
        // for unchanged state slices, which allows memoized selectors to work.
        let nextState = { ...currentState };
        let hasChanged = false;

        this._reducers.forEach(({ path: featureKey, reducerFn }) => {
          // Gets the current state slice.
          const stateSlice = currentState[featureKey];

          // Executes the reducer to get the new slice.
          const nextStateSlice = reducerFn(stateSlice, action);

          // If the reducer returned a new object reference, the slice has changed.
          if (stateSlice !== nextStateSlice) {
            nextState[featureKey] = nextStateSlice;
            hasChanged = true;
          }
        });

        return hasChanged ? nextState : currentState;
      }, initialStoreState),
      startWith(initialState),
      // Ensures new subscribers receive the last emitted state and shares the execution.
      shareReplay(1)
    );

    // Connects the calculated state stream back to our main BehaviorSubject.
    state$.subscribe(this._state$);
  }

  /**
   * Registers reducers in the store.
   * @param {...{path: string, initialState: any, reducerFn: function(any, Action): any}} reducers
   */
  registerReducers(...reducers) {
    this._reducers.push(...reducers);

    // Get the current state and prepare a shallow copy.
    const currentState = this._state$.getValue();
    const nextState = { ...currentState };
    let hasChanged = false;

    reducers.forEach(({ path: featureKey, initialState }) => {
      // If the state slice has not been defined yet, apply the reducer's initial state.
      if (nextState[featureKey] === undefined) {
        nextState[featureKey] = initialState;
        hasChanged = true;
      }
    });

    // Only emit a new state if a new feature slice was actually added.
    if (hasChanged) {
      this._state$.next(nextState);
    }
  }

  /**
   * Sets the execution context for the store.
   * This is used by plugins to make the store context-aware.
   * @param {object} context - The component instance (e.g., BaseApp, BasePage).
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * Registers effects in the store.
   * @param {...function(import('rxjs').Observable<Action>): import('rxjs').Observable<Action>} effects
   */
  registerEffects(...effects) {
    effects.forEach((effectFn) => {
      // Check for the metadata attached by createEffect
      const config = effectFn._rxEffect || { dispatch: true };
      let effect$ = effectFn(this._actions$);

      if (config.dispatch) {
        // If a context is set, automatically inject it into actions emitted by the effect.
	    effect$.pipe(
		  map(action => {
		    // If a context is set and the action doesn't already have a context, add it.
		    return this._context && !action.context ? {...action, context: this._context} : action;
		  })
	    ).subscribe(action => this.dispatch(action));
      } else {
        // If dispatch is false, just subscribe to trigger the side-effect.
        // The output is ignored.
        effect$.subscribe();
      }
    });
  }

  /**
   * Dispatches an action to the store, initiating the state update cycle.
   * @param {Action} action
   */
  dispatch(action) {
    this._actions$.next(action);
  }

  /**
   * Selects a slice of the state and returns it as an Observable.
   * @param {function(object): any} selectorFn - The selector function.
   * @returns {import('rxjs').Observable<any>}
   */
  select(selectorFn) {
    return this._state$.pipe(
      map(state => selectorFn(state)),
      // Emits only when the selected value has actually changed.
      distinctUntilChanged()
    );
  }
}
