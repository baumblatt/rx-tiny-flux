import {
  Store,
  createAction,
  createReducer,
  createEffect,
  on,
  anyAction,
  createFeatureSelector,
  createSelector,
  ofType,
  concatMap,
  from,
  map,
} from '../dist/rx-tiny-flux.esm.js'; // Pointing to the built file for a realistic test

// 1. ESTADO INICIAL
// The Store can start with an empty state.
const initialState = {};

// 2. AÇÕES
// We create "messages" that describe events in the application.
const increment = createAction('[Counter] Increment');
const decrement = createAction('[Counter] Decrement');
const incrementAsync = createAction('[Counter] Increment Async');
const incrementSuccess = createAction('[Counter] Increment Success');

// 3. REDUTORES
// Pure functions that calculate the new state based on the previous state and an action.

// This reducer manages the 'counter' slice of the state.
const counterReducer = createReducer(
  'counter',
  { value: 0, lastUpdate: null }, // 1. Initial state for this slice.
  on(increment, incrementSuccess, (state) => ({
    ...state,
    value: state.value + 1,
    lastUpdate: new Date().toISOString(),
  })),
  on(decrement, (state) => ({
    ...state,
    value: state.value - 1,
    lastUpdate: new Date().toISOString(),
  }))
);

// This reducer manages the 'log' slice. It reacts to ANY action.
const logReducer = createReducer(
  'log',
  [], // Initial state for this slice
  // Using the `anyAction` token to create a handler that catches all actions.
  on(anyAction, (state, action) => [...state, `Action: ${action.type} at ${new Date().toISOString()}`])
);

// 4. EFEITOS
// Handle side effects, such as asynchronous calls.

// Let's create a function that simulates an API call returning a Promise.
const fakeApiCall = () => {
  console.log('-> [Effect] Starting fake API call...');
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('<- [Effect] Fake API call finished.');
      resolve({ success: true }); // The API returns a success object
    }, 1000);
  });
};

const incrementAsyncEffect = createEffect((actions$) =>
  actions$.pipe(
    ofType(incrementAsync), // Listens only for the 'incrementAsync' action
    // Use concatMap to handle the async operation. It waits for the inner Observable to complete.
    concatMap(() => from(fakeApiCall()).pipe( // `from` converts the Promise into an Observable
      map(() => incrementSuccess()) // On success, map the result to a new action
    ))
  )
);

// 5. SELETORES
// Functions to extract specific pieces of state.

// 5.1. We use `createFeatureSelector` to get a top-level slice of the state.
const selectCounterSlice = createFeatureSelector('counter');

// 5.2. We use `createSelector` to compose and extract more granular data from the slice.
const selectCounterValue = createSelector(
  selectCounterSlice,
  (counter) => counter?.value // Added 'optional chaining' for safety
);

const selectLastUpdate = createSelector(
  selectCounterSlice,
  (counter) => counter?.lastUpdate
);

// 6. STORE SETUP
const store = new Store(initialState);
store.registerReducers(counterReducer, logReducer);
store.registerEffects(incrementAsyncEffect);

// 7. USING THE STORE
// We subscribe to the selector to observe changes in the counter's value.
// It's crucial to capture the subscription object so we can unsubscribe later.
const counterSubscription = store.select(selectCounterValue).subscribe((value) => {
  console.log(`Counter value is now: ${value}`);
});

// Let's also subscribe to the log to see all actions
const logSubscription = store.select((state) => state.log).subscribe((log) => {
  console.log('--- Action Log ---');
  console.log(log.join('\n'));
});

// 8. DISPATCHING ACTIONS
console.log('Dispatching actions...');
store.dispatch(increment());
store.dispatch(increment());
store.dispatch(incrementAsync()); // Will trigger the effect and update the counter after 1s.

// 9. CLEANUP (Unsubscribing)
// In a real application (like a component in a UI framework or a long-running service),
// you must unsubscribe from subscriptions to prevent memory leaks when they are no longer needed.
// In this simple script, the process would exit anyway, but we demonstrate the practice here
// by unsubscribing after a few seconds.
setTimeout(() => {
  console.log('\n--- Cleaning up subscriptions ---');
  counterSubscription.unsubscribe();
  logSubscription.unsubscribe();
  console.log('Subscriptions cleaned up. Further state changes will not be logged to the console.');

  // This action will still be processed by the store, but our subscriptions won't react to it.
  store.dispatch(increment());
}, 2000);
