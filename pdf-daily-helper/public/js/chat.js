document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesContainer = document.getElementById('chatMessages');
  const submitButton = document.getElementById('chatSubmit');
  const statusEl = document.getElementById('chatStatus');
  const historySidebar = document.getElementById('chatHistorySidebar');

  if (!form || !input || !messagesContainer) {
    return;
  }

  let history = [];

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    pushHistory('You', message);
    input.value = '';
    setLoadingState(true, 'Thinking…');

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
      pushHistory('Assistant', payload.answer);

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
    if (!messagesContainer.dataset.initialized) {
      messagesContainer.innerHTML = '';
      messagesContainer.dataset.initialized = 'true';
    }

    const wrapper = document.createElement('div');
    wrapper.className = `chat-message chat-message-${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = role === 'assistant' ? 'AI' : 'You';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);

    if (role === 'assistant' && Array.isArray(sources) && sources.length > 0) {
      const sourcesList = document.createElement('ul');
      sourcesList.className = 'chat-sources';
      sources.forEach((source, index) => {
        const item = document.createElement('li');
        item.textContent = `${index + 1}. ${source.original_name || source.filename || 'Source'} (chunk #${source.chunk_index ?? '—'})`;
        sourcesList.appendChild(item);
      });
      bubble.appendChild(sourcesList);
    }

    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function pushHistory(label, content) {
    if (!historySidebar) return;
    if (!historySidebar.dataset.initialized) {
      historySidebar.innerHTML = '';
      historySidebar.dataset.initialized = 'true';
    }

    const entry = document.createElement('div');
    entry.className = 'p-3 rounded-3 text-white-75';
    entry.style.backgroundColor = label === 'You' ? 'rgba(37, 99, 235, 0.25)' : 'rgba(148, 163, 184, 0.15)';

    const meta = document.createElement('small');
    meta.className = 'text-uppercase d-block mb-1 text-white-50';
    meta.textContent = label;

    const body = document.createElement('div');
    body.textContent = content;

    entry.appendChild(meta);
    entry.appendChild(body);
    historySidebar.prepend(entry);

    while (historySidebar.childElementCount > 6) {
      historySidebar.removeChild(historySidebar.lastElementChild);
    }
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
