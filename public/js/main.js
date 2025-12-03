document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('uploadForm');
  const pdfList = document.getElementById('pdfList');
  const statusEl = document.getElementById('uploadStatus');
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('pdfFile');
  const statusBaseClass = statusEl ? statusEl.className : '';

  if (!uploadForm || !pdfList) {
    return;
  }

  const submitButton = document.getElementById('uploadButton') || uploadForm.querySelector('button[type="submit"]');

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Uploading…' : 'Upload PDF';
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
    const alertClass = variant === 'info' ? 'text-muted' : `text-${variant}`;
    statusEl.className = [statusBaseClass, alertClass].filter(Boolean).join(' ');
  };

  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (event) => {
      if (!event.dataTransfer?.files?.length) return;
      const file = event.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        showStatus(`Ready to upload: ${file.name}`, 'info');
      } else {
        showStatus('Only PDF files are supported.', 'danger');
      }
    });
  }

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
      pdfList.innerHTML = '<li class="timeline-item"><div><p class="mb-0 fw-semibold text-danger">Unable to load PDFs.</p></div></li>';
    }
  }

  function renderPdfList(pdfs) {
    if (!Array.isArray(pdfs) || pdfs.length === 0) {
      pdfList.innerHTML = '<li class="timeline-item"><div><p class="mb-0 fw-semibold">No PDFs yet</p><small class="text-muted">Upload your first document to get started</small></div></li>';
      return;
    }

    pdfList.innerHTML = '';
    pdfs.forEach((pdf) => {
      const listItem = document.createElement('li');
      listItem.className = 'timeline-item flex-column flex-md-row';

      const meta = document.createElement('div');
      meta.className = 'flex-grow-1';
      let ocrBadge = '<span class="status-chip neutral ms-1">Processing</span>';
      if (pdf.structure) {
        ocrBadge = pdf.structure.ocrApplied
          ? '<span class="status-chip warning ms-1">OCR enhanced</span>'
          : '<span class="status-chip success ms-1">Text native</span>';
      }

      meta.innerHTML = `
        <p class="mb-0 fw-semibold">${pdf.originalName}</p>
        <small class="text-muted">
          Uploaded on ${new Date(pdf.uploadDate).toLocaleString()}
          ${ocrBadge}
        </small>
      `;

      const actions = document.createElement('div');
      actions.className = 'mt-2 mt-md-0 d-flex gap-2 align-self-stretch';

      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'btn btn-outline-secondary btn-sm view-parsed';
      viewButton.dataset.id = pdf._id;
      viewButton.textContent = 'Preview';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-outline-danger btn-sm delete-pdf';
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
