import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000', // Update if backend port changes
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = async (email) => {
    const response = await api.post('/auth/login', { email });
    return response.data;
};

export const logout = async (email) => {
    const response = await api.post('/auth/logout', { email });
    return response.data;
};

export const uploadExcel = async (email, file) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);
    const response = await api.post('/upload/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const uploadImages = async (email, files) => {
    const formData = new FormData();
    formData.append('email', email);
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/upload/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getSkus = async (email) => {
    const response = await api.get(`/validate/skus?email=${encodeURIComponent(email)}`);
    return response.data;
};

export const getImagesBySku = async (email, skuId) => {
    const response = await api.get(`/validate/images/${skuId}?email=${encodeURIComponent(email)}`);
    return response.data;
};

export const updateImageStatus = async (email, imageName, status, displayOrder, notes) => {
    const response = await api.put('/validate/update', {
        email,
        image_name: imageName,
        status,
        display_order: displayOrder,
        notes,
    });
    return response.data;
};

export const exportExcel = (email) => {
    window.open(`http://localhost:5000/export/excel?email=${encodeURIComponent(email)}`, '_blank');
};

export const exportZip = (email, sku_id) => {
    window.open(`http://localhost:5000/export/zip/${sku_id}?email=${encodeURIComponent(email)}`, '_blank');
};

export const exportApprovedZip = (email) => {
    window.open(`http://localhost:5000/export/approved-zip?email=${encodeURIComponent(email)}`, '_blank');
};

export const exportApprovedExcel = (email) => {
    window.open(`http://localhost:5000/export/approved-excel?email=${encodeURIComponent(email)}`, '_blank');
};

export const resetSku = async (email, skuId) => {
    const response = await api.post('/validate/reset', { email, sku_id: skuId });
    return response.data;
};

export default api;
