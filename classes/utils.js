/**
 * Returns true if value is not null or undefined.
 *
 * @param {any} value
 * @returns {value is object | string | number}
 */
function isDefined(value) {
  return value !== null && value !== undefined;
}

/**
 * Throws error if value is null or undefined.
 *
 * @param {any} value
 * @param {string | (() => string)} message
 * @returns {asserts value is object | string | number}
 */
function assert(value, message = "Assertion failed") {
  if (!isDefined(value)) {
    throw new Error(typeof message === "function" ? message() : message);
  }
}

/**
 * Throws error if value is falsy.
 *
 * @param {any} value
 * @param {string | (() => string)} message
 */
function assertTruthy(value, message = "Assertion failed") {
  if (!value) {
    throw new Error(typeof message === "function" ? message() : message);
  }
}

/**
 * Throws error if value is null or undefined. Otherwise returns value.
 *
 * @param {T} value
 * @param {string | (() => string)} message
 * @returns {NonNullable<T>}
 * @template T
 */
function assertAndReturn(value, message = "Assertion failed") {
  assert(value, message);
  return value;
}

/**
 * Waits given time asynchronously.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
async function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  isDefined,
  assert,
  assertTruthy,
  assertAndReturn,
  delay,
};
