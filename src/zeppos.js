/**
 * @file zeppos.js
 * @description The main entry point for ZeppOS (ZML) integration.
 * It exports the `storePlugin` and a curated set of custom and standard RxJS
 * operators needed for development in the ZeppOS environment.
 */

import { filter } from 'rxjs/operators';
/**
 * Factory function that creates the store plugin for ZML's BaseApp/BasePage.
 * This plugin function is called by the ZML `.use()` method and adapts its behavior
 * based on whether it's initializing an App, a Page, or a Side Service.
 *
 * For `BaseApp.use(storePlugin, store)`, it receives the store and attaches it.
 * For `BasePage.use(storePlugin)`, it finds the store on the global App object.
 *
 * @param {object} instance - The App or Page instance (injected by ZML).
 * @param {Store} [store] - The store instance, provided only when used with `BaseApp`.
 * @returns {object} A mixin object with methods and lifecycle hooks to be merged.
 */
function storePlugin(instance, store) {
  // This is the core logic: return a plugin object with different behaviors
  // for the App's `onCreate` and the Page/Service's `onInit`.
  return {
    // This hook is called for the App instance.
    onCreate() {
      if (!store) {
        console.error('[rx-tiny-flux] StorePlugin Error: A store instance must be provided to `BaseApp.use(storePlugin, store)`.');
        return;
      }

	  // add the App context to the store.
	  store.setContext(this);

	  this.debug('Attach the store and a dispatch method to the App instance.')
      this._store = store;
      this.dispatch = (action) => {
        const actionWithContext = { ...action, context: this };
        this._store.dispatch(actionWithContext);
      };

      this.onAction = (action) => {
        if (action && typeof action.type === 'string') {
		  this.debug(`Dispatching action ${action.type} from App.onAction.`);
          this.dispatch(action);
        } else {
		  this.debug(`Not an Action, discarding the message on App.onAction.`)
		}
      };
	  this.messaging.onCall(this.onAction);

      // Handle subscriptions at the App level.
      /**
       * Subscribes to a piece of the store's state, with optional RxJS operators.
       * Subscriptions are automatically cleaned up when the App is destroyed.
       *
       * @param {function(object): any} selector A function to select a part of the state.
       * @param {...import('rxjs').OperatorFunction<any, any>} operators Zero or more RxJS operators to pipe.
       * @param {function(any): void} callback The function to execute with the selected state.
       * @returns {import('rxjs').Subscription} The subscription object.
       */
      this.subscribe = (selector, ...args) => {
        if (!this._subscriptions) {
          this._subscriptions = [];
        }

        const callback = args.pop();
        const operators = args; // The rest of the arguments are operators

        const stream$ = this._store.select(selector);
        const piped$ = operators.length > 0 ? stream$.pipe(...operators) : stream$;
        const subscription = piped$.subscribe(callback);
        this._subscriptions.push(subscription);
        return subscription;
      };
    },

    // This hook is called for Page and Side Service instances.
    onInit() {
      let localStore;
      const isSideServiceContext = typeof messaging !== 'undefined';

      if (isSideServiceContext) {
        // Side Service behaves like the App: it needs its own store instance.
        if (!store) {
          console.error('[rx-tiny-flux] StorePlugin Error: A store instance must be provided to `BaseSideService.use(storePlugin, store)`.');
        } else {
          store.setContext(this);
          localStore = store;

          // For SideService, define an onAction that dispatches to its own store.
          this.onAction = (action) => {
            if (action && typeof action.type === 'string') {
              this.debug(`Dispatching action ${action.type} from SideService.onAction.`);
              this.dispatch(action);
            } else {
              this.debug(`Not an Action, discarding the message on SideService.onAction.`);
            }
          };
        }
      } else {
        // Page context: find the store on the global App object.
        const app = getApp();
        if (!app || !app._store) {
          console.error('[rx-tiny-flux] Store not found on global App object. Ensure the plugin is registered on BaseApp.');
        } else {
          localStore = app._store;
        }

        // For Pages, onAction is a no-op because the App's onAction handles it.
        // We still need to define it to register/unregister the listener correctly.
        this.onAction = () => {};
      }

      // If we couldn't find a store, set up fake methods and exit.
      if (!localStore) {
		this.onAction = () => console.error('[rx-tiny-flux] OnAction failed: store not initialized.');
		this.messaging.onCall(this.onAction);
        this.dispatch = () => console.error('[rx-tiny-flux] Dispatch failed: store not initialized.');
        this.subscribe = () => console.error('[rx-tiny-flux] Subscribe failed: store not initialized.');
        return;
      }

      // --- Store is valid, proceed with setup ---
      this._store = localStore;
      this.messaging.onCall(this.onAction);

      this.debug(`Attaching store methods to the ${isSideServiceContext ? 'SideService' : 'Page'} instance.`);
      this.dispatch = (action) => {
        const actionWithContext = { ...action, context: this };
        this._store.dispatch(actionWithContext);
      };

      /**
       * Subscribes to a piece of the store's state, with optional RxJS operators.
       * Subscriptions are automatically cleaned up when the Page/Service is destroyed.
       *
       * @param {function(object): any} selector A function to select a part of the state.
       * @param {...import('rxjs').OperatorFunction<any, any>} operators Zero or more RxJS operators to pipe.
       * @param {function(any): void} callback The function to execute with the selected state.
       * @returns {import('rxjs').Subscription} The subscription object.
       */
      this.subscribe = (selector, ...args) => {
        if (!this._subscriptions) {
          this._subscriptions = [];
        }

        const callback = args.pop();
        const operators = args; // The rest of the arguments are operators

        const stream$ = this._store.select(selector);
        const piped$ = operators.length > 0 ? stream$.pipe(...operators) : stream$;
        const subscription = piped$.subscribe(callback);
        this._subscriptions.push(subscription);
        return subscription;
      };

	  // For Pages, add a method to listen to specific store actions for side-effects.
	  if (!isSideServiceContext) {
		/**
		 * Subscribes to specific store actions to trigger side-effects like UI notifications.
		 * Subscriptions are automatically cleaned up when the Page is destroyed.
		 *
		 * @param {string|{type: string}|Array<string|{type: string}>} actionTypes The action type(s) to listen for.
		 * @param {function(import('./actions').Action): void} callback The function to execute when the action is dispatched.
		 */
		this.listen = (actionTypes, callback) => {
		  const types = (Array.isArray(actionTypes) ? actionTypes : [actionTypes])
			.map(t => (typeof t === 'function' ? t.type : t));

		  if (types.some(t => typeof t !== 'string')) {
			throw new Error('[rx-tiny-flux] listen: actionTypes must be strings or action creators with a `type` property.');
		  }

		  if (!this._subscriptions) {
		    this._subscriptions = [];
	      }

			const subscription = this._store.actions$.pipe(filter(action => types.includes(action.type))).subscribe(callback);
			this._subscriptions.push(subscription);
		};
	  }
    },

    /**
     * Lifecycle hook for destruction, used by both App and Pages.
     * This is the core of the automatic memory management feature.
     */
    onDestroy() {
	  // tear down the messaging listener
	  this.messaging.offOnCall(this.onAction);

      if (this._subscriptions && this._subscriptions.length > 0) {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
        this._subscriptions = [];
      }
    },
  };
}

export { storePlugin };
