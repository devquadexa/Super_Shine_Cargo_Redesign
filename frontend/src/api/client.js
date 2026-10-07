import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let activeRequests = 0;
const activeMutationMap = new Map();
let mutationSeq = 0;
let lastFinishedMutation = null;
const loadingListeners = new Set();

/**
 * Check if the request is an authentication/login action that should
 * suppress floating mutation toasts/messages.
 */
/**
 * Extract header value case-insensitively from plain object, Headers, or AxiosHeaders.
 */
const getHeaderValue = (headers, key) => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get(key) || headers.get(key.toLowerCase());
  }
  const target = key.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === target) return headers[k];
  }
  return undefined;
};

/**
 * Check if the request is an authentication/login action that should
 * suppress floating mutation toasts/messages.
 */
export const isAuthActionEndpoint = (url, headers = {}, extraConfig = {}) => {
  const u = String(url || '').toLowerCase();
  const skip = getHeaderValue(headers, 'x-skip-mutation') || extraConfig?.skipMutation;
  if (skip) return true;
  return (
    u.includes('/auth/login') ||
    u.endsWith('/login') ||
    u.includes('/auth/logout') ||
    u.endsWith('/logout')
  );
};

/**
 * Detect the action type and suitable loading / success messages
 * based on HTTP method, URL endpoint, headers, and request payload.
 */
export const parseActionInfo = (url, method, data, headers = {}, extraConfig = {}) => {
  const m = String(method || '').toLowerCase();
  const normalizedUrl = String(url || '').toLowerCase();

  // 1. Explicit overrides via headers or config
  const explicitLoading = getHeaderValue(headers, 'x-action-loading-message') || extraConfig?.loadingMessage;
  const explicitSuccess = getHeaderValue(headers, 'x-action-success-message') || extraConfig?.successMessage;
  const explicitType = getHeaderValue(headers, 'x-action-type') || extraConfig?.actionType;

  if (explicitLoading || explicitSuccess) {
    return {
      actionType: explicitType || 'save',
      loadingText: explicitLoading || 'Updating changes...',
      successText: explicitSuccess || 'Updated successfully',
    };
  }

  if (explicitType === 'request') {
    return {
      actionType: 'request',
      loadingText: 'Sending request...',
      successText: 'Request sent successfully',
    };
  }

  // 2. Approvals / Rejections / Completions
  if (normalizedUrl.includes('/approve')) {
    return {
      actionType: 'approve',
      loadingText: 'Approving request...',
      successText: 'Request approved successfully',
    };
  }
  if (normalizedUrl.includes('/reject')) {
    return {
      actionType: 'reject',
      loadingText: 'Rejecting request...',
      successText: 'Request rejected successfully',
    };
  }
  if (normalizedUrl.includes('/complete')) {
    return {
      actionType: 'complete',
      loadingText: 'Completing settlement...',
      successText: 'Settlement completed successfully',
    };
  }

  // 3. Domain-specific data changes:
  // Pay items
  if (normalizedUrl.includes('pay-item') || normalizedUrl.includes('payitem')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting pay item...', successText: 'Pay item deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Adding pay item...', successText: 'Pay item added successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating pay items...', successText: 'Pay items updated successfully' };
  }

  // Payments / settlements
  if (normalizedUrl.includes('/pay') || normalizedUrl.includes('payment')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting payment...', successText: 'Payment deleted successfully' };
    }
    return { actionType: 'save', loadingText: 'Recording payment...', successText: 'Payment recorded successfully' };
  }

  // Invoices & Billing
  if (normalizedUrl.includes('/billing') || normalizedUrl.includes('/invoice') || normalizedUrl.includes('/old-invoice')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting invoice...', successText: 'Invoice deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Saving invoice...', successText: 'Invoice saved successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating invoice...', successText: 'Invoice updated successfully' };
  }

  // Jobs
  if (normalizedUrl.includes('/jobs') || normalizedUrl.includes('/job')) {
    if (normalizedUrl.includes('/status')) {
      return { actionType: 'save', loadingText: 'Updating job status...', successText: 'Status updated successfully' };
    }
    if (normalizedUrl.includes('/assign')) {
      return { actionType: 'save', loadingText: 'Assigning job...', successText: 'Job assigned successfully' };
    }
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting job...', successText: 'Job deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Creating job...', successText: 'Job created successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating job...', successText: 'Job updated successfully' };
  }

  // Customers
  if (normalizedUrl.includes('/customers') || normalizedUrl.includes('/customer')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting customer...', successText: 'Customer deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Saving customer...', successText: 'Customer saved successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating customer...', successText: 'Customer updated successfully' };
  }

  // Transporters
  if (normalizedUrl.includes('/transporter')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting transporter...', successText: 'Transporter deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Saving transporter...', successText: 'Transporter saved successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating transporter...', successText: 'Transporter updated successfully' };
  }

  // Petty Cash
  if (normalizedUrl.includes('petty-cash')) {
    if (m === 'delete') {
      return { actionType: 'delete', loadingText: 'Deleting petty cash item...', successText: 'Petty cash item deleted successfully' };
    }
    if (m === 'post') {
      return { actionType: 'save', loadingText: 'Saving petty cash...', successText: 'Petty cash saved successfully' };
    }
    return { actionType: 'save', loadingText: 'Updating petty cash...', successText: 'Petty cash updated successfully' };
  }

  // Parse data if available for request detection
  let parsedData = null;
  if (data) {
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {}
    } else if (typeof data === 'object') {
      parsedData = data;
    }
  }

  // 4. Requests (Cash balance settlements, overdue collections, balance returns, reset requests, etc.)
  const isRequestUrl =
    normalizedUrl.includes('cash-balance-settlement') ||
    normalizedUrl.includes('request') ||
    normalizedUrl.includes('/settle') ||
    normalizedUrl.includes('email') ||
    normalizedUrl.includes('notify');

  const isRequestData = Boolean(
    parsedData && (
      parsedData.settlementType === 'OVERDUE_COLLECTION' ||
      parsedData.settlementType === 'BALANCE_RETURN' ||
      parsedData.settlementType ||
      parsedData.requestType ||
      parsedData.isRequest ||
      parsedData.requestId
    )
  );

  if (isRequestUrl || isRequestData) {
    return {
      actionType: 'request',
      loadingText: 'Sending request...',
      successText: 'Request sent successfully',
    };
  }

  // 5. General Fallbacks by HTTP method
  if (m === 'delete') {
    return {
      actionType: 'delete',
      loadingText: 'Deleting...',
      successText: 'Deleted successfully',
    };
  }

  if (m === 'put' || m === 'patch') {
    return {
      actionType: 'save',
      loadingText: 'Updating changes...',
      successText: 'Changes updated successfully',
    };
  }

  return {
    actionType: 'save',
    loadingText: 'Saving changes...',
    successText: 'Saved successfully',
  };
};

const getCurrentState = () => {
  const isMutating = activeMutationMap.size > 0;
  let currentMutation = null;
  if (isMutating) {
    const list = Array.from(activeMutationMap.values());
    currentMutation = list[list.length - 1];
  } else {
    currentMutation = lastFinishedMutation;
  }

  return {
    isLoading: activeRequests > 0,
    isMutating: isMutating,
    count: activeRequests,
    actionType: currentMutation?.actionType || 'save',
    loadingText: currentMutation?.loadingText || 'Updating changes...',
    successText: currentMutation?.successText || 'Updated successfully',
  };
};

export const subscribeToLoading = (callback) => {
  loadingListeners.add(callback);
  callback(getCurrentState());
  return () => loadingListeners.delete(callback);
};

const notify = () => {
  const state = getCurrentState();
  loadingListeners.forEach((cb) => {
    try { cb(state); } catch (e) {}
  });
};

// Request interceptor to add auth token and increment loading
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    activeRequests++;
    const method = (config.method || 'get').toLowerCase();
    const isMutation = ['post', 'put', 'delete', 'patch'].includes(method) && !isAuthActionEndpoint(config.url, config.headers, config);
    if (isMutation) {
      const mutId = ++mutationSeq;
      config.__mutId = mutId;
      const actionInfo = parseActionInfo(config.url, method, config.data, config.headers, config);
      activeMutationMap.set(mutId, actionInfo);

      // Auto-cleanup failsafe after 8 seconds so indicator never gets stuck
      setTimeout(() => {
        if (activeMutationMap.has(mutId)) {
          activeMutationMap.delete(mutId);
          notify();
        }
      }, 8000);
    }
    notify();
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notify();
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and decrementing loading
apiClient.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    const mutId = response.config?.__mutId;
    if (mutId && activeMutationMap.has(mutId)) {
      lastFinishedMutation = activeMutationMap.get(mutId);
      activeMutationMap.delete(mutId);
    }
    notify();
    return response;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    const mutId = error.config?.__mutId;
    if (mutId && activeMutationMap.has(mutId)) {
      activeMutationMap.delete(mutId);
      lastFinishedMutation = null;
    }
    notify();
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Also intercept global window.fetch so legacy fetch() calls trigger the global loading indicator
if (typeof window !== 'undefined' && window.fetch && !window.__fetchIntercepted) {
  window.__fetchIntercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    activeRequests++;
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    const options = args[1] || {};
    const method = (options.method || (typeof args[0] === 'object' ? args[0]?.method : 'GET') || 'GET').toLowerCase();

    let mutId = null;
    const isMutation = ['post', 'put', 'delete', 'patch'].includes(method) && !isAuthActionEndpoint(url, options.headers, options);
    if (isMutation) {
      mutId = ++mutationSeq;
      const actionInfo = parseActionInfo(url, method, options.body, options.headers, options);
      activeMutationMap.set(mutId, actionInfo);

      // Auto-cleanup failsafe after 8 seconds
      setTimeout(() => {
        if (mutId && activeMutationMap.has(mutId)) {
          activeMutationMap.delete(mutId);
          notify();
        }
      }, 8000);
    }
    notify();

    try {
      const response = await originalFetch(...args);
      if (mutId && activeMutationMap.has(mutId)) {
        if (response.ok) {
          lastFinishedMutation = activeMutationMap.get(mutId);
        } else {
          lastFinishedMutation = null;
        }
        activeMutationMap.delete(mutId);
      }
      return response;
    } catch (err) {
      if (mutId && activeMutationMap.has(mutId)) {
        activeMutationMap.delete(mutId);
        lastFinishedMutation = null;
      }
      throw err;
    } finally {
      activeRequests = Math.max(0, activeRequests - 1);
      notify();
    }
  };
}

export default apiClient;
