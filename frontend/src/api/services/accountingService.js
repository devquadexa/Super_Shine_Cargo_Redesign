import apiClient from '../client';

export const accountingService = {
  getDashboard: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/accounting/dashboard${queryString}`);
    return response.data;
  },
};
