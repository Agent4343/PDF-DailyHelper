const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;

function getCsrfHeaders() {
  return csrfToken ? { 'CSRF-Token': csrfToken } : {};
}

function escapeHtml(value = '') {
  return value
    ? value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    : '';
}

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('uploadForm');
  if (form && form.dataset.uploadBound !== 'true') {
    form.dataset.uploadBound = 'true';
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(form);
      submitButton.disabled = true;
      submitButton.textContent = 'Uploading...';

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: getCsrfHeaders(),
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload the file.');
        }

        const result = await response.text();
        alert(result);
        form.reset();
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while uploading the file.');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Upload';
        fetchPDFs();  // Single fetchPDFs call.
      }
    });
  }

  await fetchPDFs();
});

async function fetchPDFs() {
  const pdfList = document.getElementById('pdfList');
  if (!pdfList) {
    return;
  }
  try {
    const response = await fetch('/api/pdfs');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pdfs = await response.json();

    pdfList.innerHTML = pdfs.length === 0
      ? '<li class="list-group-item">No PDFs uploaded yet.</li>'
      : pdfs.map(pdf => {
          const safeName = escapeHtml(pdf.originalName || 'Unnamed PDF');
          const safeDate = escapeHtml(new Date(pdf.uploadDate).toLocaleString());
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              ${safeName} (Uploaded on: ${safeDate})
              <button class="btn btn-danger btn-sm delete-pdf" data-id="${pdf._id}">Delete</button>
            </li>
          `;
        }).join('');

    addDeleteListeners();
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    const pdfList = document.getElementById('pdfList');
    if (pdfList) {
      pdfList.innerHTML = '<li class="list-group-item text-danger">Error fetching PDFs. Please try again later.</li>';
    }
  }
}

function addDeleteListeners() {
  document.querySelectorAll('.delete-pdf').forEach(button => {
    button.addEventListener('click', () => {
      const pdfId = button.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this PDF?')) {
        deletePDF(pdfId);
      }
    });
  });
}

async function deletePDF(pdfId) {
  try {
    const response = await fetch(`/api/pdfs/${pdfId}`, {
      method: 'DELETE',
      headers: getCsrfHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    alert(result.message);
    fetchPDFs();
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while deleting the PDF.');
  }
}