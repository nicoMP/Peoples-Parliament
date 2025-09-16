/**
 * A utility function to introduce a delay.
 * @param {number} ms The delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}