// frontend/js/main.js

import * as api from './api.js';
import * as ui from './uiHandlers.js';
import * as fileManager from './fileManager.js';
import { path, showStatus } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM
    const elements = {
        fileSelect: document.getElementById('fileSelect'),
        invoiceNameInput: document.getElementById('invoiceName'),
        invoiceDateInput: document.getElementById('invoiceDate'),
        processBtn: document.getElementById('processBtn'),
        packBtn: document.getElementById('packBtn'),
        sendEmailBtn: document.getElementById('sendEmailBtn'),
        missingInvoicesList: document.getElementById('missingInvoicesList'),
        imageUpload: document.getElementById('imageUpload'),
        convertBtn: document.getElementById('convertBtn'),
        addToZipBtn: document.getElementById('addToZipBtn'),
        customNameBtn: document.getElementById('customNameBtn'),
        showPackedFilesBtn: document.getElementById('showPackedFilesBtn'),
        fileManagerList: document.getElementById('fileManagerList'),
        showZipManagerBtn: document.getElementById('showZipManagerBtn'),
        zipManagerAccordion: document.getElementById('zipManagerAccordion'),
        zipSelectModalEl: document.getElementById('zipSelectModal'),
        zipFileSelect: document.getElementById('zipFileSelect'),
        confirmAddToZipBtn: document.getElementById('confirmAddToZipBtn'),
        monthSelectModalEl: document.getElementById('monthSelectModal'),
        monthInput: document.getElementById('monthInput'),
        confirmPackBtn: document.getElementById('confirmPackBtn'),
        imageFoundModalEl: document.getElementById('imageFoundModal'),
        imageFoundFilenameEl: document.getElementById('imageFoundFilename'),
        showImageBtn: document.getElementById('showImageBtn'),
        openInGimpBtn: document.getElementById('openInGimpBtn'),
        leaveImageBtn: document.getElementById('leaveImageBtn'),
        convertNowBtn: document.getElementById('convertNowBtn'),
        fileManagerModalEl: document.getElementById('fileManagerModal'),
        zipManagerModalEl: document.getElementById('zipManagerModal'),
    };
   
    const modals = {
        zipSelectModal: new bootstrap.Modal(elements.zipSelectModalEl),
        monthSelectModal: new bootstrap.Modal(elements.monthSelectModalEl),
        imageFoundModal: new bootstrap.Modal(elements.imageFoundModalEl),
        fileManagerModal: new bootstrap.Modal(elements.fileManagerModalEl),
        zipManagerModal: new bootstrap.Modal(elements.zipManagerModalEl),
    };
   
    const requiredInvoiceItems = [
        'superdevs', 'congitva', 'cognitiva przelew netto',
        'cognitiva przelew vat', 'księgowy', 'paliwo tipo mol', 'wypożyczenie laptopa',
        'odsetki-i-prowizje-bankowe.jpg'
    ];

    let missingItemsState = [];
    let latestZipFile = null;

    async function updateMissingInvoices() {
        missingItemsState = await fileManager.updateMissingInvoices(elements.missingInvoicesList);
    }

    elements.processBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: elements.fileSelect.value,
            newName: elements.invoiceNameInput.value,
            invoiceDate: elements.invoiceDateInput.value,
        };
        if (!data.originalFilename || data.originalFilename === 'Wybierz plik...' || !data.newName || !data.invoiceDate) {
            return showStatus('processStatus', 'Wypełnij wszystkie pola!', true);
        }
        try {
            const result = await api.processInvoice(data);
            showStatus('processStatus', result.message, false);
            elements.invoiceNameInput.value = '';
            elements.invoiceDateInput.value = '';
            fileManager.loadFiles(elements, modals);
            updateMissingInvoices();
        } catch (error) {
            showStatus('processStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });
   
    elements.customNameBtn.addEventListener('click', async () => {
        const originalFilename = elements.fileSelect.value;
        if (!originalFilename || originalFilename === 'Wybierz plik...') {
            return showStatus('processStatus', 'Najpierw wybierz plik z listy!', true);
        }
        const customFilename = prompt('Wprowadź pełną, niestandardową nazwę pliku:', originalFilename);
        if (!customFilename) return;
        try {
            const result = await api.customRename({ originalFilename, customFilename });
            showStatus('processStatus', result.message, false);
            fileManager.loadFiles(elements, modals);
            updateMissingInvoices();
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    elements.packBtn.addEventListener('click', () => {
        if (missingItemsState.length > 0) {
            if (!confirm("W pakowalni brakuje obowiązkowych plików, czy na pewno chcesz przykoksić mordo?")) return;
        }
        modals.monthSelectModal.show();
    });

    elements.confirmPackBtn.addEventListener('click', async () => {
        const monthValue = elements.monthInput.value;
        if (!monthValue) return alert("Wybierz miesiąc!");
        const [year, month] = monthValue.split('-');
        modals.monthSelectModal.hide();
        try {
            const result = await api.packFiles({ year: parseInt(year), month: parseInt(month) });
            showStatus('packStatus', result.message, false);
            latestZipFile = result.zipFilename;
            elements.sendEmailBtn.disabled = false;
            setTimeout(() => {
                updateMissingInvoices();
                elements.fileManagerList.innerHTML = '<li class="list-group-item">Folder "pakowalnia" jest pusty.</li>';
            }, 1000);
        } catch (error) {
            showStatus('packStatus', `Błąd podczas pakowania plików: ${error.message}`, true);
        }
    });

    elements.sendEmailBtn.addEventListener('click', async () => {
        if (!latestZipFile) return showStatus('sendStatus', 'Brak informacji o ostatnio spakowanym pliku.', true);
        showStatus('sendStatus', 'Wysyłanie e-maila...', false);
        try {
            const result = await api.sendEmail({ zipFilename: latestZipFile });
            showStatus('sendStatus', result.message, false);
            elements.sendEmailBtn.disabled = true;
            latestZipFile = null;
        } catch (error) {
            showStatus('sendStatus', `Błąd podczas wysyłania e-maila: ${error.message}`, true);
        }
    });

    elements.convertBtn.addEventListener('click', async () => {
        const file = elements.imageUpload.files[0];
        if (!file) return showStatus('convertStatus', 'Najpierw wybierz plik obrazu!', true);
        const formData = new FormData();
        formData.append('imageFile', file);
        showStatus('convertStatus', 'Konwertowanie pliku...', false);
        try {
            const result = await api.convertUploadedFile(formData);
            showStatus('convertStatus', result.message, false);
            elements.imageUpload.value = '';
            fileManager.loadFiles(elements, modals);
        } catch (error) {
            showStatus('convertStatus', `Błąd konwersji: ${error.message}`, true);
        }
    });

    elements.showImageBtn.addEventListener('click', () => {
        const filename = elements.showImageBtn.dataset.filename;
        if (!filename) return;
        const encodedFile = filename.split('/').map(encodeURIComponent).join('/');
        window.open(`/files/${encodedFile}`, '_blank');
    });

    elements.openInGimpBtn.addEventListener('click', async () => {
        const filename = elements.openInGimpBtn.dataset.filename;
        if (!filename) return;
        try {
            const result = await api.openInGimp({ filename, folder: 'sortownia' });
            showStatus('processStatus', result.message, false);
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    elements.leaveImageBtn.addEventListener('click', () => {
        const filename = elements.showImageBtn.dataset.filename;
        if (filename) {
            fileManager.addIgnoredImage(filename);
        }
        modals.imageFoundModal.hide();
        fileManager.loadFiles(elements, modals);
    });

    elements.convertNowBtn.addEventListener('click', async () => {
        const filename = elements.convertNowBtn.dataset.filename;
        if (!filename) return;
        showStatus('processStatus', `Konwertowanie pliku ${filename}...`, false);
        modals.imageFoundModal.hide();
        try {
            const result = await api.convertServerFile(filename);
            showStatus('processStatus', result.message, false);
            fileManager.loadFiles(elements, modals);
        } catch (error) {
            showStatus('processStatus', `Błąd konwersji: ${error.message}`, true);
        }
    });

    elements.fileSelect.addEventListener('change', () => {
        const selectedFile = elements.fileSelect.value;
        if (selectedFile && selectedFile !== 'Wybierz plik...') {
            const encodedFile = selectedFile.split('/').map(encodeURIComponent).join('/');
            window.open(`/files/${encodedFile}`, '_blank');
            const isProcessable = ['.pdf', '.png', '.jpg', '.jpeg'].includes(path.extname(selectedFile).toLowerCase());
            elements.processBtn.disabled = !isProcessable;
            elements.addToZipBtn.disabled = !isProcessable;
            elements.customNameBtn.disabled = !isProcessable;
        } else {
            elements.processBtn.disabled = true;
            elements.addToZipBtn.disabled = true;
            elements.customNameBtn.disabled = true;
        }
    });

    elements.addToZipBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: elements.fileSelect.value,
            newName: elements.invoiceNameInput.value,
            invoiceDate: elements.invoiceDateInput.value
        };
        if (!data.originalFilename || data.originalFilename === 'Wybierz plik...' || !data.newName || !data.invoiceDate) {
            return showStatus('processStatus', 'Wypełnij wszystkie pola (plik, nazwa, data) przed dodaniem do ZIP!', true);
        }
        try {
            const zipFiles = await api.getZips();
            if (zipFiles.length === 0) return showStatus('processStatus', 'Brak dostępnych archiwów.', true);
            ui.populateSelect(elements.zipFileSelect, zipFiles, 'Wybierz archiwum...');
            modals.zipSelectModal.show();
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    elements.confirmAddToZipBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: elements.fileSelect.value,
            newName: elements.invoiceNameInput.value,
            invoiceDate: elements.invoiceDateInput.value,
            zipFilename: elements.zipFileSelect.value
        };
        if (!data.zipFilename) return alert('Wybierz archiwum!');
        modals.zipSelectModal.hide();
        showStatus('processStatus', `Dodawanie pliku do ${data.zipFilename}...`, false);
        try {
            const result = await api.addToZip(data);
            showStatus('processStatus', result.message, false);
            elements.invoiceNameInput.value = '';
            elements.invoiceDateInput.value = '';
            fileManager.loadFiles(elements, modals);
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    elements.invoiceDateInput.addEventListener('click', () => {
        try {
            elements.invoiceDateInput.showPicker();
        } catch (error) {
            console.log('Twoja przeglądarka nie wspiera showPicker().');
        }
    });

    elements.showPackedFilesBtn.addEventListener('click', async () => {
        try {
            const packedFiles = await api.getPackedFiles();
            ui.renderFileManager(elements.fileManagerList, packedFiles);
            modals.fileManagerModal.show();
        } catch (error) {
            showStatus('packStatus', 'Nie udało się załadować plików z pakowalni.', true);
        }
    });

    elements.fileManagerList.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const filename = button.dataset.filename;
        let shouldRefresh = true;
        try {
            switch(action) {
                case 'move':
                    if (confirm(`Czy na pewno chcesz cofnąć plik "${filename}" do sortowni?`)) {
                        await api.moveToSortownia(filename);
                    } else { shouldRefresh = false; }
                    break;
                case 'delete':
                    if (confirm(`CZY NA PEWNO chcesz trwale usunąć plik "${filename}"?`)) {
                        await api.deleteFile({filename, folder: 'pakowalnia'});
                    } else { shouldRefresh = false; }
                    break;
                case 'rename':
                    const newName = prompt(`Wprowadź nową nazwę dla pliku "${filename}":`, filename);
                    if (newName && newName !== filename) {
                        await api.renamePackedFile({oldFilename: filename, newFilename: newName});
                    } else { shouldRefresh = false; }
                    break;
                case 'show':
                    window.open(`/packed/${encodeURIComponent(filename)}`, '_blank');
                    shouldRefresh = false;
                    break;
                case 'add-to-zip':
                    const zipFiles = await api.getZips();
                    if (zipFiles.length === 0) { alert('Brak dostępnych archiwów ZIP.'); shouldRefresh = false; break; }
                    ui.populateSelect(elements.zipFileSelect, zipFiles, 'Wybierz archiwum...');
                    const handleConfirm = async () => {
                        elements.confirmAddToZipBtn.removeEventListener('click', handleConfirm);
                        await api.addPackedToZip({packedFilename: filename, zipFilename: elements.zipFileSelect.value});
                        modals.zipSelectModal.hide();
                        const updatedFiles = await api.getPackedFiles();
                        ui.renderFileManager(elements.fileManagerList, updatedFiles);
                    };
                    elements.confirmAddToZipBtn.addEventListener('click', handleConfirm, {once: true});
                    modals.zipSelectModal.show();
                    shouldRefresh = false;
                    break;
                case 'gimp':
                    await api.openInGimp({filename, folder: 'pakowalnia'});
                    shouldRefresh = false;
                    break;
            }
            if (shouldRefresh) {
                const updatedFiles = await api.getPackedFiles();
                ui.renderFileManager(elements.fileManagerList, updatedFiles);
                updateMissingInvoices();
                fileManager.loadFiles(elements, modals);
            }
        } catch (error) {
            showStatus('packStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });

    elements.showZipManagerBtn.addEventListener('click', () => {
        ui.renderZipManager(elements.zipManagerAccordion, []); // Render empty state first
        modals.zipManagerModal.show();
        api.getZips().then(zipFiles => ui.renderZipManager(elements.zipManagerAccordion, zipFiles, requiredInvoiceItems));
    });

    elements.zipManagerAccordion.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button || !button.dataset.action) return;

        const action = button.dataset.action;
        const zipFilename = button.dataset.filename || button.dataset.zipFilename;
        const internalFilename = button.dataset.internalFilename;
        let shouldRefresh = true;
        let shouldRefreshAll = false;

        try {
            switch(action) {
                case 'load-zip-contents':
                    const body = document.getElementById(button.dataset.bsTarget.substring(1)).querySelector('.accordion-body');
                    if (body.dataset.loaded === 'true') {
                        shouldRefresh = false;
                        break;
                    }
                    const contents = await api.getZipContents(zipFilename);
                    ui.renderZipContents(body, zipFilename, contents);
                    body.dataset.loaded = 'true';
                    shouldRefresh = false;
                    break;
                case 'delete-zip':
                    if (confirm(`CZY NA PEWNO chcesz trwale usunąć całe archiwum "${zipFilename}"?`)) {
                        await api.deleteZip(zipFilename);
                    } else { shouldRefresh = false; }
                    break;
                case 'extract-zip':
                    if (confirm(`Czy na pewno chcesz wypakować całą zawartość "${zipFilename}" do sortowni?`)) {
                        await api.extractZip(zipFilename);
                        modals.zipManagerModal.hide();
                        shouldRefreshAll = true;
                    }
                    shouldRefresh = false;
                    break;
                case 'rename-zip':
                    const newZipName = prompt('Wprowadź nową nazwę dla archiwum:', zipFilename);
                    if(newZipName && newZipName !== zipFilename) {
                        await api.renameZip({oldZipFilename: zipFilename, newZipFilename: newZipName});
                    } else { shouldRefresh = false; }
                    break;
                case 'check-missing':
                    const zipContents = (await api.getZipContents(zipFilename)).map(c => c.name);
                    const missingInZip = requiredInvoiceItems.filter(requiredItem => {
                        const normalizedRequired = requiredItem.toLowerCase().replace(/ /g, '-');
                        return !zipContents.some(zipFile => zipFile.toLowerCase().includes(normalizedRequired));
                    });
                    if (missingInZip.length > 0) {
                        alert(`W tym archiwum brakuje:\n\n- ${missingInZip.join('\n- ')}`);
                    } else {
                        alert('Wszystkie obowiązkowe pliki są w tym archiwum. Jesteś debeściak!');
                    }
                    shouldRefresh = false;
                    break;
                case 'view-in-zip':
                    window.open(`/api/view-file-in-zip?zipFilename=${encodeURIComponent(zipFilename)}&internalFilename=${encodeURIComponent(internalFilename)}`, '_blank');
                    shouldRefresh = false;
                    break;
                case 'extract-file':
                    if (confirm(`Wypakować plik "${internalFilename}" do sortowni?`)) {
                        await api.extractSingleFile({zipFilename, internalFilename});
                        shouldRefreshAll = true;
                    }
                    shouldRefresh = false;
                    break;
                case 'delete-from-zip':
                    if (confirm(`Usunąć plik "${internalFilename}" z tego archiwum ZIP?`)) {
                        await api.deleteFileFromZip({zipFilename, internalFilename});
                        // Odśwież tylko zawartość tego jednego ZIPa
                        const currentBody = button.closest('.accordion-body');
                        const refreshedContents = await api.getZipContents(zipFilename);
                        ui.renderZipContents(currentBody, zipFilename, refreshedContents);
                    }
                    shouldRefresh = false;
                    break;
            }
            if (shouldRefresh) {
                api.getZips().then(zipFiles => ui.renderZipManager(elements.zipManagerAccordion, zipFiles, requiredInvoiceItems));
            }
            if (shouldRefreshAll) {
                fileManager.loadFiles(elements, modals);
                updateMissingInvoices();
            }
        } catch (error) {
            showStatus('sendStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });

    // Inicjalizacja
    fileManager.loadFiles(elements, modals);
    updateMissingInvoices();
    elements.processBtn.disabled = true;
    elements.addToZipBtn.disabled = true;
    elements.customNameBtn.disabled = true;
});