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

    // Modale
    const monthSelectModalEl = document.getElementById('monthSelectModal');
    const monthSelectModal = new bootstrap.Modal(monthSelectModalEl);
    const monthInput = document.getElementById('monthInput');
    const confirmPackBtn = document.getElementById('confirmPackBtn');
    
    const imageFoundModalEl = document.getElementById('imageFoundModal');
    const imageFoundModal = new bootstrap.Modal(imageFoundModalEl);
    const imageFoundFilenameEl = document.getElementById('imageFoundFilename');
    const cropWaitBtn = document.getElementById('cropWaitBtn');
    const convertNowBtn = document.getElementById('convertNowBtn');
    
    const requiredInvoiceItems = [
        'superdevs', 'congitva', 'cognitiva przelew netto',
        'cognitiva przelew vat', 'księgowy', 'paliwo tipo mol', 'wypożyczenie laptopa',
        'odsetki-i-prowizje-bankowe.jpg'
    ];

    let missingItemsState = [];
    let latestZipFile = null;

    // ZMODYFIKOWANA FUNKCJA - teraz przyjmuje ID elementu, w którym ma wyświetlić status
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
            
            const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
            const otherImageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
            });

            fileSelect.innerHTML = '<option selected disabled>Wybierz plik...</option>';
            pdfFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                fileSelect.appendChild(option);
            });

            if (otherImageFiles.length > 0) {
                const imageToProcess = otherImageFiles[0];
                imageFoundFilenameEl.textContent = `Plik: ${imageToProcess}`;
                convertNowBtn.dataset.filename = imageToProcess; 
                imageFoundModal.show();
            }
        } catch (error) {
            showStatus('processStatus', 'Błąd podczas ładowania plików z sortowni.', true);
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
    
    cropWaitBtn.addEventListener('click', () => {
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

    loadFiles();
    updateMissingInvoices();
});

const path = {
    extname: (p) => {
        const i = p.lastIndexOf('.');
        return i < 0 ? '' : p.slice(i);
    }
};