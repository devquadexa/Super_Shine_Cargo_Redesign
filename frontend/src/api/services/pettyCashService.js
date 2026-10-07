import apiClient from '../client';

export const pettyCashService = {
  getAll: async () => {
    const response = await apiClient.get('/petty-cash');
    return response.data;
  },

  create: async (pettyCashData) => {
    const response = await apiClient.post('/petty-cash', pettyCashData);
    return response.data;
  },

  getBalance: async () => {
    const response = await apiClient.get('/petty-cash/balance');
    return response.data;
  },

  // Grouped petty cash assignments (admin/manager) — includes assigned,
  // settled, balance and over amounts used for cash-tracking summaries.
  getGroupedAssignments: async () => {
    const response = await apiClient.get('/petty-cash-assignments/grouped');
    return response.data;
  },

  updateBalance: async (balanceData) => {
    const response = await apiClient.post('/petty-cash/balance', balanceData);
    return response.data;
  },

  getUserAssignedBalance: async () => {
    const response = await apiClient.get('/petty-cash-assignments/my');
    const assignments = response.data;
    // Calculate total assigned petty cash for active assignments
    const total = assignments
      .filter(a => a.status === 'Assigned')
      .reduce((sum, a) => sum + parseFloat(a.assignedAmount || 0), 0);
    return { balance: total };
  },

  requestPettyCash: async (requestData) => {
    const response = await apiClient.post('/petty-cash-assignments/request', requestData);
    return response.data;
  },

  approvePettyCash: async (assignmentId, approvalData) => {
    const response = await apiClient.patch(`/petty-cash-assignments/${assignmentId}/approve`, approvalData);
    return response.data;
  },

  rejectPettyCash: async (assignmentId, rejectData) => {
    const response = await apiClient.patch(`/petty-cash-assignments/${assignmentId}/reject`, rejectData);
    return response.data;
  },

  reRequestPettyCash: async (assignmentId, reRequestData) => {
    const response = await apiClient.patch(`/petty-cash-assignments/${assignmentId}/re-request`, reRequestData);
    return response.data;
  },

  issuePettyCash: async (assignmentId, issueData) => {
    const response = await apiClient.patch(`/petty-cash-assignments/${assignmentId}/issue`, issueData);
    return response.data;
  },

  getMyThreshold: async () => {
    try {
      const response = await apiClient.get('/settings/clerk-managers/my-threshold');
      return response.data?.requestThreshold ?? null;
    } catch {
      return null;
    }
  },
};
