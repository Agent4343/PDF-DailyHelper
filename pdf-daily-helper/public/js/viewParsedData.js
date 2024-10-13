document.addEventListener('DOMContentLoaded', function() {
  const parsedDataLinks = document.querySelectorAll('a[href^="/api/pdfs/"][href$="/parsed"]');

  parsedDataLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const url = this.getAttribute('href');

      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const modal = createModal(data);
          document.body.appendChild(modal);
          modal.style.display = 'block';
        })
        .catch(error => {
          console.error('Error fetching parsed data:', error);
          console.error(error.stack);
        });
    });
  });

  function createModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '15% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '80%';

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.color = '#aaa';
    closeBtn.style.float = 'right';
    closeBtn.style.fontSize = '28px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';

    closeBtn.onclick = function() {
      modal.style.display = 'none';
      modal.remove();
    }

    const content = document.createElement('div');
    content.innerHTML = `
      <h2>Parsed PDF Data</h2>
      <h3>Extracted Text:</h3>
      <pre>${data.extractedText}</pre>
      <h3>Structure:</h3>
      <pre>${JSON.stringify(data.structure, null, 2)}</pre>
    `;

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);

    return modal;
  }
});