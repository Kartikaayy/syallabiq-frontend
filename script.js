/*
  SYLLABIQ — SCRIPT.JS
  Input:  PDF upload OR typed topics
  Output: skills, projects, certifications (with links), career paths
*/

const API_URL = 'https://syallabiq-production.up.railway.app';

// ---- REFS ----
const dropZone = document.getElementById('dropZone');
const syllabusInput = document.getElementById('syllabusInput');
const browseBtn = document.getElementById('browseBtn');
const dropIdle = document.getElementById('dropIdle');
const dropSuccess = document.getElementById('dropSuccess');
const fileName = document.getElementById('fileName');
const changeFile = document.getElementById('changeFile');
const topicsTextarea = document.getElementById('topicsTextarea');
const topicsCount = document.getElementById('topicsCount');
const mapBtn = document.getElementById('mapBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const btnArrow = document.getElementById('btnArrow');
const analyzeNote = document.getElementById('analyzeNote');
const skeletonSection = document.getElementById('skeletonSection');
const resultsSection = document.getElementById('resultsSection');
const errorToast = document.getElementById('errorToast');
const toastMsg = document.getElementById('toastMsg');
const resetBtn = document.getElementById('resetBtn');

let selectedFile = null;
let activeTab = 'pdf'; // 'pdf' | 'text'
let timers = [];

// ---- TAB SWITCH ----
window.switchTab = function (tab) {
  activeTab = tab;
  document.getElementById('pdfPanel').classList.toggle('hidden', tab !== 'pdf');
  document.getElementById('textPanel').classList.toggle('hidden', tab !== 'text');
  document.getElementById('tabPdf').classList.toggle('active', tab === 'pdf');
  document.getElementById('tabText').classList.toggle('active', tab === 'text');
};

// ---- DRAG & DROP ----
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', e => {
  if (e.target === dropZone || dropIdle.contains(e.target)) syllabusInput.click();
});
browseBtn.addEventListener('click', e => { e.stopPropagation(); syllabusInput.click(); });
syllabusInput.addEventListener('change', () => { if (syllabusInput.files[0]) handleFile(syllabusInput.files[0]); });
changeFile.addEventListener('click', e => {
  e.stopPropagation(); selectedFile = null; syllabusInput.value = '';
  dropIdle.classList.remove('hidden'); dropSuccess.classList.add('hidden');
});

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) { showToast('Only PDF files are accepted.'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('File too large. Max 10MB.'); return; }
  selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  dropIdle.classList.add('hidden');
  dropSuccess.classList.remove('hidden');
}

// ---- TOPICS CHAR COUNT ----
topicsTextarea.addEventListener('input', () => {
  const len = topicsTextarea.value.length;
  topicsCount.textContent = len.toLocaleString() + ' characters';
});

// ---- MAP CLICK ----
mapBtn.addEventListener('click', async () => {
  const topics = topicsTextarea.value.trim();

  if (activeTab === 'pdf' && !selectedFile) {
    showToast('Please upload your syllabus PDF first.'); return;
  }
  if (activeTab === 'text' && topics.length < 30) {
    showToast('Please type at least a few syllabus topics.'); return;
  }

  startLoading();

  const form = new FormData();
  if (activeTab === 'pdf' && selectedFile) form.append('syllabus', selectedFile);
  if (activeTab === 'text' && topics) form.append('topics', topics);

  const cn = document.getElementById('courseName').value.trim();
  const cs = document.getElementById('courseStream').value;
  const cg = document.getElementById('careerGoal').value.trim();
  if (cn) form.append('courseName', cn);
  if (cs) form.append('courseStream', cs);
  if (cg) form.append('careerGoal', cg);

  try {
    const res = await fetch(API_URL, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    stopLoading();
    renderResults(data);
  } catch (err) {
    stopLoading();
    showToast(err.message.includes('fetch') ? 'Cannot connect to backend.' : (err.message || 'Analysis failed.'));
    console.error(err);
  }
});

function startLoading() {
  mapBtn.disabled = true;
  btnText.classList.add('hidden');
  btnArrow.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  skeletonSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  skeletonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  timers.push(setTimeout(() => analyzeNote.textContent = 'Connecting to server...', 3000));
  timers.push(setTimeout(() => analyzeNote.textContent = 'AI is reading your syllabus...', 8000));
  timers.push(setTimeout(() => analyzeNote.textContent = 'Mapping skills and career paths...', 16000));
  timers.push(setTimeout(() => analyzeNote.textContent = 'Almost there, generating insights...', 25000));
}
function stopLoading() {
  mapBtn.disabled = false;
  btnText.classList.remove('hidden');
  btnArrow.classList.remove('hidden');
  btnSpinner.classList.add('hidden');
  skeletonSection.classList.add('hidden');
  timers.forEach(clearTimeout); timers = [];
  analyzeNote.textContent = 'Analysis takes 15–25 seconds';
}

// ---- RESET ----
resetBtn.addEventListener('click', () => {
  resultsSection.classList.add('hidden');
  selectedFile = null; syllabusInput.value = '';
  topicsTextarea.value = ''; topicsCount.textContent = '0 characters';
  document.getElementById('courseName').value = '';
  document.getElementById('courseStream').value = '';
  document.getElementById('careerGoal').value = '';
  dropIdle.classList.remove('hidden'); dropSuccess.classList.add('hidden');
  document.getElementById('tool').scrollIntoView({ behavior: 'smooth' });
});

// ---- RENDER ----
function renderResults(data) {
  renderSkills(data.skills || []);
  renderProjects(data.project_ideas || []);
  renderCerts(data.certifications || []);
  renderCareers(data.career_paths || []);
  renderSummary(data.overall_summary || '');
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSkills(skills) {
  const el = document.getElementById('skillsGrid');
  if (!skills.length) { el.innerHTML = empty('No skills detected.'); return; }
  el.innerHTML = skills.map(s => `
    <div class="skill-card">
      <div class="skill-name">${x(s.skill)}</div>
      <div class="skill-domain">${x(s.domain || '')}</div>
      <span class="skill-level ${(s.level || 'beginner').toLowerCase()}">${x(s.level || 'Beginner')}</span>
    </div>`).join('');
}

function renderProjects(projects) {
  const el = document.getElementById('projectsList');
  if (!projects.length) { el.innerHTML = empty('No projects generated.'); return; }
  el.innerHTML = projects.map(p => `
    <div class="proj-card">
      <div class="proj-title">${x(p.title)}</div>
      <span class="proj-diff ${(p.difficulty || 'beginner').toLowerCase()}">${x(p.difficulty || 'Beginner')}</span>
      <div class="proj-desc">${x(p.description)}</div>
      <div class="proj-skills">${(p.skills_used || []).map(s => `<span class="proj-skill">${x(s)}</span>`).join('')}</div>
    </div>`).join('');
}

function renderCerts(certs) {
  const el = document.getElementById('certsList');
  if (!certs.length) { el.innerHTML = empty('No certifications found.'); return; }
  const icons = {
    'Google': '🔵', 'AWS': '🟠', 'Microsoft': '🟦', 'Meta': '🔷',
    'Oracle': '🔴', 'Cisco': '🌐', 'IBM': '🔷', 'Coursera': '🎓', 'Udemy': '🟣'
  };
  el.innerHTML = certs.map(c => {
    const k = Object.keys(icons).find(k => (c.provider || '').includes(k));
    const hasLink = c.url && c.url.startsWith('http');
    return `
    <div class="cert-card ${hasLink ? 'cert-clickable' : ''}" ${hasLink ? `onclick="window.open('${x(c.url)}','_blank')"` : ''}>
      <div class="cert-icon">${k ? icons[k] : '📜'}</div>
      <div class="cert-content">
        <div class="cert-name">${x(c.name)}</div>
        <div class="cert-provider">${x(c.provider)}</div>
        <div class="cert-desc">${x(c.description)}</div>
        <div class="cert-footer">
          <span class="cert-rel">${x(c.relevance || 'Relevant')}</span>
          ${hasLink ? `<span class="cert-link-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Open Course
          </span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderCareers(careers) {
  const el = document.getElementById('careersGrid');
  if (!careers.length) { el.innerHTML = empty('No career paths found.'); return; }
  el.innerHTML = careers.map(c => `
    <div class="career-card">
      <div class="career-top">
        <div class="career-role">${x(c.role)}</div>
        <span class="career-demand ${(c.demand || 'medium').toLowerCase()}">${x(c.demand || 'Medium')}</span>
      </div>
      <div class="career-desc">${x(c.description)}</div>
      ${c.salary_range ? `<div class="career-salary">💰 ${x(c.salary_range)}</div>` : ''}
      <div class="career-skills">${(c.key_skills || []).map(s => `<span class="career-skill">${x(s)}</span>`).join('')}</div>
    </div>`).join('');
}

function renderSummary(text) {
  document.getElementById('summaryBody').innerHTML = `<p>${x(text)}</p>`;
}

// ---- HELPERS ----
function empty(msg) { return `<p style="color:var(--text-dim);font-size:0.83rem">${msg}</p>`; }
function x(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showToast(msg) {
  toastMsg.textContent = msg;
  errorToast.classList.remove('hidden');
  setTimeout(() => errorToast.classList.add('hidden'), 4000);
}

// ---- SCROLL REVEAL ----
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }
  });
}, { threshold: 0.07 });
document.querySelectorAll('.rcard').forEach(c => {
  c.style.opacity = '0'; c.style.transform = 'translateY(22px)';
  c.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  io.observe(c);
});
