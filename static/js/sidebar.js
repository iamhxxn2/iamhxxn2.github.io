// ============================================
// Category tree toggle
// ============================================
document.querySelectorAll('.category-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    const subcategory = toggle.parentElement.querySelector('.subcategory-list');
    if (subcategory) {
      subcategory.classList.toggle('open');
    }
  });
});

// ============================================
// Fuse.js Sidebar Search
// ============================================
let fuse = null;
const searchInput = document.getElementById('sidebar-search-input');
const searchResults = document.getElementById('sidebar-search-results');

async function initSearch() {
  if (fuse) return;
  try {
    const response = await fetch('/index.json');
    const data = await response.json();
    fuse = new Fuse(data, {
      keys: ['title', 'summary', 'content'],
      threshold: 0.3,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  } catch (e) {
    console.error('Search init failed:', e);
  }
}

if (searchInput) {
  searchInput.addEventListener('focus', initSearch);

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (!query || !fuse) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      return;
    }

    const results = fuse.search(query).slice(0, 8);
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span style="color:var(--secondary);font-size:0.85rem;">검색 결과가 없습니다</span></div>';
      searchResults.classList.add('active');
      return;
    }

    searchResults.innerHTML = results.map(r => {
      const item = r.item;
      return `<div class="search-result-item">
        <a href="${item.permalink}">${item.title}</a>
        <div class="search-result-section">${item.section || ''}</div>
      </div>`;
    }).join('');
    searchResults.classList.add('active');
  });

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar-search')) {
      searchResults.classList.remove('active');
    }
  });
}
