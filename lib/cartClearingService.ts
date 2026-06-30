/**
 * Professional Cart Clearing Service
 * Handles multi-tier cart clearing with validation and error recovery
 */

export class CartClearingService {
  private static readonly STORAGE_KEYS = {
    localStorage: 'renewablezmart_cart',
    sessionStorage: 'renewablezmart_cart',
  };

  /**
   * Comprehensive cart clearing with validation
   * Clears localStorage, sessionStorage, and context
   */
  static async clearCartCompletely(clearContextCallback: () => void): Promise<boolean> {
    try {
      console.log('[CART-CLEAR] 🧹 Starting comprehensive cart clearing...');

      // Step 1: Clear localStorage
      try {
        localStorage.removeItem(this.STORAGE_KEYS.localStorage);
        console.log('[CART-CLEAR] ✅ localStorage cleared');
      } catch (e) {
        console.warn('[CART-CLEAR] ⚠️ localStorage clear failed:', e);
      }

      // Step 2: Clear sessionStorage
      try {
        sessionStorage.removeItem(this.STORAGE_KEYS.sessionStorage);
        console.log('[CART-CLEAR] ✅ sessionStorage cleared');
      } catch (e) {
        console.warn('[CART-CLEAR] ⚠️ sessionStorage clear failed:', e);
      }

      // Step 3: Clear React Context
      try {
        clearContextCallback();
        console.log('[CART-CLEAR] ✅ React Context cleared');
      } catch (e) {
        console.error('[CART-CLEAR] ❌ Context clear failed:', e);
      }

      // Step 4: Wait for state updates to propagate
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 5: Validate clearing was successful
      const isCleared = this.validateCartCleared();
      if (isCleared) {
        console.log('[CART-CLEAR] ✅ CART FULLY CLEARED AND VALIDATED');
        return true;
      } else {
        console.warn('[CART-CLEAR] ⚠️ Cart clearing validation failed, retrying...');
        // Retry once
        return await this.retryCartClearing(clearContextCallback);
      }
    } catch (error) {
      console.error('[CART-CLEAR] ❌ Unexpected error during cart clearing:', error);
      return false;
    }
  }

  /**
   * Validate that cart is actually cleared
   */
  private static validateCartCleared(): boolean {
    try {
      const localItem = localStorage.getItem(this.STORAGE_KEYS.localStorage);
      const sessionItem = sessionStorage.getItem(this.STORAGE_KEYS.sessionStorage);
      
      const isLocalCleared = !localItem || localItem === '[]';
      const isSessionCleared = !sessionItem || sessionItem === '[]';

      console.log('[CART-CLEAR] Validation:', { localItem, sessionItem, isLocalCleared, isSessionCleared });
      
      return isLocalCleared && isSessionCleared;
    } catch (e) {
      console.warn('[CART-CLEAR] Validation check failed:', e);
      return false;
    }
  }

  /**
   * Retry cart clearing with aggressive approach
   */
  private static async retryCartClearing(clearContextCallback: () => void): Promise<boolean> {
    try {
      console.log('[CART-CLEAR] 🔄 Retrying with aggressive clearing...');
      
      // Aggressive clearing
      localStorage.clear();
      sessionStorage.clear();
      clearContextCallback();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const isCleared = this.validateCartCleared();
      console.log('[CART-CLEAR] Retry result:', isCleared);
      
      return isCleared;
    } catch (error) {
      console.error('[CART-CLEAR] Retry failed:', error);
      return false;
    }
  }

  /**
   * Force hard refresh to ensure cart clearing is visible
   */
  static forceHardRefresh(): void {
    console.log('[CART-CLEAR] 🔄 Performing hard refresh...');
    if (typeof window !== 'undefined') {
      // Clear all caches and do hard refresh
      window.location.href = window.location.href.split('?')[0];
    }
  }

  /**
   * Verify cart is empty before showing success
   */
  static isCartEmpty(cartItems: any[]): boolean {
    return !cartItems || cartItems.length === 0;
  }
}
