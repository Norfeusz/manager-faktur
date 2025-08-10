import { showStatus, path } from './utils.js';

export async function renderZipManager() {
  try {
    const zipFiles = await fetch('http://localhost:3000/api/get-zips').then(res => res.json());
    const zipManagerAccordion = document.getElementById('zipManagerAccordion');
    
    zipManagerAccordion.innerHTML = '';
    
    if (zipFiles.length === 0) {
      zipManagerAccordion.innerHTML = '<p>Brak archiwów w folderze ZIP Skład.</p>';
      return;
    }
    
    for (const zipFilename of zipFiles) {
      await renderZipAccordionItem(zipFilename, zipManagerAccordion);
    }
  } catch(error) {
    console.error(error);
    document.getElementById('zipManagerAccordion').innerHTML = 
      '<div class="alert alert-danger">Nie udało się załadować listy archiwów.</div>';
  }
}

async function renderZipAccordionItem(zipFilename, container) {
  const contents = await fetchZipContents(zipFilename);
  const accordionItemId = `zip-${zipFilename.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  const accordionItem = document.createElement('div');
  accordionItem.className = 'accordion-item';
  accordionItem.innerHTML = `
    <h2 class="accordion-header">
      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
              data-bs-target="#${accordionItemId}">
        ${zipFilename}
      </button>
    </h2>
    <div id="${accordionItemId}" class="accordion-collapse collapse" 
         data-bs-parent="#zipManagerAccordion">
      <div class="accordion-body">
        ${renderZipContents(contents)}
        ${renderZipActions(zipFilename)}
      </div>
    </div>
  `;
  
  container.appendChild(accordionItem);
}