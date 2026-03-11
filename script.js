/*
  SYLLABIQ — SCRIPT.JS
  Input:  PDF upload only
  Output: skills, projects, certifications, career paths
*/

const API_URL = 'https://syllabiq-backend-production-d03a.up.railway.app/map';

// ---- REFS ----
const dropZone = document.getElementById('dropZone');
const syllabusInput = document.getElementById('syllabusInput');
const browseBtn = document.getElementById('browseBtn');
const dropIdle = document.getElementById('dropIdle');
const dropSuccess = document.getElementById('dropSuccess');
const fileName = document.getElementById('fileName');
const changeFile = document.getElementById('changeFile');
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
let timers = [];

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

// ---- MAP CLICK ----
mapBtn.addEventListener('click', async () => {
  if (!selectedFile) { showToast('Please upload your syllabus PDF first.'); return; }

  startLoading();

  const form = new FormData();
  form.append('syllabus', selectedFile);
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
  renderResources(data.learning_resources || []);
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
  const icons = { 'Google': '🔵', 'AWS': '🟠', 'Microsoft': '🟦', 'Meta': '🔷', 'Oracle': '🔴', 'Cisco': '🌐', 'IBM': '🔷', 'Coursera': '🎓', 'Udemy': '🟣' };
  el.innerHTML = certs.map(c => {
    const k = Object.keys(icons).find(k => (c.provider || '').includes(k));
    return `
    <div class="cert-card">
      <div class="cert-icon">${k ? icons[k] : '📜'}</div>
      <div>
        <div class="cert-name">${x(c.name)}</div>
        <div class="cert-provider">${x(c.provider)}</div>
        <div class="cert-desc">${x(c.description)}</div>
        <span class="cert-rel">${x(c.relevance || 'Relevant')}</span>
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

// ---- LEARNING RESOURCES ----
function renderResources(resources) {
  const el = document.getElementById('resourcesGrid');
  if (!resources.length) { el.innerHTML = empty('No resources found.'); return; }

  const platformClass = (p) => {
    p = (p || '').toLowerCase();
    if (p.includes('youtube')) return 'youtube';
    if (p.includes('coursera')) return 'coursera';
    if (p.includes('udemy')) return 'udemy';
    if (p.includes('freecodecamp')) return 'freecodecamp';
    return 'default';
  };

  const typeClass = (t) => {
    t = (t || '').toLowerCase();
    if (t.includes('free with')) return 'freecert';
    if (t.includes('free')) return 'free';
    return 'paid';
  };

  const searchURL = (hint) =>
    'https://www.google.com/search?q=' + encodeURIComponent(hint || '');

  el.innerHTML = resources.map(r => `
    <div class="resource-card">
      <div class="resource-top">
        <span class="resource-platform ${platformClass(r.platform)}">${x(r.platform)}</span>
        <span class="resource-type ${typeClass(r.type)}">${x(r.type || 'Free')}</span>
      </div>
      <div class="resource-title">${x(r.title)}</div>
      <div class="resource-skill">For: ${x(r.skill)}</div>
      <div class="resource-why">${x(r.why)}</div>
      ${r.url_hint ? `<a class="resource-search" href="${searchURL(r.url_hint)}" target="_blank" rel="noopener">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        Find this resource
      </a>` : ''}
    </div>`).join('');
}

// ---- PDF DOWNLOAD ----
document.getElementById('downloadBtn').addEventListener('click', () => {
  // Temporarily force all rcard opacities to 1 for print
  document.querySelectorAll('.rcard').forEach(c => {
    c.style.opacity = '1';
    c.style.transform = 'none';
  });
  window.print();
});

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