// frontend/js/uiHandlers.js

import { path } from './utils.js';

export function populateSelect(selectElement, items, placeholder) {
    selectElement.innerHTML = `<option selected disabled>${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        selectElement.appendChild(option);
    });
}

export function updateMissingInvoicesList(listElement, missingItems) {
    listElement.innerHTML = '';
    if (missingItems.length === 0) {
        listElement.innerHTML = '<li class="list-group-item list-group-item-success">Wszystkie obowiązkowe faktury są w pakowalni! ✅</li>';
    } else {
        missingItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = item;
            listElement.appendChild(li);
        });
    }
}

export function renderFileManager(listElement, files) {
    listElement.innerHTML = '';
    if (files.length === 0) {
        listElement.innerHTML = '<li class="list-group-item">Folder "pakowalnia" jest pusty.</li>';
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
        listElement.appendChild(li);
    });
}

export function renderZipManager(accordionElement, zipFiles) {
    accordionElement.innerHTML = '';
    if (zipFiles.length === 0) {
        accordionElement.innerHTML = '<p>Brak archiwów w folderze ZIP Skład.</p>';
        return;
    }
    zipFiles.forEach(zipFile => {
        const accordionItemId = `zip-${zipFile.replace(/[^a-zA-Z0-9]/g, '')}`;
        const accordionItem = `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionItemId}" data-action="load-zip-contents" data-filename="${zipFile}">
                        ${zipFile}
                    </button>
                </h2>
                <div id="${accordionItemId}" class="accordion-collapse collapse" data-bs-parent="#zipManagerAccordion">
                    <div class="accordion-body">
                        <p>Ładowanie zawartości...</p>
                    </div>
                </div>
            </div>`;
        accordionElement.innerHTML += accordionItem;
    });
}

export function renderZipContents(bodyElement, zipFilename, contents) {
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
                        <button class="btn btn-sm btn-outline-danger" title="Usuń z ZIPa" data-action="delete-from-zip" data-zip-filename="${zipFilename}" data-internal-filename="${entry.name}"><i class="bi bi-trash"></i></button>
                    </div>` : ''}
                </li>`;
        });
    } else {
        contentHtml += '<li class="list-group-item">Archiwum jest puste.</li>';
    }
    contentHtml += '</ul>';
    contentHtml += `
        <div class="mt-3">
            <button class="btn btn-sm btn-info" data-action="rename-zip" data-filename="${zipFilename}">Zmień nazwę</button>
            <button class="btn btn-sm btn-secondary" data-action="extract-zip" data-filename="${zipFilename}">Wypakuj do sortowni</button>
            <button class="btn btn-sm btn-danger" data-action="delete-zip" data-filename="${zipFilename}">Usuń ZIPa</button>
            <button class="btn btn-sm btn-warning" data-action="check-missing" data-filename="${zipFilename}">Pokaż czego brakuje</button>
        </div>`;
    bodyElement.innerHTML = contentHtml;
}