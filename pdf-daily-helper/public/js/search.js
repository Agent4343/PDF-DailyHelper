document.addEventListener('DOMContentLoaded', function() {
  const searchForm = document.getElementById('searchForm');
  const searchResults = document.getElementById('searchResults');
  const pagination = document.getElementById('pagination');
  let currentPage = 1;
  const resultsPerPage = 10;

  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    currentPage = 1;
    performSearch();
  });

  function performSearch() {
    console.log('Performing search with form data:', {
      query: document.getElementById('searchQuery').value,
      dateFilter: document.getElementById('dateFilter').value,
      fileNameFilter: document.getElementById('fileNameFilter').value,
      pageNumberFilter: document.getElementById('pageNumberFilter').value
    });
    console.log('Search initiated for query:', document.getElementById('searchQuery').value);
    const query = document.getElementById('searchQuery').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const fileNameFilter = document.getElementById('fileNameFilter').value;
    const pageNumberFilter = document.getElementById('pageNumberFilter').value;

    const searchParams = new URLSearchParams({
      query: query,
      page: currentPage,
      limit: resultsPerPage,
      dateFilter: dateFilter,
      fileNameFilter: fileNameFilter,
      pageNumberFilter: pageNumberFilter
    });

    fetch(`/api/search?${searchParams.toString()}`)
      .then(response => response.json())
      .then(data => {
        displaySearchResults(data);
        displayPagination(data);
      })
      .catch(error => {
        console.error('Error:', error);
        console.error(error.stack);
        searchResults.innerHTML = '<p class="text-danger">An error occurred while searching. Please try again.</p>';
      });
  }

  function displaySearchResults(data) {
    if (data.results.length === 0) {
      searchResults.innerHTML = '<p>No results found.</p>';
      return;
    }

    let resultsHtml = '<h2>Search Results</h2><ul class="list-group">';
    data.results.forEach(result => {
      resultsHtml += `
        <li class="list-group-item">
          <h5>${result.pdfId.originalName}</h5>
          <p>${highlightSearchTerms(result.content.substring(0, 200), document.getElementById('searchQuery').value)}...</p>
          <small>Page: ${result.pageNumber} | Uploaded: ${new Date(result.createdAt).toLocaleDateString()}</small>
        </li>
      `;
    });
    resultsHtml += '</ul>';

    searchResults.innerHTML = resultsHtml;
  }

  function displayPagination(data) {
    const totalPages = data.totalPages;
    let paginationHtml = '';

    for (let i = 1; i <= totalPages; i++) {
      paginationHtml += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    pagination.innerHTML = paginationHtml;

    pagination.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        currentPage = parseInt(this.dataset.page);
        performSearch();
      });
    });
  }

  function highlightSearchTerms(text, searchQuery) {
    const words = searchQuery.split(' ').filter(word => word.length > 0);
    let highlightedText = text;

    words.forEach(word => {
      const regex = new RegExp(word, 'gi');
      highlightedText = highlightedText.replace(regex, match => `<mark>${match}</mark>`);
    });

    return highlightedText;
  }
});