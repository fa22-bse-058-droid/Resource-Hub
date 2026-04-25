/* =============================================
   Resource Hub — main.js
   Handles: search, filters, bookmarks, progress,
            YouTube search, skill gaps
   ============================================= */

const API = {
  BASE: '/api',
  CSRF: () => document.querySelector('[name=csrfmiddlewaretoken]')?.value
    || getCookie('csrftoken'),

  async get(path) {
    const r = await fetch(`${API.BASE}${path}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
    return r.json();
  },

  async post(path, body = {}) {
    const r = await fetch(`${API.BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': API.CSRF()
      },
      body: JSON.stringify(body)
    });
    return r;
  },

  async delete(path) {
    const r = await fetch(`${API.BASE}${path}`, {
      method: 'DELETE',
      headers: { 'X-CSRFToken': API.CSRF() }
    });
    return r;
  }
};

function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

/* ---- Loading overlay ---- */
const loading = {
  el: document.getElementById('loading-overlay'),
  show() { this.el?.classList.add('active'); },
  hide() { this.el?.classList.remove('active'); }
};

/* ---- Toast notifications ---- */
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `alert alert-${type}`;
  t.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    min-width:260px; animation:fadeUp .3s ease;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ================================================
   INDEX PAGE — search + filters + resource cards
   ================================================ */
class IndexPage {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchBtn   = document.getElementById('search-btn');
    this.categorySel = document.getElementById('filter-category');
    this.levelSel    = document.getElementById('filter-level');
    this.platformSel = document.getElementById('filter-platform');
    this.typeSel     = document.getElementById('filter-type');
    this.resultsGrid = document.getElementById('resources-grid');
    this.resultsCount= document.getElementById('results-count');
    this.ytGrid      = document.getElementById('yt-grid');
    this.ytSection   = document.getElementById('yt-section');
    this.ytSearchBtn = document.getElementById('yt-search-btn');

    if (!this.searchInput) return;
    this.init();
  }

  init() {
    // Search on enter or button
    this.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.runSearch();
    });
    this.searchBtn?.addEventListener('click', () => this.runSearch());

    // Filter chips
    document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        const group = chip.dataset.group;
        document.querySelectorAll(`.filter-chip[data-group="${group}"]`)
          .forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.runSearch();
      });
    });

    // Selects auto-search
    [this.categorySel, this.levelSel, this.platformSel, this.typeSel]
      .filter(Boolean)
      .forEach(el => el.addEventListener('change', () => this.runSearch()));

    // YouTube search button
    this.ytSearchBtn?.addEventListener('click', () => {
      const q = this.searchInput.value.trim();
      if (q) this.runYouTubeSearch(q);
    });

    // Initial load
    this.runSearch();
  }

  buildParams() {
    const p = new URLSearchParams();
    const q = this.searchInput?.value.trim();
    if (q) p.set('search', q);
    if (this.categorySel?.value) p.set('category', this.categorySel.value);
    if (this.levelSel?.value)    p.set('level',    this.levelSel.value);
    if (this.platformSel?.value) p.set('platform', this.platformSel.value);
    if (this.typeSel?.value)     p.set('resource_type', this.typeSel.value);

    // Active filter chips
    document.querySelectorAll('.filter-chip.active[data-value]').forEach(chip => {
      p.set(chip.dataset.filter, chip.dataset.value);
    });

    return p.toString();
  }

  async runSearch() {
    loading.show();
    try {
      const params = this.buildParams();
      const data = await API.get(`/resources/?${params}`);
      const results = Array.isArray(data) ? data : (data.results ?? []);
      this.renderResources(results);
      if (this.resultsCount)
        this.resultsCount.textContent = `${results.length} resource${results.length !== 1 ? 's' : ''}`;
    } catch (e) {
      console.error(e);
      toast('Failed to load resources', 'error');
    } finally {
      loading.hide();
    }
  }

  renderResources(list) {
    if (!this.resultsGrid) return;
    if (!list.length) {
      this.resultsGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🔍</div>
          <h3>No resources found</h3>
          <p>Try different keywords or remove some filters</p>
        </div>`;
      return;
    }
    this.resultsGrid.innerHTML = list.map((r, i) => resourceCardHTML(r, i)).join('');
    attachBookmarkListeners(this.resultsGrid);
    attachProgressListeners(this.resultsGrid);
  }

  async runYouTubeSearch(q) {
    if (!this.ytGrid) return;
    loading.show();
    try {
      const data = await API.get(`/youtube/search/?q=${encodeURIComponent(q)}`);
      const videos = data.videos ?? data ?? [];
      if (this.ytSection) this.ytSection.style.display = 'block';
      this.ytGrid.innerHTML = videos.length
        ? videos.map(v => `
            <a class="yt-card" href="https://youtube.com/watch?v=${v.video_id}" target="_blank" rel="noopener">
              <img class="yt-thumb" src="${v.thumbnail}" alt="${escapeHTML(v.title)}"
                   onerror="this.parentElement.innerHTML='<div class=yt-thumb-placeholder>▶️</div>'">
              <div class="yt-card-body">
                <div class="yt-title">${escapeHTML(v.title)}</div>
                <div class="yt-channel">${escapeHTML(v.channel || '')}</div>
              </div>
            </a>`).join('')
        : '<p style="color:var(--text-muted);font-size:13px">No YouTube results found.</p>';
    } catch (e) {
      toast('YouTube search unavailable', 'error');
    } finally {
      loading.hide();
    }
  }
}

/* ================================================
   BOOKMARKS PAGE
   ================================================ */
class BookmarksPage {
  constructor() {
    this.grid = document.getElementById('bookmarks-grid');
    if (!this.grid) return;
    this.load();
  }

  async load() {
    loading.show();
    try {
      const data = await API.get('/bookmarks/');
      const list = Array.isArray(data) ? data : (data.results ?? []);
      if (!list.length) {
        this.grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">🔖</div>
            <h3>No bookmarks yet</h3>
            <p>Start exploring resources and save the ones you like</p>
            <a href="/" class="btn-primary" style="margin-top:16px;display:inline-flex">Browse Resources</a>
          </div>`;
        return;
      }
      // bookmarks API returns [{resource: {...}}, ...]
      const resources = list.map(b => b.resource ?? b);
      this.grid.innerHTML = resources.map((r, i) => resourceCardHTML(r, i)).join('');
      attachBookmarkListeners(this.grid);
    } catch (e) {
      toast('Failed to load bookmarks', 'error');
    } finally {
      loading.hide();
    }
  }
}

/* ================================================
   SKILL GAPS PAGE
   ================================================ */
class SkillGapsPage {
  constructor() {
    this.cloud   = document.getElementById('skills-cloud');
    this.input   = document.getElementById('skill-input');
    this.addBtn  = document.getElementById('add-skill-btn');
    this.recGrid = document.getElementById('skill-rec-grid');
    if (!this.cloud) return;
    this.skills = [];
    this.load();
    this.addBtn?.addEventListener('click', () => this.addSkill());
    this.input?.addEventListener('keydown', e => { if (e.key === 'Enter') this.addSkill(); });
  }

  async load() {
    try {
      const data = await API.get('/skill-gaps/');
      this.skills = Array.isArray(data) ? data : (data.results ?? []);
      this.render();
      if (this.skills.length) this.loadRecs();
    } catch (e) { console.error(e); }
  }

  render() {
    if (!this.cloud) return;
    if (!this.skills.length) {
      this.cloud.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No skill gaps added yet.</p>';
      return;
    }
    this.cloud.innerHTML = this.skills.map(s => `
      <span class="skill-tag" data-id="${s.id}">
        ${escapeHTML(s.skill_name)}
        <button class="remove-btn" onclick="skillGapsPage.removeSkill(${s.id})">×</button>
      </span>`).join('');
  }

  async addSkill() {
    const name = this.input?.value.trim();
    if (!name) return;
    try {
      const r = await API.post('/skill-gaps/', { skill_name: name });
      if (r.ok) {
        this.input.value = '';
        await this.load();
        toast(`Added: ${name}`, 'success');
      } else {
        const err = await r.json();
        toast(err.skill_name?.[0] || 'Could not add skill', 'error');
      }
    } catch (e) { toast('Error adding skill', 'error'); }
  }

  async removeSkill(id) {
    try {
      const r = await API.delete(`/skill-gaps/${id}/`);
      if (r.ok) {
        this.skills = this.skills.filter(s => s.id !== id);
        this.render();
        toast('Skill removed', 'info');
      }
    } catch (e) { toast('Error removing skill', 'error'); }
  }

  async loadRecs() {
    if (!this.recGrid) return;
    const names = this.skills.map(s => s.skill_name).join(',');
    try {
      const data = await API.get(`/resources/?search=${encodeURIComponent(names)}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      this.recGrid.innerHTML = list.slice(0, 6).map((r, i) => resourceCardHTML(r, i)).join('');
      attachBookmarkListeners(this.recGrid);
    } catch (e) { console.error(e); }
  }
}

/* ================================================
   SHARED HELPERS
   ================================================ */

function resourceCardHTML(r, i = 0) {
  const thumb = r.thumbnail_url
    ? `<img class="resource-thumbnail" src="${escapeHTML(r.thumbnail_url)}" alt="" onerror="this.outerHTML='<div class=resource-thumbnail style=font-size:24px>${platformEmoji(r.platform)}</div>'">`
    : `<div class="resource-thumbnail" style="font-size:24px">${platformEmoji(r.platform)}</div>`;

  const bookmarked = r.is_bookmarked ? 'bookmarked' : '';
  const bookmarkIcon = r.is_bookmarked ? '🔖' : '🔖';

  const progress = r.user_progress?.status ?? 'not_started';
  const progPct = progress === 'completed' ? 100 : progress === 'in_progress' ? 50 : 0;

  const tags = Array.isArray(r.tags_list) ? r.tags_list.slice(0, 3) : [];

  return `
  <div class="resource-card fade-up fade-up-${Math.min(i + 1, 5)}" data-id="${r.id}">
    <div class="resource-card-top">
      ${thumb}
      <div style="flex:1;min-width:0">
        <div class="resource-badge-row">
          ${r.is_free ? '<span class="badge badge-free">Free</span>' : '<span class="badge badge-paid">Paid</span>'}
          ${r.level ? `<span class="badge badge-level">${capitalize(r.level)}</span>` : ''}
          ${r.resource_type ? `<span class="badge badge-type">${capitalize(r.resource_type)}</span>` : ''}
        </div>
      </div>
      <button class="bookmark-btn ${bookmarked}" data-id="${r.id}" title="Bookmark">🔖</button>
    </div>

    <div class="resource-title">${escapeHTML(r.title)}</div>
    <div class="resource-desc">${escapeHTML(r.description || '')}</div>

    ${tags.length ? `<div style="display:flex;gap:5px;flex-wrap:wrap">${tags.map(t => `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);color:var(--text-muted)">#${escapeHTML(t)}</span>`).join('')}</div>` : ''}

    ${progPct > 0 ? `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
        <span>${progress === 'completed' ? '✅ Completed' : '⏳ In Progress'}</span>
        <span>${progPct}%</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${progPct}%"></div>
      </div>
    </div>` : ''}

    <div class="resource-meta">
      <span>👁 ${r.view_count ?? 0}</span>
      ${r.duration ? `<span>⏱ ${escapeHTML(r.duration)}</span>` : ''}
    </div>

    <div class="resource-footer">
      <span class="platform-pill">${escapeHTML(r.platform || 'Web')}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <select class="progress-sel" data-id="${r.id}" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border-glass);border-radius:var(--radius-sm);color:var(--text-muted);font-size:11px;outline:none;cursor:pointer">
          <option value="not_started" ${progress==='not_started'?'selected':''}>Not Started</option>
          <option value="in_progress" ${progress==='in_progress'?'selected':''}>In Progress</option>
          <option value="completed"   ${progress==='completed'?'selected':''}>Completed</option>
        </select>
        <a class="btn-visit" href="${escapeHTML(r.url)}" target="_blank" rel="noopener">Visit ↗</a>
      </div>
    </div>
  </div>`;
}

function attachBookmarkListeners(container) {
  container.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const isBookmarked = btn.classList.contains('bookmarked');
      try {
        let r;
        if (isBookmarked) {
          r = await API.delete(`/resources/${id}/bookmark/`);
        } else {
          r = await API.post(`/resources/${id}/bookmark/`);
        }
        if (r.ok) {
          btn.classList.toggle('bookmarked');
          toast(isBookmarked ? 'Bookmark removed' : 'Bookmarked! 🔖', isBookmarked ? 'info' : 'success');
        }
      } catch (e) { toast('Login required to bookmark', 'error'); }
    });
  });
}

function attachProgressListeners(container) {
  container.querySelectorAll('.progress-sel').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.dataset.id;
      try {
        const r = await API.post(`/resources/${id}/progress/`, { status: sel.value });
        if (r.ok) toast('Progress updated ✓', 'success');
      } catch (e) { toast('Login required', 'error'); }
    });
  });
}

function platformEmoji(platform) {
  const map = {
    youtube: '▶️', coursera: '🎓', udemy: '🔥', freecodecamp: '💻',
    kaggle: '📊', github: '🐙', google: '🌐', amazon: '☁️',
    microsoft: '🪟', edx: '🏛️', odin: '⚔️', flutter: '💙'
  };
  return map[(platform || '').toLowerCase()] || '📚';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/* ---- Boot ---- */
let skillGapsPage;
document.addEventListener('DOMContentLoaded', () => {
  new IndexPage();
  new BookmarksPage();
  skillGapsPage = new SkillGapsPage();
});