// Polyfill dla path.extname w przeglądarce
export const path = {
  extname: (p) => {
    const i = p.lastIndexOf('.');
    return i < 0 ? '' : p.slice(i);
  }
};

export function showStatus(targetId, message, isError = false) {
  const statusDiv = document.getElementById(targetId);
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'alert alert-danger mt-3' : 'alert alert-success mt-3';
  }
}

export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export async function fetchWithErrorHandling(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Błąd serwera');
    }
    return await response.json();
  } catch (error) {
    console.error('Błąd fetch:', error);
    throw error;
  }
}