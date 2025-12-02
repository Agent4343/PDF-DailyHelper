document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', async (event) => {
    const target = event.target;
    if (!target.matches('.view-parsed')) {
      return;
    }

    const pdfId = target.dataset.id;
    if (!pdfId) {
      return;
    }

    try {
      const response = await fetch(`/api/pdfs/${pdfId}/parsed`);
      if (!response.ok) {
        throw new Error('Unable to fetch parsed PDF data.');
      }
      const data = await response.json();
      openModal(data);
    } catch (error) {
      console.error('Error fetching parsed data:', error);
      window.alert('Unable to load parsed PDF data at this time.');
    }
  });

  function openModal(data) {
    const modal = document.createElement('div');
    modal.className = 'parsed-modal';
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1050'
    });

    const modalContent = document.createElement('div');
    modalContent.className = 'parsed-modal-content';
    Object.assign(modalContent.style, {
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '90%',
      maxHeight: '80%',
      overflowY: 'auto',
      width: '800px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    });

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.style.float = 'right';
    closeButton.addEventListener('click', () => modal.remove());

    const title = document.createElement('h2');
    title.textContent = 'Parsed PDF Data';

    const textHeading = document.createElement('h3');
    textHeading.textContent = 'Extracted Text';

    const textPre = document.createElement('pre');
    textPre.textContent = data.extractedText || 'No extracted text available.';

    const structureHeading = document.createElement('h3');
    structureHeading.textContent = 'Structure';

    const structurePre = document.createElement('pre');
    structurePre.textContent = JSON.stringify(data.structure || {}, null, 2);

    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(textHeading);
    modalContent.appendChild(textPre);
    modalContent.appendChild(structureHeading);
    modalContent.appendChild(structurePre);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
});
