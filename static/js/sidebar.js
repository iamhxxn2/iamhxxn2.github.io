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
// Fuse.js Search (shared by sidebar + home)
// ============================================
let fuse = null;

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

function setupSearch(inputId, resultsId, closestSelector) {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);
  if (!input || !results) return;

  input.addEventListener('focus', initSearch);

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (!query || !fuse) {
      results.classList.remove('active');
      results.innerHTML = '';
      return;
    }

    const matches = fuse.search(query).slice(0, 8);
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-result-item"><span style="color:var(--secondary);font-size:0.85rem;">검색 결과가 없습니다</span></div>';
      results.classList.add('active');
      return;
    }

    results.innerHTML = matches.map(r => {
      const item = r.item;
      return `<div class="search-result-item">
        <a href="${item.permalink}">${item.title}</a>
        <div class="search-result-section">${item.section || ''}</div>
      </div>`;
    }).join('');
    results.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest(closestSelector)) {
      results.classList.remove('active');
    }
  });
}

// Initialize both search bars
setupSearch('sidebar-search-input', 'sidebar-search-results', '.sidebar-search');
setupSearch('home-search-input', 'home-search-results', '.home-search');
