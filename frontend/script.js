// Polyfill dla path.extname w przeglądarce
const path = {
    extname: (p) => {
        const i = p.lastIndexOf('.');
        return i < 0 ? '' : p.slice(i);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM
    const fileSelect = document.getElementById('fileSelect');
    const invoiceNameInput = document.getElementById('invoiceName');
    const invoiceDateInput = document.getElementById('invoiceDate');
    const processBtn = document.getElementById('processBtn');
    const packBtn = document.getElementById('packBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const missingInvoicesList = document.getElementById('missingInvoicesList');
    const imageUpload = document.getElementById('imageUpload');
    const convertBtn = document.getElementById('convertBtn');
    const addToZipBtn = document.getElementById('addToZipBtn');
    const customNameBtn = document.getElementById('customNameBtn');
    const showPackedFilesBtn = document.getElementById('showPackedFilesBtn');
    const fileManagerList = document.getElementById('fileManagerList');
    const showZipManagerBtn = document.getElementById('showZipManagerBtn');
    const zipManagerAccordion = document.getElementById('zipManagerAccordion');
    
    // Modale
    const zipSelectModalEl = document.getElementById('zipSelectModal');
    const zipSelectModal = new bootstrap.Modal(zipSelectModalEl);
    const zipFileSelect = document.getElementById('zipFileSelect');
    const confirmAddToZipBtn = document.getElementById('confirmAddToZipBtn');
    const monthSelectModalEl = document.getElementById('monthSelectModal');
    const monthSelectModal = new bootstrap.Modal(monthSelectModalEl);
    const monthInput = document.getElementById('monthInput');
    const confirmPackBtn = document.getElementById('confirmPackBtn');
    const imageFoundModalEl = document.getElementById('imageFoundModal');
    const imageFoundModal = new bootstrap.Modal(imageFoundModalEl);
    const imageFoundFilenameEl = document.getElementById('imageFoundFilename');
    const showImageBtn = document.getElementById('showImageBtn');
    const openInGimpBtn = document.getElementById('openInGimpBtn');
    const leaveImageBtn = document.getElementById('leaveImageBtn');
    const convertNowBtn = document.getElementById('convertNowBtn');
    const fileManagerModalEl = document.getElementById('fileManagerModal');
    const fileManagerModal = new bootstrap.Modal(fileManagerModalEl);
    const zipManagerModalEl = document.getElementById('zipManagerModal');
    const zipManagerModal = new bootstrap.Modal(zipManagerModalEl);
    
    const requiredInvoiceItems = [
        'superdevs', 'congitva', 'cognitiva przelew netto',
        'cognitiva przelew vat', 'księgowy', 'paliwo tipo mol', 'wypożyczenie laptopa',
        'odsetki-i-prowizje-bankowe.jpg'
    ];

    let missingItemsState = [];
    let latestZipFile = null;
    let ignoredImages = [];

    const showStatus = (targetId, message, isError = false) => {
        const statusDiv = document.getElementById(targetId);
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = isError ? 'alert alert-danger mt-3' : 'alert alert-success mt-3';
        }
    };
    
    const updateMissingInvoices = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/get-packed-files');
            if (!response.ok) throw new Error('Błąd serwera przy pobieraniu spakowanych plików.');
            const packedFiles = await response.json();
            missingItemsState = requiredInvoiceItems.filter(requiredItem => {
                const normalizedRequired = requiredItem.toLowerCase().replace(/ /g, '-');
                return !packedFiles.some(packedFile => packedFile.toLowerCase().includes(normalizedRequired));
            });
            missingInvoicesList.innerHTML = '';
            if (missingItemsState.length === 0) {
                missingInvoicesList.innerHTML = '<li class="list-group-item list-group-item-success">Wszystkie obowiązkowe faktury są w pakowalni! ✅</li>';
            } else {
                missingItemsState.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = item;
                    missingInvoicesList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Błąd podczas aktualizacji listy brakujących faktur:', error);
            missingInvoicesList.innerHTML = '<li class="list-group-item list-group-item-danger">Nie można załadować statusu.</li>';
        }
    };

    const loadFiles = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/get-files');
            const files = await response.json();
            const specialFilePhrase = 'odsetki-i-prowizje-bankowe.jpg';
            const specialFile = files.find(file => file.includes(specialFilePhrase));
            if (specialFile) {
                showStatus('processStatus', `Wykryto "${specialFile}". Automatyczne przenoszenie...`, false);
                try {
                    const moveResponse = await fetch('/api/auto-move-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: specialFile })
                    });
                    const result = await moveResponse.json();
                    if (!moveResponse.ok) throw new Error(result.message);
                    showStatus('processStatus', result.message, false);
                    loadFiles(); 
                    updateMissingInvoices();
                } catch (error) {
                    showStatus('processStatus', error.message, true);
                }
                return;
            }
            const displayFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.pdf', '.png', '.jpg', '.jpeg'].includes(ext);
            });
            fileSelect.innerHTML = '<option selected disabled>Wybierz plik...</option>';
            displayFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                fileSelect.appendChild(option);
            });
            const otherImageFiles = displayFiles.filter(file => !file.toLowerCase().endsWith('.pdf') && !ignoredImages.includes(file));
            if (otherImageFiles.length > 0) {
                const imageToProcess = otherImageFiles[0];
                imageFoundFilenameEl.textContent = `Plik: ${imageToProcess}`;
                showImageBtn.dataset.filename = imageToProcess; 
                openInGimpBtn.dataset.filename = imageToProcess; 
                convertNowBtn.dataset.filename = imageToProcess; 
                imageFoundModal.show();
            }
        } catch (error) {
            showStatus('processStatus', 'Błąd podczas ładowania plików z sortowni.', true);
        }
    };

    const renderFileManager = (files) => {
        fileManagerList.innerHTML = '';
        if (files.length === 0) {
            fileManagerList.innerHTML = '<li class="list-group-item">Folder "pakowalnia" jest pusty.</li>';
            return;
        }
        files.forEach(filename => {
            const isImage = ['.jpg', '.jpeg', '.png'].includes(path.extname(filename).toLowerCase());
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap';
            li.innerHTML = `
                <span class="me-3">${filename}</span>
                <div class="file-actions btn-group mt-2 mt-sm-0" role="group">
                    <button class="btn btn-sm btn-outline-secondary" title="Cofnij do sortowni" data-action="move" data-filename="${filename}"><i class="bi bi-arrow-return-left"></i></button>
                    <button class="btn btn-sm btn-outline-danger" title="Usuń" data-action="delete" data-filename="${filename}"><i class="bi bi-trash"></i></button>
                    <button class="btn btn-sm btn-outline-info" title="Zmień nazwę" data-action="rename" data-filename="${filename}"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-primary" title="Pokaż" data-action="show" data-filename="${filename}"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-outline-success" title="Dodaj do ZIPa" data-action="add-to-zip" data-filename="${filename}"><i class="bi bi-file-earmark-zip"></i></button>
                    ${isImage ? `<button class="btn btn-sm btn-outline-dark" title="Przytnij (GIMP)" data-action="gimp" data-filename="${filename}"><i class="bi bi-scissors"></i></button>` : ''}
                </div>
            `;
            fileManagerList.appendChild(li);
        });
    };

    const renderZipManager = async () => {
        try {
            const zipFiles = await fetch('http://localhost:3000/api/get-zips').then(res => res.json());
            zipManagerAccordion.innerHTML = '';
            if (zipFiles.length === 0) {
                zipManagerAccordion.innerHTML = '<p>Brak archiwów w folderze ZIP Skład.</p>';
                return;
            }
            let accordionHtml = '';
            for (const zipFilename of zipFiles) {
                const contentsResponse = await fetch(`http://localhost:3000/api/get-zip-contents?zipFilename=${encodeURIComponent(zipFilename)}`);
                const contents = await contentsResponse.json();
                const accordionItemId = `zip-${zipFilename.replace(/[^a-zA-Z0-9]/g, '')}`;
                let contentHtml = '<ul class="list-group list-group-flush">';
                if (contents.length > 0) {
                    contents.forEach(entry => {
                        const isImage = !entry.isDirectory && ['.jpg', '.jpeg', '.png'].includes(path.extname(entry.name).toLowerCase());
                        contentHtml += `
                            <li class="list-group-item d-flex justify-content-between align-items-center flex-wrap">
                                <span class="me-2"><i class="bi ${entry.isDirectory ? 'bi-folder' : 'bi-file-earmark-text'} me-2"></i>${entry.name}</span>
                                ${!entry.isDirectory ? `
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" title="Pokaż" data-action="view-in-zip" data-zip-filename="${zipFilename}" data-internal-filename="${entry.name}"><i class="bi bi-eye"></i></button>
                                    <button class="btn btn-sm btn-outline-secondary" title="Wypakuj do sortowni" data-action="extract-file" data-zip-filename="${zipFilename}" data-internal-filename="${entry.name}"><i class="bi bi-box-arrow-down"></i></button>
                                    ${isImage ? `<button class="btn btn-sm btn-outline-dark" title="Przytnij (GIMP)" data-action="gimp-from-zip" data-zip-filename="${zipFilename}" data-internal-filename="${entry.name}"><i class="bi bi-scissors"></i></button>` : ''}
                                    <button class="btn btn-sm btn-outline-danger" title="Usuń z ZIPa" data-action="delete-from-zip" data-zip-filename="${zipFilename}" data-internal-filename="${entry.name}"><i class="bi bi-trash"></i></button>
                                </div>` : ''}
                            </li>`;
                    });
                } else {
                    contentHtml += '<li class="list-group-item">Archiwum jest puste.</li>';
                }
                contentHtml += '</ul>';
                accordionHtml += `
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionItemId}">
                                ${zipFilename}
                            </button>
                        </h2>
                        <div id="${accordionItemId}" class="accordion-collapse collapse" data-bs-parent="#zipManagerAccordion">
                            <div class="accordion-body">
                                ${contentHtml}
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-info" data-action="rename-zip" data-filename="${zipFilename}">Zmień nazwę</button>
                                    <button class="btn btn-sm btn-secondary" data-action="extract-zip" data-filename="${zipFilename}">Wypakuj do sortowni</button>
                                    <button class="btn btn-sm btn-danger" data-action="delete-zip" data-filename="${zipFilename}">Usuń ZIPa</button>
                                    <button class="btn btn-sm btn-warning" data-action="check-missing" data-filename="${zipFilename}">Pokaż czego brakuje</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
            zipManagerAccordion.innerHTML = accordionHtml;
        } catch(error) {
            console.error(error);
            zipManagerAccordion.innerHTML = '<div class="alert alert-danger">Nie udało się załadować listy archiwów.</div>';
        }
    };

    processBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: fileSelect.value,
            newName: invoiceNameInput.value,
            invoiceDate: invoiceDateInput.value
        };
        if (!data.originalFilename || data.originalFilename === 'Wybierz plik...' || !data.newName || !data.invoiceDate) {
            showStatus('processStatus', 'Wypełnij wszystkie pola!', true);
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/process-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
            showStatus('processStatus', result.message, false);
            invoiceNameInput.value = '';
            invoiceDateInput.value = '';
            loadFiles();
            updateMissingInvoices();
        } catch (error) {
            showStatus('processStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });

    customNameBtn.addEventListener('click', async () => {
        const originalFilename = fileSelect.value;
        if (!originalFilename || originalFilename === 'Wybierz plik...') {
            showStatus('processStatus', 'Najpierw wybierz plik z listy!', true);
            return;
        }
        const customFilename = prompt('Wprowadź pełną, niestandardową nazwę pliku:', originalFilename);
        if (!customFilename) {
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/custom-rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalFilename, customFilename })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showStatus('processStatus', result.message, false);
            loadFiles();
            updateMissingInvoices();
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    packBtn.addEventListener('click', () => {
        if (missingItemsState.length > 0) {
            const userConfirmation = confirm("W pakowalni brakuje obowiązkowych plików, czy na pewno chcesz przykoksić mordo?");
            if (!userConfirmation) return; 
        }
        monthSelectModal.show();
    });

    confirmPackBtn.addEventListener('click', async () => {
        const monthValue = monthInput.value;
        if (!monthValue) {
            alert("Wybierz miesiąc!");
            return;
        }
        const [year, month] = monthValue.split('-');
        monthSelectModal.hide();
        try {
            const response = await fetch('http://localhost:3000/api/pack-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
            showStatus('packStatus', result.message, false);
            latestZipFile = result.zipFilename;
            sendEmailBtn.disabled = false;
            setTimeout(() => {
                updateMissingInvoices();
                fileManagerList.innerHTML = '<li class="list-group-item">Folder "pakowalnia" jest pusty.</li>';
            }, 1000);
        } catch (error) {
            showStatus('packStatus', `Błąd podczas pakowania plików: ${error.message}`, true);
        }
    });

    sendEmailBtn.addEventListener('click', async () => {
        if (!latestZipFile) {
            showStatus('sendStatus', 'Brak informacji o ostatnio spakowanym pliku. Spakuj pliki ponownie.', true);
            return;
        }
        showStatus('sendStatus', 'Wysyłanie e-maila...', false);
        try {
            const response = await fetch('http://localhost:3000/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zipFilename: latestZipFile })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
            showStatus('sendStatus', result.message, false);
            sendEmailBtn.disabled = true;
            latestZipFile = null;
        } catch (error) {
            showStatus('sendStatus', `Błąd podczas wysyłania e-maila: ${error.message}`, true);
        }
    });

    convertBtn.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (!file) {
            showStatus('convertStatus', 'Najpierw wybierz plik obrazu!', true);
            return;
        }
        const formData = new FormData();
        formData.append('imageFile', file);
        showStatus('convertStatus', 'Konwertowanie pliku...', false);
        try {
            const response = await fetch('http://localhost:3000/api/convert-to-pdf', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
            showStatus('convertStatus', result.message, false);
            imageUpload.value = '';
            loadFiles();
        } catch (error) {
            showStatus('convertStatus', `Błąd konwersji: ${error.message}`, true);
        }
    });
    
    showImageBtn.addEventListener('click', () => {
        const filename = showImageBtn.dataset.filename;
        if (!filename) return;
        const encodedFile = filename.split('/').map(encodeURIComponent).join('/');
        const fileUrl = `http://localhost:3000/files/${encodedFile}`;
        window.open(fileUrl, '_blank');
    });

    openInGimpBtn.addEventListener('click', async () => {
        const filename = openInGimpBtn.dataset.filename;
        if (!filename) return;
        try {
            const response = await fetch('http://localhost:3000/api/open-in-gimp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, folder: 'sortownia' })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showStatus('processStatus', result.message, false);
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    leaveImageBtn.addEventListener('click', () => {
        const filename = showImageBtn.dataset.filename;
        if (filename) {
            ignoredImages.push(filename);
        }
        imageFoundModal.hide();
    });

    convertNowBtn.addEventListener('click', async () => {
        const filename = convertNowBtn.dataset.filename;
        if (!filename) return;
        showStatus('processStatus', `Konwertowanie pliku ${filename}...`, false);
        imageFoundModal.hide();
        try {
            const response = await fetch('http://localhost:3000/api/convert-server-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
            showStatus('processStatus', result.message, false);
            loadFiles();
        } catch (error) {
            showStatus('processStatus', `Błąd konwersji: ${error.message}`, true);
        }
    });

    fileSelect.addEventListener('change', () => {
        const selectedFile = fileSelect.value;
        if (selectedFile && selectedFile !== 'Wybierz plik...') {
            const encodedFile = selectedFile.split('/').map(encodeURIComponent).join('/');
            const fileUrl = `http://localhost:3000/files/${encodedFile}`;
            window.open(fileUrl, '_blank');
            const isProcessable = ['.pdf', '.png', '.jpg', '.jpeg'].includes(path.extname(selectedFile).toLowerCase());
            processBtn.disabled = !isProcessable;
            addToZipBtn.disabled = !isProcessable;
            customNameBtn.disabled = !isProcessable;
        } else {
            processBtn.disabled = true;
            addToZipBtn.disabled = true;
            customNameBtn.disabled = true;
        }
    });

    addToZipBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: fileSelect.value,
            newName: invoiceNameInput.value,
            invoiceDate: invoiceDateInput.value
        };
        if (!data.originalFilename || data.originalFilename === 'Wybierz plik...' || !data.newName || !data.invoiceDate) {
            showStatus('processStatus', 'Wypełnij wszystkie pola (plik, nazwa, data) przed dodaniem do ZIP!', true);
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/get-zips');
            if (!response.ok) throw new Error('Nie udało się pobrać listy archiwów.');
            const zipFiles = await response.json();
            if (zipFiles.length === 0) {
                showStatus('processStatus', 'Brak dostępnych archiwów w folderze ZIP Skład. Najpierw stwórz jakieś.', true);
                return;
            }
            zipFileSelect.innerHTML = '';
            zipFiles.forEach(zipFile => {
                const option = document.createElement('option');
                option.value = zipFile;
                option.textContent = zipFile;
                zipFileSelect.appendChild(option);
            });
            zipSelectModal.show();
        } catch(error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    confirmAddToZipBtn.addEventListener('click', async () => {
        const data = {
            originalFilename: fileSelect.value,
            newName: invoiceNameInput.value,
            invoiceDate: invoiceDateInput.value,
            zipFilename: zipFileSelect.value
        };
        if (!data.zipFilename) {
            alert('Wybierz archiwum!');
            return;
        }
        zipSelectModal.hide();
        showStatus('processStatus', `Dodawanie pliku do ${data.zipFilename}...`, false);
        try {
            const response = await fetch('http://localhost:3000/api/add-to-zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            showStatus('processStatus', result.message, false);
            invoiceNameInput.value = '';
            invoiceDateInput.value = '';
            loadFiles();
        } catch (error) {
            showStatus('processStatus', `Błąd: ${error.message}`, true);
        }
    });

    invoiceDateInput.addEventListener('click', () => {
        try {
            invoiceDateInput.showPicker();
        } catch (error) {
            console.log('Twoja przeglądarka nie wspiera showPicker().');
        }
    });

    showPackedFilesBtn.addEventListener('click', async () => {
        try {
            const packedFiles = await fetch('http://localhost:3000/api/get-packed-files').then(res => res.json());
            renderFileManager(packedFiles);
            fileManagerModal.show();
        } catch (error) {
            showStatus('packStatus', 'Nie udało się załadować plików z pakowalni.', true);
        }
    });

    fileManagerList.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const filename = button.dataset.filename;
        let shouldRefresh = true;
        try {
            switch(action) {
                case 'move':
                    if (confirm(`Czy na pewno chcesz cofnąć plik "${filename}" do sortowni?`)) {
                        await fetch('/api/move-to-sortownia', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename}) });
                    } else { shouldRefresh = false; }
                    break;
                case 'delete':
                    if (confirm(`CZY NA PEWNO chcesz trwale usunąć plik "${filename}"?`)) {
                        await fetch('/api/delete-file', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename, folder: 'pakowalnia'}) });
                    } else { shouldRefresh = false; }
                    break;
                case 'rename':
                    const newName = prompt(`Wprowadź nową nazwę dla pliku "${filename}":`, filename);
                    if (newName && newName !== filename) {
                        await fetch('/api/rename-packed-file', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({oldFilename: filename, newFilename: newName}) });
                    } else { shouldRefresh = false; }
                    break;
                case 'show':
                    window.open(`http://localhost:3000/packed/${encodeURIComponent(filename)}`, '_blank');
                    shouldRefresh = false;
                    break;
                case 'add-to-zip':
                    const zipFiles = await fetch('/api/get-zips').then(res => res.json());
                    if (zipFiles.length === 0) { alert('Brak dostępnych archiwów ZIP.'); shouldRefresh = false; break; }
                    zipFileSelect.innerHTML = '';
                    zipFiles.forEach(zipFile => {
                        const option = document.createElement('option');
                        option.value = zipFile;
                        option.textContent = zipFile;
                        zipFileSelect.appendChild(option);
                    });
                    const handleConfirm = async () => {
                        await fetch('/api/add-packed-to-zip', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({packedFilename: filename, zipFilename: zipFileSelect.value}) });
                        zipSelectModal.hide();
                        const updatedFiles = await fetch('http://localhost:3000/api/get-packed-files').then(res => res.json());
                        renderFileManager(updatedFiles);
                    };
                    confirmAddToZipBtn.addEventListener('click', handleConfirm, {once: true});
                    zipSelectModal.show();
                    shouldRefresh = false;
                    break;
                case 'gimp':
                    await fetch('/api/open-in-gimp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({filename, folder: 'pakowalnia'}) });
                    shouldRefresh = false;
                    break;
            }
            if (shouldRefresh) {
                const updatedFiles = await fetch('http://localhost:3000/api/get-packed-files').then(res => res.json());
                renderFileManager(updatedFiles);
                updateMissingInvoices();
                loadFiles();
            }
        } catch (error) {
            showStatus('packStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });

    showZipManagerBtn.addEventListener('click', () => {
        renderZipManager();
        zipManagerModal.show();
    });

    zipManagerAccordion.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button || !button.dataset.action) return;

        const action = button.dataset.action;
        const zipFilename = button.dataset.filename || button.dataset.zipFilename;
        const internalFilename = button.dataset.internalFilename;
        let shouldRefresh = true;
        let shouldRefreshAll = false;

        try {
            switch(action) {
                case 'delete-zip':
                    if (confirm(`CZY NA PEWNO chcesz trwale usunąć całe archiwum "${zipFilename}"?`)) {
                        await fetch('/api/delete-zip', { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({zipFilename}) });
                    } else { shouldRefresh = false; }
                    break;
                case 'extract-zip':
                    if (confirm(`Czy na pewno chcesz wypakować całą zawartość "${zipFilename}" do sortowni?`)) {
                        await fetch('/api/extract-zip', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({zipFilename}) });
                        zipManagerModal.hide();
                        shouldRefreshAll = true;
                    }
                    shouldRefresh = false;
                    break;
                case 'rename-zip':
                    const newZipName = prompt('Wprowadź nową nazwę dla archiwum:', zipFilename);
                    if(newZipName && newZipName !== zipFilename) {
                        await fetch('/api/rename-zip', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({oldZipFilename: zipFilename, newZipFilename: newZipName}) });
                    } else { shouldRefresh = false; }
                    break;
                case 'check-missing':
                    const contents = await fetch(`http://localhost:3000/api/get-zip-contents?zipFilename=${encodeURIComponent(zipFilename)}`).then(res => res.json());
                    const zipContents = contents.map(c => c.name);
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
                    window.open(`http://localhost:3000/api/view-file-in-zip?zipFilename=${encodeURIComponent(zipFilename)}&internalFilename=${encodeURIComponent(internalFilename)}`, '_blank');
                    shouldRefresh = false;
                    break;
                case 'extract-file':
                    if (confirm(`Wypakować plik "${internalFilename}" do sortowni?`)) {
                        await fetch('/api/extract-single-file', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({zipFilename, internalFilename}) });
                        shouldRefreshAll = true;
                    }
                    shouldRefresh = false;
                    break;
                case 'gimp-from-zip':
                    alert('Funkcja otwierania w GIMP bezpośrednio z archiwum nie jest jeszcze zaimplementowana.');
                    shouldRefresh = false;
                    break;
                case 'delete-from-zip':
                    if (confirm(`Usunąć plik "${internalFilename}" z tego archiwum ZIP?`)) {
                        await fetch('/api/delete-file-from-zip', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({zipFilename, internalFilename}) });
                    } else { shouldRefresh = false; }
                    break;
            }
            if (shouldRefresh) {
                renderZipManager();
            }
            if (shouldRefreshAll) {
                loadFiles();
                updateMissingInvoices();
            }
        } catch (error) {
            showStatus('sendStatus', `Wystąpił błąd: ${error.message}`, true);
        }
    });

    // Inicjalizacja
    loadFiles();
    updateMissingInvoices();
    processBtn.disabled = true;
    addToZipBtn.disabled = true;
    customNameBtn.disabled = true;
});