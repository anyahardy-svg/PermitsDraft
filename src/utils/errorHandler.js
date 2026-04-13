/**
 * Error Handling Utilities
 * Standardizes error handling across the app
 */

import { Alert } from 'react-native';

/**
 * Generic error handler for async operations
 * @param {Error} error - The error object
 * @param {string} operation - User-friendly operation name (e.g., 'create permit')
 * @param {boolean} showAlert - Whether to show alert to user
 * @returns {Object} - Standardized error object
 */
export const handleError = (error, operation = 'operation', showAlert = true) => {
  const errorMessage = error?.message || 'Unknown error occurred';
  const errorCode = error?.code || 'UNKNOWN_ERROR';

  // Log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ Error during ${operation}:`, {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack
    });
  }

  // Show user-friendly alert
  if (showAlert) {
    let userMessage = errorMessage;

    // Map technical errors to user-friendly messages
    if (errorCode === 'PGRST116' || errorMessage.includes('Duplicate')) {
      userMessage = 'This item already exists. Please try again with different information.';
    } else if (errorCode === 'PGRST100' || errorMessage.includes('not found')) {
      userMessage = 'The item you\'re looking for was not found. Please refresh and try again.';
    } else if (errorMessage.includes('network') || errorMessage.includes('Connection')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      userMessage = 'You don\'t have permission to perform this action.';
    }

    Alert.alert(
      `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
      userMessage,
      [{ text: 'OK' }]
    );
  }

  return {
    success: false,
    error: errorMessage,
    code: errorCode
  };
};

/**
 * Wrapper for async operations with consistent error handling
 * @param {Function} asyncFn - The async function to execute
 * @param {string} operation - User-friendly operation name
 * @param {boolean} showAlert - Whether to show alert on error
 * @returns {Promise<Object>} - Result object with success/error properties
 */
export const executeAsync = async (asyncFn, operation = 'operation', showAlert = true) => {
  try {
    const result = await asyncFn();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return handleError(error, operation, showAlert);
  }
};

/**
 * Safe version of Promise.all for multiple async operations
 * Returns partial results even if some operations fail
 * @param {Array<Promise>} promises - Array of promises
 * @param {string} operation - User-friendly operation name
 * @returns {Promise<Object>} - Object with succeeded/failed arrays
 */
export const safePromiseAll = async (promises, operation = 'batch operation') => {
  try {
    const results = await Promise.allSettled(promises);

    const succeeded = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        succeeded.push({
          index,
          data: result.value
        });
      } else {
        failed.push({
          index,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 ${operation}: ${succeeded.length} succeeded, ${failed.length} failed`);
    }

    return {
      success: failed.length === 0,
      succeeded,
      failed,
      total: results.length
    };
  } catch (error) {
    return handleError(error, operation, false);
  }
};

/**
 * Retry logic for failed operations
 * @param {Function} asyncFn - The async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @param {string} operation - User-friendly operation name
 * @returns {Promise<Object>} - Result object
 */
export const executeWithRetry = async (asyncFn, maxRetries = 3, delayMs = 1000, operation = 'operation') => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development' && attempt > 1) {
        console.log(`🔄 ${operation} - Attempt ${attempt}/${maxRetries}...`);
      }

      const result = await asyncFn();
      return {
        success: true,
        data: result,
        attempts: attempt
      };
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  // All retries failed
  return handleError(lastError, `${operation} (after ${maxRetries} attempts)`, true);
};
