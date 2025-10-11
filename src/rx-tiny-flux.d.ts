import type { OperatorFunction, Subscription, Observable } from 'rxjs';

export * from 'rxjs';

/**
 * Represents a Flux Standard Action.
 */
export interface Action<T = any> {
  type: string;
  payload?: T;
  context?: any;
}

/**
 * Describes a ZeppOS Page enhanced by the `storePlugin`.
 */
export interface StorePage {
  /**
   * Dispatches an action to the store.
   */
  dispatch(action: Action): void;

  /**
   * Subscribes to a slice of the store's state. The subscription is auto-managed.
   */
  subscribe<T, A = T, B = A, C = B, D = C, E = D, F = E>(
    selector: (state: object) => T,
    op1?: OperatorFunction<T, A>,
    op2?: OperatorFunction<A, B>,
    op3?: OperatorFunction<B, C>,
    op4?: OperatorFunction<C, D>,
    op5?: OperatorFunction<D, E>,
    op6?: OperatorFunction<E, F>,
    callback: (value: F) => void
  ): Subscription;

  /**
   * Subscribes to specific store actions to trigger side-effects.
   */
  listen(
    actionTypes: (string | { type: string }) | Array<string | { type: string }>,
    callback: (action: Action) => void
  ): void;

  /**
   * Handler for actions received via the messaging system.
   */
  onAction(action: Action): void;
}

/**
 * The central state container.
 */
export class Store {
  constructor(initialState?: object);
  get actions$(): Observable<Action>;
  registerReducers(...reducers: any[]): void;
  setContext(context: object): void;
  registerEffects(...effects: ((actions: Observable<Action>) => Observable<Action>)[]): void;
  dispatch(action: Action): void;
  select<T>(selectorFn: (state: object) => T): Observable<T>;
}

/**
 * Factory function to create an action creator.
 */
export function createAction(type: string): ((payload?: any) => Action) & { type: string };

/**
 * A token to be used with `on` to catch any action.
 */
export function anyAction(): void;

/**
 * Associates action creators with a reducer function.
 */
export function on(...args: (Function | ((state: any, action: Action) => any))[]): { types: string[], reducerFn: Function };

/**
 * Factory function to create a reducer.
 */
export function createReducer(featureKey: string, initialState: any, ...ons: any[]): { path: string, initialState: any, reducerFn: Function };

/**
 * Factory function to create an effect.
 */
export function createEffect(effectFn: (actions: Observable<Action>) => Observable<Action>, config?: { dispatch?: boolean }): Function;

/**
 * Custom RxJS operator to filter actions by type.
 */
export function ofType(...actionCreators: Function[]): OperatorFunction<Action, Action>;

/**
 * Creates a selector for a top-level state slice.
 */
export function createFeatureSelector<T>(featureKey: string, projectionFn?: (featureState: any) => T): (state: object) => T;

/**
 * Creates a memoized selector that composes other selectors.
 */
export function createSelector(...args: Function[]): (state: object) => any;

/**
 * The store plugin for ZeppOS App/Page/Service.
 */
export function storePlugin(instance: object, store?: Store): object;

/**
 * RxJS operator to combine an action with the latest value from the store.
 */
export function withLatestFromStore<T>(selector: (state: object) => T): OperatorFunction<Action, [Action, T]>;

/**
 * RxJS operator that filters for the Side Service environment.
 */
export const isSideService: () => OperatorFunction<any, any>;

/**
 * RxJS operator that filters for the App/Page environment.
 */
export const isApp: () => OperatorFunction<any, any>;

/**
 * RxJS operator to propagate an action to another ZeppOS context.
 */
export const propagateAction: () => OperatorFunction<Action, Action>;