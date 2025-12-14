document.addEventListener('DOMContentLoaded', async function () {
  await fetchPDFs();
});

async function fetchPDFs() {
  try {
    const response = await fetch('/api/pdfs');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pdfs = await response.json();
    const pdfList = document.getElementById('pdfList');
    const pdfCount = document.getElementById('pdfCount');

    if (!pdfList) {
      return;
    }

    // Update count
    if (pdfCount) {
      pdfCount.textContent = `${pdfs.length} document${pdfs.length !== 1 ? 's' : ''}`;
    }

    pdfList.innerHTML = pdfs.length === 0
      ? '<li class="list-group-item text-muted">No PDFs uploaded yet. Upload your first document above.</li>'
      : pdfs.map(pdf => {
          const expiresInfo = pdf.expiresAt
            ? `<span class="badge bg-secondary ms-2" title="Auto-deletes ${new Date(pdf.expiresAt).toLocaleString()}">Expires</span>`
            : '';
          return `
          <li class="list-group-item">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>${pdf.originalName}</strong>
                ${pdf.structure?.ocrUsed ? '<span class="badge bg-warning text-dark ms-2" title="Text extracted via OCR">OCR</span>' : ''}
                ${expiresInfo}
                <small class="text-muted d-block">${new Date(pdf.uploadDate).toLocaleString()}${pdf.structure?.numPages ? ` • ${pdf.structure.numPages} pages` : ''}${pdf.extractedText?.length ? ` • ${pdf.extractedText.length.toLocaleString()} chars` : ''}</small>
              </div>
              <div class="btn-group btn-group-sm">
                <a href="/viewer/${pdf._id}" class="btn btn-outline-primary" title="View PDF">View</a>
                <a href="/api/pdfs/${pdf._id}/download" class="btn btn-outline-secondary" title="Download PDF">Download</a>
                <button class="btn btn-outline-info summary-pdf" data-id="${pdf._id}" title="AI Summary">Summary</button>
                <button class="btn btn-outline-danger delete-pdf" data-id="${pdf._id}" title="Delete PDF">Delete</button>
              </div>
            </div>
          </li>
        `}).join('');

    addDeleteListeners();
    addSummaryListeners();
  } catch (error) {
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
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    alert(result.message);
    fetchPDFs();
  } catch (error) {
    alert('An error occurred while deleting the PDF.');
  }
}

function addSummaryListeners() {
  document.querySelectorAll('.summary-pdf').forEach(button => {
    button.addEventListener('click', async () => {
      const pdfId = button.getAttribute('data-id');
      button.disabled = true;
      button.textContent = 'Loading...';

      try {
        const response = await fetch(`/api/pdfs/${pdfId}/summary`, {
          method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
          showSummaryModal(data.name, data.summary);
        } else {
          alert(data.error || 'Failed to generate summary');
        }
      } catch (error) {
        alert('An error occurred while generating summary.');
      } finally {
        button.disabled = false;
        button.textContent = 'Summary';
      }
    });
  });
}

function showSummaryModal(name, summary) {
  // Remove existing modal if any
  const existingModal = document.getElementById('summaryModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'summaryModal';
  modal.className = 'modal fade show';
  modal.style.display = 'block';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Summary: ${name}</h5>
          <button type="button" class="btn-close" onclick="closeSummaryModal()"></button>
        </div>
        <div class="modal-body">
          <div style="white-space: pre-wrap; line-height: 1.7;">${summary}</div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeSummaryModal()">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeSummaryModal() {
  const modal = document.getElementById('summaryModal');
  if (modal) modal.remove();
}
