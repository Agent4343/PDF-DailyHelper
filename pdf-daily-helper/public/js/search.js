document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const pagination = document.getElementById('pagination');

  if (!searchForm || !searchResults || !pagination) {
    return;
  }

  let currentPage = 1;
  const resultsPerPage = 10;

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    currentPage = 1;
    performSearch();
  });

  async function performSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) {
      renderMessage('Please enter a search query.');
      return;
    }

    const searchParams = new URLSearchParams({
      query,
      page: currentPage,
      limit: resultsPerPage,
      dateFilter: document.getElementById('dateFilter').value,
      fileNameFilter: document.getElementById('fileNameFilter').value,
      pageNumberFilter: document.getElementById('pageNumberFilter').value
    });

    try {
      const response = await fetch(`/api/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('An error occurred while searching.');
      }

      const data = await response.json();
      renderResults(data.results, query);
      renderPagination(data.totalPages || 0);
    } catch (error) {
      console.error('Error performing search:', error);
      renderMessage('An error occurred while searching. Please try again.');
    }
  }

  function renderResults(results, query) {
    if (!Array.isArray(results) || results.length === 0) {
      renderMessage('No results found.');
      return;
    }

    searchResults.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'list-group';

    results.forEach((result) => {
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item';

      const title = document.createElement('h5');
      title.textContent = result.originalName || result.filename || 'Untitled PDF';

      const snippet = document.createElement('p');
      const snippetFragment = createHighlightedSnippet(result.content || '', query);
      snippet.appendChild(snippetFragment);
      snippet.appendChild(document.createTextNode('...'));

      const meta = document.createElement('small');
      const uploadedDate = result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'Unknown date';
      meta.textContent = `Page: ${result.pageNumber} | Uploaded: ${uploadedDate}`;

      listItem.appendChild(title);
      listItem.appendChild(snippet);
      listItem.appendChild(meta);

      list.appendChild(listItem);
    });

    searchResults.appendChild(list);
  }

  function renderPagination(totalPages) {
    pagination.innerHTML = '';
    if (totalPages <= 1) {
      return;
    }

    for (let i = 1; i <= totalPages; i += 1) {
      const pageItem = document.createElement('li');
      pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;

      const link = document.createElement('a');
      link.className = 'page-link';
      link.href = '#';
      link.textContent = i;
      link.dataset.page = i.toString();
      link.addEventListener('click', (event) => {
        event.preventDefault();
        currentPage = Number(link.dataset.page);
        performSearch();
      });

      pageItem.appendChild(link);
      pagination.appendChild(pageItem);
    }
  }

  function renderMessage(message) {
    searchResults.innerHTML = `<p>${message}</p>`;
    pagination.innerHTML = '';
  }

  function createHighlightedSnippet(text, query) {
    const snippet = text.substring(0, 200);
    const fragment = document.createDocumentFragment();
    const terms = query.split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
      fragment.appendChild(document.createTextNode(snippet));
      return fragment;
    }

    const regex = new RegExp(terms.map(escapeRegex).join('|'), 'gi');
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(snippet)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(snippet.slice(lastIndex, match.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < snippet.length) {
      fragment.appendChild(document.createTextNode(snippet.slice(lastIndex)));
    }

    return fragment;
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});
