import { showStatus } from './utils.js';

export function initImageFoundModal() {
  const imageFoundModal = new bootstrap.Modal(document.getElementById('imageFoundModal'));
  
  document.getElementById('showImageBtn').addEventListener('click', () => {
    const filename = document.getElementById('imageFoundFilename').textContent.replace('Plik: ', '');
    const encodedFile = filename.split('/').map(encodeURIComponent).join('/');
    window.open(`http://localhost:3000/files/${encodedFile}`, '_blank');
  });

  document.getElementById('convertNowBtn').addEventListener('click', async () => {
    const filename = document.getElementById('imageFoundFilename').textContent.replace('Plik: ', '');
    showStatus('processStatus', `Konwertowanie pliku ${filename}...`, false);
    
    try {
      const response = await fetch('http://localhost:3000/api/convert-server-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Błąd serwera.');
      
      showStatus('processStatus', result.message, false);
      imageFoundModal.hide();
    } catch (error) {
      showStatus('processStatus', `Błąd konwersji: ${error.message}`, true);
    }
  });
}

export function initMonthSelectModal() {
  const monthSelectModal = new bootstrap.Modal(document.getElementById('monthSelectModal'));
  
  document.getElementById('confirmPackBtn').addEventListener('click', async () => {
    const monthValue = document.getElementById('monthInput').value;
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
      document.getElementById('sendEmailBtn').disabled = false;
      
      setTimeout(() => {
        updateMissingInvoices();
        document.getElementById('fileManagerList').innerHTML = '<li class="list-group-item">Folder "pakowalnia" jest pusty.</li>';
      }, 1000);
    } catch (error) {
      showStatus('packStatus', `Błąd podczas pakowania plików: ${error.message}`, true);
    }
  });
}