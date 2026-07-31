import apiClient from '../client';

export const tenantService = {
  // Public (pre-login) branding + feature flags for the current tenant.
  getContext: async () => {
    const response = await apiClient.get('/tenant/context');
    return response.data;
  },
};
