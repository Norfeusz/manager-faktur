// frontend/js/fileManager.js

import { showStatus, path } from './utils.js';
import * as api from './api.js';

const requiredInvoiceItems = [
  'superdevs', 'congitva', 'cognitiva przelew netto',
  'cognitiva przelew vat', 'księgowy', 'paliwo tipo mol', 
  'wypożyczenie laptopa', 'odsetki-i-prowizje-bankowe.jpg'
];

let ignoredImages = [];

export function addIgnoredImage(filename) {
    if (filename && !ignoredImages.includes(filename)) {
        ignoredImages.push(filename);
    }
}

export async function updateMissingInvoices(listElement) {
    try {
        const packedFiles = await api.getPackedFiles();
        const missingItemsState = requiredInvoiceItems.filter(requiredItem => {
            const normalizedRequired = requiredItem.toLowerCase().replace(/ /g, '-');
            return !packedFiles.some(packedFile => packedFile.toLowerCase().includes(normalizedRequired));
        });
        
        listElement.innerHTML = '';
        if (missingItemsState.length === 0) {
            listElement.innerHTML = '<li class="list-group-item list-group-item-success">Wszystkie obowiązkowe faktury są w pakowalni! ✅</li>';
        } else {
            missingItemsState.forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = item;
                listElement.appendChild(li);
            });
        }
        return missingItemsState;
    } catch (error) {
        console.error('Błąd podczas aktualizacji listy brakujących faktur:', error);
        listElement.innerHTML = '<li class="list-group-item list-group-item-danger">Nie można załadować statusu.</li>';
        return [];
    }
}

async function handleSpecialFile(elements, modals) {
    const filename = elements.specialFile;
    showStatus('processStatus', `Wykryto "${filename}". Automatyczne przenoszenie...`, false);
    try {
        const result = await api.autoMoveFile(filename);
        showStatus('processStatus', result.message, false);
        loadFiles(elements, modals);
        updateMissingInvoices(elements.missingInvoicesList);
    } catch (error) {
        showStatus('processStatus', error.message, true);
    }
}

export async function loadFiles(elements, modals) {
  try {
    const files = await api.getFiles();
    const specialFilePhrase = 'odsetki-i-prowizje-bankowe.jpg';
    const specialFile = files.find(file => file.includes(specialFilePhrase));
    
    if (specialFile) {
        elements.specialFile = specialFile;
        await handleSpecialFile(elements, modals);
        return;
    }
    
    const displayFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.pdf', '.png', '.jpg', '.jpeg'].includes(ext);
    });

    elements.fileSelect.innerHTML = '<option selected disabled>Wybierz plik...</option>';
    displayFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        elements.fileSelect.appendChild(option);
    });
    
    const otherImageFiles = displayFiles.filter(file => !file.toLowerCase().endsWith('.pdf') && !ignoredImages.includes(file));
    if (otherImageFiles.length > 0) {
        const imageToProcess = otherImageFiles[0];
        elements.imageFoundFilenameEl.textContent = `Plik: ${imageToProcess}`;
        elements.showImageBtn.dataset.filename = imageToProcess; 
        elements.openInGimpBtn.dataset.filename = imageToProcess; 
        elements.convertNowBtn.dataset.filename = imageToProcess; 
        modals.imageFoundModal.show();
    }
  } catch (error) {
    showStatus('processStatus', 'Błąd podczas ładowania plików z sortowni.', true);
  }
}