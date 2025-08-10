// frontend/js/api.js

import { fetchWithErrorHandling } from './utils.js';

const API_BASE = '/api';

export const getFiles = () => fetchWithErrorHandling(`${API_BASE}/get-files`);
export const getPackedFiles = () => fetchWithErrorHandling(`${API_BASE}/get-packed-files`);
export const getZips = () => fetchWithErrorHandling(`${API_BASE}/get-zips`);
export const getZipContents = (zipFilename) => fetchWithErrorHandling(`${API_BASE}/get-zip-contents?zipFilename=${encodeURIComponent(zipFilename)}`);

export const processInvoice = (data) => fetchWithErrorHandling(`${API_BASE}/process-invoice`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const customRename = (data) => fetchWithErrorHandling(`${API_BASE}/custom-rename`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const packFiles = (data) => fetchWithErrorHandling(`${API_BASE}/pack-files`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const sendEmail = (data) => fetchWithErrorHandling(`${API_BASE}/send-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const addToZip = (data) => fetchWithErrorHandling(`${API_BASE}/add-to-zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const autoMoveFile = (filename) => fetchWithErrorHandling(`${API_BASE}/auto-move-file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename })
});
export const convertServerFile = (filename) => fetchWithErrorHandling(`${API_BASE}/convert-server-file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename })
});
export const convertUploadedFile = (formData) => fetchWithErrorHandling(`${API_BASE}/convert-to-pdf`, {
    method: 'POST', body: formData
});
export const openInGimp = (data) => fetchWithErrorHandling(`${API_BASE}/open-in-gimp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const moveToSortownia = (filename) => fetchWithErrorHandling(`${API_BASE}/move-to-sortownia`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename })
});
export const deleteFile = (data) => fetchWithErrorHandling(`${API_BASE}/delete-file`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const renamePackedFile = (data) => fetchWithErrorHandling(`${API_BASE}/rename-packed-file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const addPackedToZip = (data) => fetchWithErrorHandling(`${API_BASE}/add-packed-to-zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const renameZip = (data) => fetchWithErrorHandling(`${API_BASE}/rename-zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const extractZip = (zipFilename) => fetchWithErrorHandling(`${API_BASE}/extract-zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zipFilename })
});
export const deleteZip = (zipFilename) => fetchWithErrorHandling(`${API_BASE}/delete-zip`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zipFilename })
});
export const deleteFileFromZip = (data) => fetchWithErrorHandling(`${API_BASE}/delete-file-from-zip`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});
export const extractSingleFile = (data) => fetchWithErrorHandling(`${API_BASE}/extract-single-file`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});