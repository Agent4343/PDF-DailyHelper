document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Uploading...';

    fetch('/api/upload', {
      method: 'POST',
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