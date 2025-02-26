/**
 * @file counterExample.js
 * @description Demonstrates an impure function that violates functional programming principles.
 */

// Global state
let globalCounter = 0;

/**
 * Increments a global variable. This is impure because:
 * - It depends on external state (globalCounter).
 * - It changes that external state, so the same call yields different results over time.
 * @param {number} step - how much to increment
 * @returns {number} the updated global counter
 */
function impureIncrement(step) {
  globalCounter += step;
  return globalCounter;
}

// Example usage
console.log("Initial globalCounter:", globalCounter); // 0
console.log("impureIncrement(5):", impureIncrement(5)); // 5
console.log("impureIncrement(5):", impureIncrement(5)); // 10
console.log("Final globalCounter:", globalCounter); // 10