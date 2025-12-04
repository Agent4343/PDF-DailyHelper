document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const pagination = document.getElementById('pagination');
  const activeFiltersContainer = document.getElementById('activeFilters');

  if (!searchForm || !searchResults || !pagination) {
    return;
  }

  let currentPage = 1;
  const resultsPerPage = 10;

  renderMessage('Run a search to see results.');
  updateActiveFilters();

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    currentPage = 1;
    performSearch();
  });

  async function performSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    const filters = getFilters();

    if (!query) {
      renderMessage('Please enter a search query.');
      return;
    }

    updateActiveFilters(filters);
    showSkeleton();

    const searchParams = new URLSearchParams({
      query,
      page: currentPage,
      limit: resultsPerPage,
      ...filters
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

  function getFilters() {
    return {
      dateFilter: document.getElementById('dateFilter').value,
      fileNameFilter: document.getElementById('fileNameFilter').value.trim(),
      pageNumberFilter: document.getElementById('pageNumberFilter').value
    };
  }

  function showSkeleton() {
    searchResults.innerHTML = '<div class="skeleton mb-3" style="height: 140px;"></div>';
  }

  function renderResults(results, query) {
    if (!Array.isArray(results) || results.length === 0) {
      renderMessage('No results found.');
      return;
    }

    searchResults.innerHTML = '';

    results.forEach((result) => {
      const card = document.createElement('article');
      card.className = 'search-results-card';

      const titleRow = document.createElement('div');
      titleRow.className = 'd-flex justify-content-between align-items-start gap-3';

      const title = document.createElement('div');
      title.innerHTML = `
        <h5 class="mb-1">${result.originalName || result.filename || 'Untitled PDF'}</h5>
        <small class="text-muted">Page ${result.pageNumber} · ${formatDate(result.createdAt)}</small>
      `;

      titleRow.appendChild(title);
      card.appendChild(titleRow);

      const snippet = document.createElement('div');
      snippet.className = 'search-snippet mt-3';
      const snippetFragment = createHighlightedSnippet(result.content || '', query);
      snippet.appendChild(snippetFragment);
      snippet.appendChild(document.createTextNode('…'));
      card.appendChild(snippet);

      searchResults.appendChild(card);
    });
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
    searchResults.innerHTML = `
      <div class="search-results-card text-center text-muted">
        ${message}
      </div>
    `;
    pagination.innerHTML = '';
  }

  function updateActiveFilters(filters = getFilters()) {
    if (!activeFiltersContainer) {
      return;
    }

    const chips = [];
    if (filters.dateFilter) {
      chips.push(createFilterChip(`Date: ${filters.dateFilter}`));
    }
    if (filters.fileNameFilter) {
      chips.push(createFilterChip(`File includes "${filters.fileNameFilter}"`));
    }
    if (filters.pageNumberFilter) {
      chips.push(createFilterChip(`Page ${filters.pageNumberFilter}`));
    }

    activeFiltersContainer.innerHTML = '';
    if (chips.length === 0) {
      activeFiltersContainer.innerHTML = '<span class="text-muted">No filters applied.</span>';
    } else {
      chips.forEach((chip) => activeFiltersContainer.appendChild(chip));
    }
  }

  function createFilterChip(label) {
    const chip = document.createElement('span');
    chip.className = 'search-filter-chip';
    chip.textContent = label;
    return chip;
  }

  function createHighlightedSnippet(text, query) {
    const snippet = text.substring(0, 220);
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

  function formatDate(value) {
    if (!value) return 'Unknown date';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  }
});
