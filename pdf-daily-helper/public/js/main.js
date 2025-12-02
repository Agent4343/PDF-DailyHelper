document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const pdfList = document.getElementById('pdfList');
  const statusEl = document.getElementById('uploadStatus');
  const statusBaseClass = statusEl ? statusEl.className : '';

  if (!uploadForm || !pdfList) {
    return;
  }

  const submitButton = uploadForm.querySelector('button[type="submit"]');

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Uploading...' : 'Upload';
  };

  const showStatus = (message, variant = 'info') => {
    if (!statusEl) {
      return;
    }

    if (!message) {
      statusEl.textContent = '';
      statusEl.className = statusBaseClass;
      statusEl.hidden = true;
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = message;
    const alertClass = `alert alert-${variant}`;
    statusEl.className = [statusBaseClass, alertClass].filter(Boolean).join(' ');
  };

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(uploadForm);
    setLoadingState(true);
    showStatus('');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to upload the file.');
      }

      uploadForm.reset();
      showStatus(payload.message || 'File uploaded successfully.', 'success');
      await fetchPDFs();
    } catch (error) {
      console.error('Error uploading PDF:', error);
      showStatus(error.message || 'An error occurred while uploading the file.', 'danger');
    } finally {
      setLoadingState(false);
    }
  });

  pdfList.addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('.delete-pdf')) {
      const pdfId = target.getAttribute('data-id');
      if (pdfId && window.confirm('Are you sure you want to delete this PDF?')) {
        deletePDF(pdfId);
      }
    }
  });

  async function fetchPDFs() {
    try {
      const response = await fetch('/api/pdfs');
      if (!response.ok) {
        throw new Error('Unable to fetch PDFs.');
      }

      const pdfs = await response.json();
      renderPdfList(pdfs);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      showStatus('Error fetching PDFs. Please try again later.', 'danger');
      pdfList.innerHTML = '<li class="list-group-item text-danger">Unable to load PDFs.</li>';
    }
  }

  function renderPdfList(pdfs) {
    if (!Array.isArray(pdfs) || pdfs.length === 0) {
      pdfList.innerHTML = '<li class="list-group-item">No PDFs uploaded yet.</li>';
      return;
    }

    pdfList.innerHTML = '';
    pdfs.forEach((pdf) => {
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2';

      const meta = document.createElement('div');
      meta.className = 'me-2';
      meta.textContent = `${pdf.originalName} (Uploaded on: ${new Date(pdf.uploadDate).toLocaleString()})`;

      const actions = document.createElement('div');
      actions.className = 'd-flex gap-2';

      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'btn btn-info btn-sm view-parsed';
      viewButton.dataset.id = pdf._id;
      viewButton.textContent = 'View Parsed Data';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-danger btn-sm delete-pdf';
      deleteButton.dataset.id = pdf._id;
      deleteButton.textContent = 'Delete';

      actions.appendChild(viewButton);
      actions.appendChild(deleteButton);

      listItem.appendChild(meta);
      listItem.appendChild(actions);

      pdfList.appendChild(listItem);
    });
  }

  async function deletePDF(pdfId) {
    try {
      const response = await fetch(`/api/pdfs/${pdfId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Failed to delete the PDF.');
      }

      showStatus(payload.message || 'PDF deleted successfully.', 'success');
      await fetchPDFs();
    } catch (error) {
      console.error('Error deleting PDF:', error);
      showStatus(error.message || 'An error occurred while deleting the PDF.', 'danger');
    }
  }

  fetchPDFs();
});
