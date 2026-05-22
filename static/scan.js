const videoEl = document.getElementById('preview');
const statusEl = document.getElementById('cameraStatus');
const resultEl = document.getElementById('scanResult');
const codeInput = document.getElementById('codeInput');

function handleDecoded(text) {
  resultEl.textContent = `Найдено: ${text}`;
  if (/\/equipment\/[a-zA-Z0-9]+/.test(text)) {
    const url = text.startsWith('http') ? text : `${location.origin}${text}`;
    window.location.href = url;
    return;
  }
  fetch(`/api/equipment/${encodeURIComponent(text)}`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      if (data?.item?.detail_url) {
        window.location.href = data.item.detail_url;
      } else {
        resultEl.textContent = 'Код не распознан';
      }
    })
    .catch(() => {
      resultEl.textContent = 'Код не найден в системе';
    });
}

if (videoEl) {
  QrScanner.WORKER_PATH = 'https://unpkg.com/qr-scanner@1.4.2/qr-scanner-worker.min.js';
  const scanner = new QrScanner(
    videoEl,
    result => {
      scanner.stop();
      handleDecoded(result.data || result);
      setTimeout(() => scanner.start(), 1200);
    },
    { returnDetailedScanResult: true }
  );

  scanner.start()
    .then(() => { statusEl.textContent = 'Камера готова — наведите на QR'; })
    .catch(err => {
      statusEl.textContent = 'Не удалось открыть камеру, используйте ручной сканер.';
      console.error(err);
    });
}

codeInput?.focus();

codeInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const value = codeInput.value.trim();
    if (!value) return;
    handleDecoded(value);
    codeInput.value = '';
  }
});
