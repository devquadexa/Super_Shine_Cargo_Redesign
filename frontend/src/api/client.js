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
export const isAuthActionEndpoint = (url, headers = {}, extraConfig = {}) => {
  const u = String(url || '').toLowerCase();
  const skip = headers?.['x-skip-mutation'] || headers?.['X-Skip-Mutation'] || extraConfig?.skipMutation;
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
  const explicitLoading = headers?.['x-action-loading-message'] || headers?.['X-Action-Loading-Message'] || extraConfig?.loadingMessage;
  const explicitSuccess = headers?.['x-action-success-message'] || headers?.['X-Action-Success-Message'] || extraConfig?.successMessage;
  const explicitType = headers?.['x-action-type'] || headers?.['X-Action-Type'] || extraConfig?.actionType;

  if (explicitLoading || explicitSuccess) {
    return {
      actionType: explicitType || 'custom',
      loadingText: explicitLoading || 'Processing...',
      successText: explicitSuccess || 'Completed successfully',
    };
  }

  if (explicitType === 'request') {
    return {
      actionType: 'request',
      loadingText: 'Sending request...',
      successText: 'Request sent successfully',
    };
  }

  // 2. DELETE
  if (m === 'delete') {
    return {
      actionType: 'delete',
      loadingText: 'Deleting...',
      successText: 'Deleted successfully',
    };
  }

  // 3. Approvals / Rejections / Completions
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

  // Parse data if available
  let parsedData = null;
  if (data) {
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        // Not JSON string
      }
    } else if (typeof data === 'object') {
      parsedData = data;
    }
  }

  // 4. Requests (Cash balance settlements, overdue collections, balance returns, reset requests, advance requests, etc.)
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

  // 5. Default CRUD save / create / update
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
    loadingText: currentMutation?.loadingText || 'Saving changes...',
    successText: currentMutation?.successText || 'Saved successfully',
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
