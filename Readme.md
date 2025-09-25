# Rx-Tiny-Flux

`Rx-Tiny-Flux` is a lightweight, minimalist state management library for pure JavaScript projects, heavily inspired by the patterns of NgRx and Redux. It leverages the power of RxJS for reactive state management.

The primary dependencies are `rxjs` and `jsonpath`.

> **A Case Study on AI-Assisted Development:** This entire library was developed in just a few hours as a case study to explore the capabilities of **Gemini Code Assist**. It demonstrates how modern AI coding assistants can significantly accelerate the development process, from initial scaffolding to complex feature implementation and refinement.

## Core Concepts

The library is built around a few core concepts:

*   **Store:** A single, centralized object that holds the application's state.
*   **Actions:** Plain objects that describe events or "things that happened" in your application.
*   **Reducers:** Pure functions that determine how the state changes in response to actions.
*   **Effects:** Functions that handle side effects, such as API calls, which can dispatch new actions.
*   **Selectors:** Pure functions used to query and derive data from the state.

---

## Actions

Actions are the only source of information for the store. You dispatch them to trigger state changes. Use the `createAction` factory function to create them.

```javascript
import { createAction } from 'rx-tiny-flux';

// An action creator for an event without a payload
const increment = createAction('[Counter] Increment');

// An action creator for an event with a payload
const add = createAction('[Counter] Add');

// Dispatching the actions
store.dispatch(increment()); // { type: '[Counter] Increment' }
store.dispatch(add(10));     // { type: '[Counter] Add', payload: 10 }
```

---

## Reducers

Reducers specify how the application's state changes in response to actions. A reducer is a pure function that takes the previous state slice and an action, and returns the next state slice.

Use `createReducer` along with the `on` and `anyAction` helpers to define your reducer logic.

```javascript
// Library imports
import { createReducer, on, anyAction } from 'rx-tiny-flux';

// Your application's action imports
import { increment, decrement, incrementSuccess } from './actions';

// This reducer manages the 'counter' slice of the state.
const counterReducer = createReducer(
  // 1. The jsonpath to the state slice
  '$.counter',
  // 2. The initial state for this slice
  { value: 0, lastUpdate: null },
  // 3. Handlers for specific actions
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

// This reducer manages the 'log' slice and reacts to ANY action.
const logReducer = createReducer(
  '$.log',
  [], // Initial state for this slice
  // Using the `anyAction` token to create a handler that catches all actions.
  on(anyAction, (state, action) => [...state, `Action: ${action.type} at ${new Date().toISOString()}`])
);
```

---

## Effects

Effects are used to handle side effects, such as asynchronous operations (e.g., API calls). An effect listens for dispatched actions, performs some work, and can dispatch new actions as a result.

Use `createEffect` and the `ofType` operator to build effects.

```javascript
// Core library imports
import { createEffect, ofType } from 'rx-tiny-flux';
// RxJS operators are imported from the secondary entry point
import { from, map, concatMap } from 'rx-tiny-flux/rxjs';

// Your application's action imports
import { incrementAsync, incrementSuccess } from './actions';

// A function that simulates an API call (e.g., fetch) which returns a Promise
const fakeApiCall = () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));

const incrementAsyncEffect = createEffect((actions$) =>
  actions$.pipe(
    // Listens only for the 'incrementAsync' action
    ofType(incrementAsync),
    // Use concatMap to handle the async operation.
    // It waits for the inner Observable (from the Promise) to complete.
    concatMap(() =>
      from(fakeApiCall()).pipe( // `from` converts the Promise into an Observable
        map(() => incrementSuccess()) // On success, map the result to a new action
      )
    )
  )
);
```

---

## RxJS Operators for ZeppOS

For use in restricted environments like **ZeppOS**, where direct dependencies on `rxjs` are not allowed, `Rx-Tiny-Flux` re-exports a curated set of common RxJS operators and creation functions from its ZeppOS-specific entry point: `rx-tiny-flux/zeppos`. This allows you to build complex effects without needing to manage RxJS imports in your application code.

**Available Exports:**

*   **Creation Functions:** Used to create new Observables.
    *   `from`: Converts a Promise, an array, or an iterable into an Observable.
    *   `of`: Emits a variable number of arguments as a sequence and then completes.
    *   `defer`: Creates an Observable that, on subscription, calls an Observable factory to make a fresh Observable for each new Subscriber.

*   **Constants:**
    *   `EMPTY`: An Observable that emits no items to the Observer and immediately emits a complete notification. It's useful in effects to stop a stream without dispatching a new action.

*   **Higher-Order Mapping Operators:** Used to manage inner Observables, typically for handling asynchronous operations like API calls.
    *   `concatMap`: Maps to an inner Observable and processes them sequentially.
    *   `switchMap`: Maps to an inner Observable but cancels the previous inner subscription if a new outer value arrives.
    *   `mergeMap`: Maps to an inner Observable and processes them in parallel.
    *   `exhaustMap`: Maps to an inner Observable but ignores new outer values while the current inner Observable is still active.

*   **Utility Operators:** Used for transformation, filtering, and side effects.
    *   `map`: Applies a given project function to each value emitted by the source Observable.
    *   `filter`: Emits only those values from the source Observable that pass a predicate function.
    *   `tap`: Perform a side effect for every emission on the source Observable, but return an Observable that is identical to the source.
    *   `delay`: Delays the emission of items from the source Observable by a given timeout.
    *   `catchError`: Catches errors on the source Observable and returns a new Observable or throws an error.

*   **Utilities:**
    *   `pipe`: A utility function for composing operators in a readable, left-to-right sequence. While `Observable.pipe()` is the most common usage, having `pipe` available allows for creating reusable operator compositions.

```javascript
// Instead of managing `rxjs` imports, you can get everything from the `zeppos` entry point:
import { createEffect, ofType } from 'rx-tiny-flux';
import { map, from, isApp, propagateAction } from 'rx-tiny-flux/zeppos';

// ... your effect implementation
```

---

## Selectors

Selectors are pure functions used for obtaining slices of store state. The library provides two factory functions for this:

1.  `createFeatureSelector`: Selects a top-level slice of the state using a `jsonpath` expression.
2.  `createSelector`: Composes multiple selectors to compute derived data.

```javascript
import { createFeatureSelector, createSelector } from 'rx-tiny-flux';

// 1. We use `createFeatureSelector` with a jsonpath expression to get a top-level slice of the state.
const selectCounterSlice = createFeatureSelector('$.counter');

// 2. We use `createSelector` to compose and extract more granular data from the slice.
const selectCounterValue = createSelector(
  selectCounterSlice,
  (counter) => counter?.value // Added 'optional chaining' for safety
);

const selectLastUpdate = createSelector(
  selectCounterSlice,
  (counter) => counter?.lastUpdate
);

// Using the selector with the store
store.select(selectCounterValue).subscribe((value) => {
  console.log(`Counter value is now: ${value}`);
});
```

---

## Putting It All Together: The Store

The `Store` is the central piece that brings everything together. You instantiate it, register your reducers and effects, and then use it to dispatch actions and select state.

```javascript
// Library imports
import { Store } from 'rx-tiny-flux';

// Import all your application's reducers, effects, and actions
import { counterReducer, logReducer } from './path/to/your/reducers';
import { incrementAsyncEffect } from './path/to/your/effects';
import { increment, incrementAsync } from './path/to/your/actions';

// 1. The Store can start with an empty state.
const initialState = {};

// 2. Create a new Store instance
const store = new Store(initialState);

// 3. Register all reducers. The store will build its initial state from them.
store.registerReducers(counterReducer, logReducer);

// 4. Register all effects.
store.registerEffects(incrementAsyncEffect);

// 5. Dispatch actions to trigger state changes and side effects.
console.log('Dispatching actions...');
store.dispatch(increment());
store.dispatch(increment());
store.dispatch(incrementAsync()); // Will trigger the effect

// 6. Select and subscribe to state changes.
// It's crucial to capture the subscription object so we can unsubscribe later.
const counterSubscription = store.select(selectCounterValue).subscribe((value) => {
  console.log(`Counter value is now: ${value}`);
});

// 7. Clean Up (Unsubscribe)
// In any real application, you must unsubscribe to prevent memory leaks.
// When the subscription is no longer needed (e.g., a component is destroyed),
// call the .unsubscribe() method.
counterSubscription.unsubscribe();
```

### ZeppOS Integration (via ZML)

For developers using the `ZML` library on the ZeppOS platform, `rx-tiny-flux` offers an optional plugin that seamlessly integrates the store with the `BaseApp` and `BasePage` component lifecycle.

This plugin injects `dispatch` and `subscribe` methods into your component's instance. Most importantly, the `subscribe` method is lifecycle-aware: it automatically tracks all subscriptions and unsubscribes from them when the component's `onDestroy` hook is called, preventing common memory leaks.

#### How to Use

1.  **Create your store** instance in `app.js`.
2.  **Import the `storePlugin`** from `rx-tiny-flux/zeppos`.
3.  **Register the plugin on `BaseApp`**, passing the `store` instance: `BaseApp.use(storePlugin, store)`.
4.  **Register the same plugin on `BasePage`**, but without the store: `BasePage.use(storePlugin)`. The plugin will automatically find the store from the App.
5.  **Use `this.dispatch()` and `this.subscribe()`** inside your App and Pages.

Here is a complete example:

```javascript
// app.js - Your application's entry point
import { BaseApp } from '@zeppos/zml';
import { Store } from 'rx-tiny-flux';
import { storePlugin } from 'rx-tiny-flux/zeppos';

// 1. Import your reducers, actions, etc.
import { counterReducer } from './path/to/reducers';

// 2. Create your store instance
const store = new Store({});
store.registerReducers(counterReducer);

// 3. Register the plugin on BaseApp, providing the store.
BaseApp.use(storePlugin, store);

App(BaseApp({
  // ... your App config
}));
```

```javascript
// page/index.js - An example page
import { BasePage, ui } from '@zeppos/zml';
import { selectCounterValue } from '../path/to/selectors';
import { increment } from './path/to/actions';

// 4. Register the plugin on BasePage, without providing the store, it will be retriave on the App.
BasePage.use(storePlugin);

Page(BasePage({
  build() {
    const myText = ui.createWidget(ui.widget.TEXT, { /* ... */ });

    // 5. Use `this.subscribe` to listen to state changes
    this.subscribe(selectCounterValue, (value) => {
      myText.setProperty(ui.prop.TEXT, `Counter: ${value}`);
    });

    // Use `this.dispatch` to dispatch actions
    ui.createWidget(ui.widget.BUTTON, {
      // ...
      click_func: () => this.dispatch(increment()),
    });
  },

  onDestroy() {
    // No need to unsubscribe manually!
    // The storePlugin will do it for you automatically.
    console.log('Page destroyed, subscriptions cleaned up.');
  }
}));
```

#### Accessing Component Context in Effects

The `storePlugin` automatically injects the component instance (`this` from `BasePage` or `BaseApp` or `BaseSideService`) into every dispatched action under the `context` property. This powerful feature allows your effects to access other plugins or methods available on the component instance, such as a logger, a toast notification service, or the router.

This enables better separation of concerns, where effects can trigger UI-related side effects without being tightly coupled to specific UI components.

**Example: Showing a Toast Notification from an Effect**

Imagine you have a `toast` plugin registered on your `BasePage`. You can create an effect that listens for a success action and uses the injected context to show a notification.

```javascript
// effects/toast.effect.js
import { createEffect, ofType } from 'rx-tiny-flux';
import { tap } from 'rx-tiny-flux/rxjs';
import { operationSuccess } from '../actions';

export const showSuccessToastEffect = createEffect(
  (actions$) =>
    actions$.pipe(
      ofType(operationSuccess),
      // The action now contains the 'context' of the Page that dispatched it
      tap((action) => {
        // Check if the context and the toast plugin exist before using it
        if (action.context && action.context.toast) {
          action.context.toast.show({ text: 'Operation successful!' });
        }
      })
    ),
  // This effect does not dispatch a new action, so we set dispatch: false
  { dispatch: false }
);
```

#### Environment-Specific Effects with `isApp` and `isSideService`

When building complex ZeppOS applications, you often need effects that run exclusively on the watch face (App/Page) or in the background service (Side Service). To simplify this, `rx-tiny-flux` provides two custom RxJS operators: `isApp` and `isSideService`.

These operators filter the action stream based on the execution environment, making your effects cleaner and more declarative.

*   `isApp()`: Allows actions to pass through only when running on the App/Page.
*   `isSideService()`: Allows actions to pass through only when running in the Side Service.

**Example: Handling a request between App and Side Service**

```javascript
// Import the operators from the zeppos entry point
import { createEffect, ofType } from 'rx-tiny-flux';
import { isApp, isSideService } from 'rx-tiny-flux/zeppos';
import { fetchData, fetchDataSuccess, fetchDataError } from './actions';

// This effect runs on the App side and requests data from the service
const requestDataEffect = createEffect(actions$ => actions$.pipe(
  ofType(fetchData),
  isApp(),
  // ... logic to send a message to the side service
));

// This effect runs on the Side Service, handles the request, and calls a backend
const handleDataRequestEffect = createEffect(actions$ => actions$.pipe(
  ofType(fetchData),
  isSideService(),
  // ... logic to call a backend API and return the result to the app
));
```

#### Accessing State within Effects using `withLatestFromStore`

A common requirement for effects is to access the current state to make decisions. For example, an effect might need the current user's ID to fetch data. The `withLatestFromStore` operator is designed for this purpose, especially in ZeppOS where the `store` instance isn't readily available when defining effects.

It works by safely using the `subscribe` method injected into the action's context by the `storePlugin`.

**Example: Fetching data using a value from the state**

```javascript
import { createEffect, ofType } from 'rx-tiny-flux';
// Import the new operator from the zeppos entry point
import { withLatestFromStore } from 'rx-tiny-flux/zeppos';
import { switchMap, map, catchError } from 'rx-tiny-flux/rxjs';
import { fetchData, fetchDataSuccess, fetchDataError } from './actions';
import { selectCurrentUserId } from './selectors';

const fetchDataEffect = createEffect(actions$ => actions$.pipe(
  ofType(fetchData),
  // Combines the action with the latest value from the store using the selector
  withLatestFromStore(selectCurrentUserId),
  // The next operator receives an array: [action, userId]
  switchMap(([action, userId]) =>
    from(api.fetchDataForUser(userId)).pipe(
      map(data => fetchDataSuccess(data)),
      catchError(error => of(fetchDataError(error)))
    ))
));
```
```
