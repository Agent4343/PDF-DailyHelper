document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('uploadForm');
  if (!form || form.dataset.uploadBound === 'true') {
    return;
  }
  form.dataset.uploadBound = 'true';
  const submitButton = form.querySelector('button[type="submit"]');
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Uploading...';

    fetch('/api/upload', {
      method: 'POST',
      headers: csrfToken ? { 'CSRF-Token': csrfToken } : {},
      body: formData
    })
    .then(response => response.text())
    .then(result => {
      alert(result);
      form.reset();
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while uploading the file.');
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = 'Upload';
    });
  });
});