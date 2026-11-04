/* --- Config & State --- */
document.documentElement.classList.add('js');

const Config = {
  quotes: [
  "Keep it simple, stupid.",
  "Don’t repeat yourself.",
  "It works on my machine.",
  "Deleted code is debugged code.",
  "Talk is cheap. Show me the code.",
  "Code never lies, comments sometimes do.",
  "Stay hungry, stay foolish."
  ],
  api: {
    projects: 'projects.json'
  },
};

const State = {
  projects: []
};

/* --- Utilities --- */
async function fetchWithRetry(url, retries = 2, delay = 800) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, retries - 1, delay);
    }
    throw error;
  }
}

function getProjectImage(project) {
  if (project.demo && project.demo.type === 'image' && project.demo.url) {
    return project.demo.url;
  }
  
  return `assets/images/${project.id}-showcase.png`; 
}

/* --- Modal Manager --- */
class ModalManager {
  constructor() {
    this.modal = document.getElementById('project-modal');
    this.closeBtn = document.getElementById('modal-close');
    this.title = document.getElementById('modal-title');
    this.tag = document.getElementById('modal-tag');
    this.body = document.getElementById('modal-body');
    this.githubLink = document.getElementById('modal-github-link');
    this.demoLink = document.getElementById('modal-demo-link');
    
    this.closeBtn.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => { if(e.target === this.modal) this.close(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !this.modal.hidden) this.close(); });
  }

  open(projectId) {
    const project = State.projects.find(p => p.id === projectId);
    if (!project) return;

    this.title.textContent = project.title;
    this.tag.textContent = project.tag;
    this.githubLink.href = project.github;
    
    // Giữ layout ổn định bằng cách thay đổi opacity / pointerEvents thay vì ẩn luôn element
    if (project.demo && project.demo.external_url) {
      this.demoLink.href = project.demo.external_url;
      this.demoLink.style.opacity = '1';
      this.demoLink.style.pointerEvents = 'auto';
    } else {
      this.demoLink.removeAttribute('href');
      this.demoLink.style.opacity = '0.35';
      this.demoLink.style.pointerEvents = 'none';
    }
    
    let html = '';
    const s = project.story;
    if(s.reason) html += `<h4>Lý do bắt đầu</h4><p>${s.reason}</p>`;
    if(s.challenges) html += `<h4>Thử thách gặp phải</h4><ul>${s.challenges.map(c => `<li>${c}</li>`).join('')}</ul>`;
    if(s.solutions) html += `<h4>Giải pháp của mình</h4><ul>${s.solutions.map(sol => `<li>${sol}</li>`).join('')}</ul>`;
    if(s.lessons) html += `<h4>Bài học rút ra</h4><ul>${s.lessons.map(l => `<li>${l}</li>`).join('')}</ul>`;

    this.body.innerHTML = html;
    this.modal.hidden = false;
    document.body.style.overflow = 'hidden'; // Lock scroll
  }

  close() {
    this.modal.hidden = true;
    document.body.style.overflow = '';
    this.body.innerHTML = '';
  }
}

const modalManager = new ModalManager();

/* --- Renderers --- */
function renderProjects() {
  const container = document.getElementById('projects-container');
  if (!State.projects.length) { container.innerHTML = '<p>Không tải được dự án.</p>'; return; }
  
  // Gắn index để random màu xác định
  const html = State.projects.map((p, index) => {
    const colors = ['var(--sky)', 'var(--amber)', 'var(--mint)'];
    const underlineColor = colors[index % colors.length];    

    let mediaHtml = '';
    if (p.demo && p.demo.type === 'video') {
      mediaHtml = `<video class="project-media" src="${p.demo.url}" poster="assets/images/${p.id}-poster.jpg" preload="metadata" autoplay loop muted playsinline></video>`;
    } else {
      const imgSrc = getProjectImage(p);
      mediaHtml = `<img src="${imgSrc}" alt="${p.title}" loading="lazy" class="project-media" onerror="this.style.background='var(--border)';this.removeAttribute('src')">`;
    }

    return `
      <article class="project-row fade-in-section">
        <div class="project-image-col">
          <div class="project-img-wrapper">
            ${mediaHtml}
          </div>
        </div>
        <div class="project-text-col">
          <h3 class="project-title">
            <span class="title-text">${p.title}</span>
            <div class="title-underline" style="background-color: ${underlineColor}"></div>
          </h3>
          <p class="project-cat">${p.tag}</p>
          <p class="project-desc">${p.description}</p>
          <button class="btn-story" data-id="${p.id}">READ MORE →</button>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = html;

  container.addEventListener('click', e => {
    if (e.target.classList.contains('btn-story')) {
      modalManager.open(e.target.dataset.id);
    }
  });

  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  }, { threshold: 0.25 });
  container.querySelectorAll('video').forEach(v => videoObserver.observe(v));
}

/* --- Subsystems --- */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));
}

function initNavObserver() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href').substring(1) === entry.target.id) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { threshold: 0.3, rootMargin: "-72px 0px 0px 0px" }); // Bù trừ chiều cao thanh điều hướng 72px

  sections.forEach(section => observer.observe(section));
}

/* --- App Initialization --- */
const App = {
  async init() {
    // 1. Setup Nav
    initNavObserver();

    // 2. Setup Hero Quote
    const quoteEl = document.getElementById('quote-text');
    quoteEl.textContent = Config.quotes[Math.floor(Math.random() * Config.quotes.length)];

    // 3. Fetch Data (Kèm Skeleton Loading Placeholder)
    const projectsContainer = document.getElementById('projects-container');
    projectsContainer.innerHTML = '<div class="loading-placeholder" aria-label="Đang tải..."></div>';
    
    try {
      const projRes = await fetchWithRetry(Config.api.projects);
      State.projects = projRes.projects || [];

      // 4. Render
      renderProjects();

      // 5. Init Observers post-render
      requestAnimationFrame(() => {
        initScrollReveal();
      });

    } catch (error) {
      console.error("Data load failed", error);
      projectsContainer.innerHTML = '<p>Lỗi tải dữ liệu. Vui lòng thử lại sau.</p>';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());