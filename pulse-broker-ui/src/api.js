import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const checkServerHealth = () => api.get('/health').then(res => res.data);
export const getItems = () => api.get('/items').then(res => res.data);
export const getMarkas = () => api.get('/markas').then(res => res.data);
export const getContacts = () => api.get('/contacts').then(res => res.data);
export const getFirms = () => api.get('/firms').then(res => res.data);
export const getDeals = () => api.get('/deals').then(res => res.data);
export const getPendingDeals = () => api.get('/deals/pending').then(res => res.data);
export const getMarginDeals = (partyId) => api.get(`/deals/margins/${partyId}`).then(res => res.data);

export const createItem = (data) => api.post('/items', data).then(res => res.data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then(res => res.data);
export const createMarka = (data) => api.post('/markas', data).then(res => res.data);
export const updateMarka = (id, data) => api.put(`/markas/${id}`, data).then(res => res.data);
export const createContact = (data) => api.post('/contacts', data).then(res => res.data);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data).then(res => res.data);
export const createFirm = (data) => api.post('/firms', data).then(res => res.data);
export const updateFirm = (id, data) => api.put(`/firms/${id}`, data).then(res => res.data);
export const createDeal = (data) => api.post('/deals', data).then(res => res.data);
export const updateDeal = (id, data) => api.put(`/deals/${id}`, data).then(res => res.data);
export const loadDeal = (id, payload) => api.post(`/deals/${id}/load`, payload).then(res => res.data);
export const revertDeal = (id) => api.post(`/deals/${id}/revert`).then(res => res.data);
export const getDashboardSummary = () => api.get('/dashboard/summary').then(res => res.data);

export const previewBill = (firmId, fromDate, toDate) => {
    let url = `/billing/preview?firmId=${firmId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return api.get(url).then(res => res.data);
};

export const generateBill = (firmId, fromDate, toDate) => {
    let url = `/billing/generate?firmId=${firmId}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    return api.post(url).then(res => res.data);
};

export const getAllBills = () => api.get('/billing').then(res => res.data);
export const getBillDetail = (billId) => api.get(`/billing/${billId}/detail`).then(res => res.data);
export const clearBill = (billId, clearanceDate, discountAmount) => {
    let url = `/billing/${billId}/clear?`;
    if (clearanceDate) url += `clearanceDate=${clearanceDate}&`;
    if (discountAmount) url += `discountAmount=${discountAmount}`;
    return api.post(url).then(res => res.data);
};

export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const deleteFirm = (id) => api.delete(`/firms/${id}`);
export const deleteItem = (id) => api.delete(`/items/${id}`);
export const deleteMarka = (id) => api.delete(`/markas/${id}`);
export const deleteDeal = (id) => api.delete(`/deals/${id}`);
export const deleteBill = (id) => api.delete(`/billing/${id}`);

export default api;
