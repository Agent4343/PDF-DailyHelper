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

  let isStreaming = false;

  loadHistory();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isStreaming) return;

    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';

    const assistantState = appendMessage('assistant', '');

    try {
      await streamChat(message, assistantState);
      await loadHistory();
    } catch (error) {
      console.error('Chat stream error:', error);
      assistantState.text = error.message || 'Something went wrong.';
      assistantState.bubble.textContent = assistantState.text;
    }
  });

  async function streamChat(message, assistantState) {
    setLoadingState(true, 'Streaming response…');
    isStreaming = true;
    assistantState.text = '';

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok || !response.body) {
      throw new Error('Unable to start chat stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const eventChunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (eventChunk.trim().length === 0) continue;
          handleSseEvent(eventChunk, assistantState);
        }
      }
    } finally {
      setLoadingState(false);
      isStreaming = false;
    }
  }

  function handleSseEvent(rawEvent, assistantState) {
    const lines = rawEvent.split('\n');
    let eventType = 'message';
    let dataPayload = '';

    lines.forEach((line) => {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataPayload += line.slice(5).trim();
      }
    });

    if (!dataPayload) {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(dataPayload);
    } catch (error) {
      console.error('Failed to parse SSE payload', error);
      return;
    }

    switch (eventType) {
      case 'chunk': {
        assistantState.text += payload.content || '';
        assistantState.bubble.textContent = assistantState.text;
        break;
      }
      case 'sources': {
        assistantState.sources = payload.sources || [];
        break;
      }
      case 'done': {
        if (assistantState.sources && assistantState.sources.length) {
          renderSources(assistantState.bubble, assistantState.sources);
        }
        break;
      }
      case 'error': {
        throw new Error(payload.message || 'Chat stream failed.');
      }
      default:
        break;
    }
  }

  function appendMessage(role, initialText = '') {
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
    bubble.textContent = initialText;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    messagesContainer.appendChild(wrapper);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return { wrapper, bubble, text: initialText, sources: [] };
  }

  function renderSources(bubble, sources) {
    const list = document.createElement('ul');
    list.className = 'chat-sources';
    sources.forEach((source) => {
      const item = document.createElement('li');
      item.textContent = `Source ${source.citation}: ${source.original_name || source.filename || 'Unknown file'}`;
      list.appendChild(item);
    });
    bubble.appendChild(list);
  }

  async function loadHistory() {
    if (!historySidebar) return;
    try {
      const response = await fetch('/api/chat/history');
      if (!response.ok) throw new Error('Failed to load history');
      const data = await response.json();
      renderHistory(data.history || []);
    } catch (error) {
      console.error('History load error:', error);
    }
  }

  function renderHistory(history = []) {
    if (!historySidebar) return;
    historySidebar.innerHTML = '';

    if (!history.length) {
      historySidebar.innerHTML = '<p class="text-white-50 mb-0">No interactions yet.</p>';
      return;
    }

    history
      .slice(-10)
      .reverse()
      .forEach((entry) => {
        const card = document.createElement('div');
        card.className = `history-entry history-${entry.role}`;
        card.innerHTML = `
          <small class="d-block text-white-50">${entry.role === 'assistant' ? 'Assistant' : 'You'} · ${formatTimestamp(entry.timestamp)}</small>
          <div class="history-content">${entry.content}</div>
        `;
        historySidebar.appendChild(card);
      });
  }

  function formatTimestamp(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleTimeString();
    } catch {
      return '';
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
