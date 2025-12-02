document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesContainer = document.getElementById('chatMessages');
  const submitButton = document.getElementById('chatSubmit');
  const statusEl = document.getElementById('chatStatus');

  if (!form || !input || !messagesContainer) {
    return;
  }

  let history = [];

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';
    setLoadingState(true, 'Thinking...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history })
      });

      if (!response.ok) {
        throw new Error('Unable to get a response from the assistant.');
      }

      const payload = await response.json();
      appendMessage('assistant', payload.answer, payload.sources || []);

      history = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: payload.answer }
      ].slice(-10);
    } catch (error) {
      console.error('Chat error:', error);
      appendMessage('assistant', error.message || 'Something went wrong.');
    } finally {
      setLoadingState(false);
    }
  });

  function appendMessage(role, text, sources = []) {
    const body = ensureMessagesBody();
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message chat-message-${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    wrapper.appendChild(bubble);

    if (role === 'assistant' && Array.isArray(sources) && sources.length > 0) {
      const sourcesList = document.createElement('ul');
      sourcesList.className = 'chat-sources';
      sources.forEach((source, index) => {
        const item = document.createElement('li');
        item.textContent = `${source.original_name || source.filename || 'Source'} (chunk #${source.chunk_index ?? '—'})`;
        sourcesList.appendChild(item);
      });
      wrapper.appendChild(sourcesList);
    }

    body.appendChild(wrapper);
    body.scrollTop = body.scrollHeight;
  }

  function ensureMessagesBody() {
    let body = messagesContainer.querySelector('.card-body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'card-body';
      messagesContainer.appendChild(body);
    }
    if (!body.dataset.initialized) {
      body.innerHTML = '';
      body.dataset.initialized = 'true';
    }
    return body;
  }

  function setLoadingState(isLoading, message = '') {
    if (submitButton) {
      submitButton.disabled = isLoading;
    }

    if (statusEl) {
      statusEl.textContent = message;
      statusEl.hidden = !isLoading && !message;
    }
  }
});
