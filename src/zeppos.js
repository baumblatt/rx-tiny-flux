/**
 * @file zeppos.js
 * @description The main entry point for ZeppOS (ZML) integration.
 * It exports the `storePlugin` and a curated set of custom and standard RxJS
 * operators needed for development in the ZeppOS environment.
 */

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

	  this.debug('Attach the store and a dispatch method to the App instance.')
      // Attach the store and a dispatch method to the App instance.
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
      this.subscribe = (selector, callback) => {
        if (!this._subscriptions) {
          this._subscriptions = [];
        }
        const subscription = this._store.select(selector).subscribe(callback);
        this._subscriptions.push(subscription);
        return subscription;
      };
    },

    // This hook is called for Page and Side Service instances.
    onInit() {
      // Check if we are in a Side Service context
      const isSideServiceContext = typeof messaging !== 'undefined';

      if (isSideServiceContext) {
        // Side Service behaves like the App: it needs its own store instance.
        if (!store) {
          console.error('[rx-tiny-flux] StorePlugin Error: A store instance must be provided to `BaseSideService.use(storePlugin, store)`.');
          return;
        }
        this._store = store;
      } else {
        // Page context: find the store on the global App object.
        const app = getApp();
        if (!app || !app._store) {
          console.error('[rx-tiny-flux] Store not found on global App object. Ensure the plugin is registered on BaseApp.');
          // Provide dummy methods to prevent crashes.
          this.dispatch = () => console.error('Dispatch failed: store not initialized.');
          this.subscribe = () => console.error('Subscribe failed: store not initialized.');
          return;
        }
        this._store = app._store;
      }

      // Attach dispatch, subscribe, and onCall methods.
	  this.debug(`Attach the store and a dispatch method to the ${isSideServiceContext ? 'SideService' : 'Page'} instance.`)
      this.dispatch = (action) => {
        const actionWithContext = { ...action, context: this };
        this._store.dispatch(actionWithContext);
      };

      this.subscribe = (selector, callback) => {
        if (!this._subscriptions) {
          this._subscriptions = [];
        }
        const subscription = this._store.select(selector).subscribe(callback);
        this._subscriptions.push(subscription);
        return subscription;
      };

	  this.onAction = (action) => {
		if (action && typeof action.type === 'string') {
		  this.debug(`Dispatching action ${action.type} (${isSideServiceContext ? 'SideService' : 'Page'}.onCall)`);
		  this.dispatch(action);
		} else {
		  this.debug(`Not an Action, discarding ${isSideServiceContext ? 'SideService' : 'Page'}.onCall message.`)
		}
	  };
	  this.messaging.onCall(this.onAction);

    },

    /**
     * Lifecycle hook for destruction, used by both App and Pages.
     * This is the core of the automatic memory management feature.
     */
    onDestroy() {
	  // tears down the messaging listener
	  this.messaging.offCall(this.onAction);

      if (this._subscriptions && this._subscriptions.length > 0) {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
        this._subscriptions = [];
      }
    },
  };
}

export { storePlugin };
