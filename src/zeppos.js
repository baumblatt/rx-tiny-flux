/**
 * @file zeppos.js
 * @description A smart plugin factory for integrating rx-tiny-flux with ZeppOS (via ZML).
 * It provides a `storePlugin` for lifecycle-aware subscriptions and context injection,
 * and custom RxJS operators (`isApp`, `isSideService`) to distinguish between
 * execution environments (App/Page vs. Side Service).
 */

import { withLatestFromStore, isSideService, isApp } from './zeppos-operators';

/**
 * Factory function that creates the store plugin for ZML's BaseApp/BasePage.
 * @param {object} instance - The App or Page instance (injected by ZML's plugin service).
 * @param {object} store - The store instance from `rx-tiny-flux` passed via `.use(plugin, store)`.
 * @returns {object} A mixin object with methods and lifecycle hooks to be merged.
 */
function storePlugin(instance, store) {
  if (!store) {
    console.error('[rx-tiny-flux] StorePlugin Error: Store instance was not provided on .use()');
    return {};
  }

  return {
    /**
     * A proxy to the store's dispatch method. It injects the component's `this`
     * context into the action, allowing effects to access other plugins.
     * @param {object} action - The action to be dispatched to the store.
     */
    dispatch(action) {
      // 'this' refers to the App/Page instance.
      // We augment the action with the instance context, making it available to effects.
      // This allows effects to use other plugins like logger, toast, etc.
      const actionWithContext = { ...action, context: this };
      store.dispatch(actionWithContext);
    },

    /**
     * Subscribes to a selector and automatically manages the subscription's lifecycle.
     * @param {Function} selector - A function that selects a slice of the state.
     * @param {Function} callback - The function to execute when the selected state changes.
     * @returns {object} The subscription object, allowing for manual unsubscription if needed.
     */
    subscribe(selector, callback) {
      // 'this' refers to the App/Page instance.
      // Initialize an internal array to hold subscriptions if it doesn't exist.
      if (!this._subscriptions) {
        this._subscriptions = [];
      }

      const subscription = store.select(selector).subscribe(callback);
      this._subscriptions.push(subscription);

      // Return the subscription object in case the developer needs to unsubscribe manually.
      return subscription;
    },
    /**
     * Lifecycle hook that will be merged and called during the instance's destruction.
     * This is the core of the automatic memory management feature.
     */
    onDestroy() {
      // 'this' refers to the App/Page instance.
      if (this._subscriptions && this._subscriptions.length > 0) {
        // console.log(`[rx-tiny-flux] Unsubscribing from ${this._subscriptions.length} subscriptions.`);
        this._subscriptions.forEach((sub) => sub.unsubscribe());
        this._subscriptions = []; // Clear the array.
      }
    },
  };
}

export { storePlugin, isSideService, isApp, withLatestFromStore };
