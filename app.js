import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, push, set, onValue, query, orderByChild
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6EOM-DHJeSnufB_xHK0t8PS1ys9p730s",
  authDomain: "jaekernacanada.firebaseapp.com",
  databaseURL: "https://jaekernacanada-default-rtdb.firebaseio.com",
  projectId: "jaekernacanada",
  storageBucket: "jaekernacanada.appspot.com",
  messagingSenderId: "622271052558",
  appId: "1:622271052558:web:50aebf456a69d4814f355f",
  measurementId: "G-CHLDFWPJ4W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Only init DB if databaseURL is provided and valid
let db = null;
if (firebaseConfig.databaseURL && firebaseConfig.databaseURL.startsWith("https://")) {
  try {
    db = getDatabase(app);
    console.log("Realtime DB initialized.");
  } catch (err) {
    console.error("Realtime DB init failed:", err);
    db = null;
  }
} else {
  console.warn("Realtime Database is not enabled. Set firebaseConfig.databaseURL in app.js to enable DB features.");
}

/* ============ UI ELEMENTS ============= */
const pageAuth = document.getElementById("page-auth");
const pageDashboard = document.getElementById("page-dashboard");
const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");
const userEmailEl = document.getElementById("user-email");
const userAvatar = document.getElementById("user-avatar");
const signoutBtn = document.getElementById("signout");
const sidebar = document.getElementById("sidebar");
const sidebarCollapseBtn = document.getElementById("sidebar-collapse");

const statApps = document.getElementById("stat-apps");
const statDrafts = document.getElementById("stat-drafts");
const statChecks = document.getElementById("stat-checks");
const activityList = document.getElementById("activity-list");
const applicationsTable = document.getElementById("applications-table");

const ctaApply = document.getElementById("cta-apply");
const ctaCheck = document.getElementById("cta-check");

const modalApply = document.getElementById("modal-apply");
const modalCheck = document.getElementById("modal-check");
const applyStepsContainer = document.getElementById("apply-steps");
const applyProgressFill = document.getElementById("apply-progress");
const applyBackBtn = document.getElementById("apply-back");
const applyNextBtn = document.getElementById("apply-next");

const checkStepsContainer = document.getElementById("check-steps");
const checkBackBtn = document.getElementById("check-back");
const checkNextBtn = document.getElementById("check-next");
const checkStepIndicator = document.getElementById("check-step-indicator");

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const toggleAuth = document.getElementById("toggle-auth");
const authError = document.getElementById("auth-error");

const openProfileModalBtn = document.getElementById('open-profile-modal');
const modalProfile = document.getElementById('modal-profile');
const profileModalBody = document.getElementById('profile-modal-body');
const closeProfileModalBtn = document.getElementById('close-profile-modal');
const profileForm = document.getElementById('profile-form');
const profileStatus = document.getElementById('profile-status');

const programSearchSelect = document.getElementById('program-search-select');
const programSearchBtn = document.getElementById('program-search-btn');
const programSearchResults = document.getElementById('program-search-results');
let allPrograms = [];
let allData = [];

/* ============ STATE ============= */
let isSignUp = false;
let currentUser = null;

/* ============ AUTH ============= */
toggleAuth.addEventListener("click", () => {
  isSignUp = !isSignUp;
  authTitle.textContent = isSignUp ? "Create account" : "Sign In";
  toggleAuth.textContent = isSignUp ? "Sign In" : "Sign Up";
  authError.classList.add("hidden");
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.classList.add("hidden");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  try {
    if (isSignUp) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = err.message || "Authentication failed";
    authError.classList.remove("hidden");
  }
});

signoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

/* Auth guard */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    // show dashboard
    pageAuth.classList.add("hidden");
    pageDashboard.classList.remove("hidden");
    userEmailEl.textContent = user.email;
    userAvatar.textContent = (user.email || "U")[0].toUpperCase();
    navigateToPage("dashboard");
    if (db) attachRealtimeListeners(user.uid);
    else renderDemoStats();
  } else {
    // show auth page
    pageAuth.classList.remove("hidden");
    pageDashboard.classList.add("hidden");
    authForm.reset();
    renderDemoStats();
  }
});

/* ============ NAVIGATION ============= */
navLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    const action = btn.dataset.action;
    if (action === "openApply") openApplyModal();
    else if (action === "openCheck") openCheckModal();
    else if (page) navigateToPage(page);
    navLinks.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
  });
});

function navigateToPage(pageId) {
  pages.forEach(p => p.classList.remove("page--active"));
  const el = document.getElementById(`page-${pageId}-view`);
  if (el) el.classList.add("page--active");
  document.getElementById("page-title").textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);
}

/* Sidebar collapse */
sidebarCollapseBtn?.addEventListener("click", () => sidebar.classList.toggle("open"));

ctaApply?.addEventListener("click", openApplyModal);
ctaCheck?.addEventListener("click", openCheckModal);

/* Modal helpers */
function openApplyModal() {
  resetApplyWizard();
  modalApply.classList.remove("hidden");
  modalApply.setAttribute("aria-hidden", "false");
}
function closeApplyModal() {
  modalApply.classList.add("hidden");
  modalApply.setAttribute("aria-hidden", "true");
}
function openCheckModal() {
  resetCheckWizard();
  modalCheck.classList.remove("hidden");
  modalCheck.setAttribute("aria-hidden", "false");
}
function closeCheckModal() {
  modalCheck.classList.add("hidden");
  modalCheck.setAttribute("aria-hidden", "true");
}
function showProfileModal(profile) {
  modalProfile.classList.remove('hidden');
  modalProfile.setAttribute('aria-hidden', 'false');
  if (profile && isProfileComplete(profile)) {
    profileModalBody.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div><strong>Full Name:</strong> ${profile.fullname}</div>
        <div><strong>Date of Birth:</strong> ${profile.dob}</div>
        <div><strong>City of Birth:</strong> ${profile.citybirth}</div>
        <div><strong>Country of Origin:</strong> ${profile.countryorigin}</div>
        <div><strong>Country of Residence:</strong> ${profile.countryresidence}</div>
        <div><strong>Year of High School Completion:</strong> ${profile.highschoolyear}</div>
        <div><strong>Passport/ID Number:</strong> ${profile.idnumber}</div>
      </div>
    `;
  } else {
    profileModalBody.innerHTML = '<div class="muted">Profile incomplete. Please fill in all fields.</div>';
  }
}
function hideProfileModal() {
  modalProfile.classList.add('hidden');
  modalProfile.setAttribute('aria-hidden', 'true');
}
if (openProfileModalBtn) {
  openProfileModalBtn.addEventListener('click', () => {
    if (!currentUser || !db) return;
    const profileRef = ref(db, `profiles/${currentUser.uid}`);
    onValue(profileRef, (snapshot) => {
      const profile = snapshot.val();
      showProfileModal(profile);
    }, { onlyOnce: true });
  });
}
if (closeProfileModalBtn) {
  closeProfileModalBtn.addEventListener('click', hideProfileModal);
}
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', hideProfileModal);
});

/* backdrop close */
document.querySelectorAll(".modal-backdrop").forEach(el => {
  el.addEventListener("click", (ev) => {
    const m = ev.target.closest(".modal");
    if (!m) return;
    if (m.querySelector("#apply-steps")) closeApplyModal();
    if (m.querySelector("#check-steps")) closeCheckModal();
  });
});

/* ============ APPLY WIZARD ============= */
/* steps simplified to keep UI clean, adds autosave when DB available */
const applySteps = [
  { id:1, title:'Personal', render: applyStepPersonal },
  { id:2, title:'Academic', render: applyStepAcademic },
  { id:3, title:'Program', render: applyStepProgram },
  { id:4, title:'Finance', render: applyStepVisa },
  { id:5, title:'Documents', render: applyStepDocs },
  { id:6, title:'Review', render: applyStepReview }
];
let applyState = { step:1, form:{} };

function resetApplyWizard(){ applyState = { step:1, form:{} }; renderApplyWizard(); }
function renderApplyWizard(){
  const stepObj = applySteps.find(s=>s.id===applyState.step);
  applyStepsContainer.innerHTML = '';
  const header = document.createElement('div');
  header.innerHTML = `<strong>${stepObj.title}</strong><div class="muted">Step ${applyState.step} / ${applySteps.length}</div>`;
  applyStepsContainer.appendChild(header);
  const body = document.createElement('div'); body.className='step-body';
  body.appendChild(stepObj.render(applyState.form));
  applyStepsContainer.appendChild(body);
  const pct = Math.round(((applyState.step-1)/(applySteps.length-1))*100);
  applyProgressFill.style.width = pct + '%';
  applyBackBtn.disabled = applyState.step === 1;
  applyNextBtn.textContent = applyState.step === applySteps.length ? 'Submit Application' : 'Next';
}

applyBackBtn.addEventListener('click', ()=> {
  if (applyState.step > 1){ applyState.step--; renderApplyWizard(); } else closeApplyModal();
});

applyNextBtn.addEventListener('click', async ()=> {
  // collect some fields and validate first step
  if (applyState.step === 1) {
    const v = document.getElementById('ap-fullName')?.value || '';
    if (!v.trim()){ alert('Please enter your full legal name.'); return; }
    applyState.form.fullName = v.trim();
  }
  collectApplyStepValues(applyState.step);
  if (applyState.step < applySteps.length){ applyState.step++; renderApplyWizard(); return; }

  // final submit
  if (!currentUser && !db) {
    alert('Please sign in / configure database to submit application.');
    return;
  }
  try {
    const base = currentUser ? `applications/${currentUser.uid}` : `applications/anonymous`;
    const node = push(ref(db, base));
    await set(node, { form: applyState.form, submittedAt: Date.now(), submittedBy: currentUser?.uid || null });
    alert('Application submitted — thank you!');
    closeApplyModal();
  } catch (err) {
    console.error(err);
    alert('Failed to submit application: ' + (err.message || err));
  }
});

function collectApplyStepValues(step){
  if (step===2){
    applyState.form.educationLevel = document.getElementById('ap-educationLevel')?.value || '';
    applyState.form.lastSchool = document.getElementById('ap-lastSchool')?.value || '';
    applyState.form.gpa = document.getElementById('ap-gpa')?.value || '';
  }
  if (step===3){
    applyState.form.programLevel = document.getElementById('ap-programLevel')?.value || '';
    applyState.form.intendedProgram = document.getElementById('ap-intendedProgram')?.value || '';
    applyState.form.intake = document.getElementById('ap-intake')?.value || '';
  }
  if (step===4){
    applyState.form.funding = document.getElementById('ap-funding')?.value || '';
    applyState.form.budget = document.getElementById('ap-budget')?.value || '';
  }
  if (step===5){
    applyState.form.appliedBefore = document.getElementById('ap-appliedBefore')?.value || '';
    applyState.form.visaRefused = document.getElementById('ap-visaRefused')?.value || '';
  }
  if (step===6){
    applyState.form.documents = {
      passport: document.getElementById('ap-doc-passport')?.value || '',
      transcripts: document.getElementById('ap-doc-transcripts')?.value || ''
    };
  }
}

/* step renderers */
function applyStepPersonal(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <label>Full legal name <input id="ap-fullName" type="text" value="${form.fullName||''}" placeholder="As in passport"></label>
    <label>Preferred name <input id="ap-preferredName" type="text" value="${form.preferredName||''}"></label>
    <div style="display:flex;gap:8px">
      <label style="flex:1">Date of birth <input id="ap-dob" type="date" value="${form.dob||''}"></label>
      <label style="flex:1">Nationality <input id="ap-nationality" type="text" value="${form.nationality||''}"></label>
    </div>
  `;
  return w;
}
function applyStepAcademic(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <label>Highest level of education <input id="ap-educationLevel" type="text" value="${form.educationLevel||''}"></label>
    <label>Last school/university <input id="ap-lastSchool" type="text" value="${form.lastSchool||''}"></label>
    <label>GPA or average <input id="ap-gpa" type="text" value="${form.gpa||''}" placeholder="e.g., 3.5"></label>
  `;
  return w;
}
function applyStepProgram(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <label>Desired level <input id="ap-programLevel" type="text" value="${form.programLevel||''}"></label>
    <label>Intended program <input id="ap-intendedProgram" type="text" value="${form.intendedProgram||''}"></label>
    <label>Preferred intake <input id="ap-intake" type="text" value="${form.intake||''}" placeholder="e.g., Fall 2025"></label>
  `;
  return w;
}
function applyStepFinance(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <label>Who will fund your studies? <input id="ap-funding" type="text" value="${form.funding||''}"></label>
    <label>Estimated annual budget <input id="ap-budget" type="text" value="${form.budget||''}"></label>
  `;
  return w;
}
function applyStepVisa(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <label>Applied for Canadian study permit before?
      <select id="ap-appliedBefore"><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select>
    </label>
    <label>Been refused a visa?
      <select id="ap-visaRefused"><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select>
    </label>
  `;
  return w;
}
function applyStepDocs(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <p class="muted">You can upload files later. For now add short notes.</p>
    <label>Passport (note) <input id="ap-doc-passport" type="text" value="${(form.documents?.passport)||''}"></label>
    <label>Transcripts (note) <input id="ap-doc-transcripts" type="text" value="${(form.documents?.transcripts)||''}"></label>
  `;
  return w;
}
function applyStepReview(form){
  const w = document.createElement('div');
  w.innerHTML = `
    <h4>Review</h4>
    <div><strong>Name:</strong> ${escapeHtml(form.fullName||'—')}</div>
    <div><strong>Program:</strong> ${escapeHtml(form.intendedProgram||'—')}</div>
    <div><strong>GPA:</strong> ${escapeHtml(form.gpa||'—')}</div>
    <label style="margin-top:12px"><input id="ap-consent" type="checkbox"> I agree to Terms & Privacy</label>
  `;
  return w;
}

/* ============ ELIGIBILITY CHECKER ============ */
let checkState = { step:1, program:'', level:'', gpa:'', langTest:'', langScore:'', result:null };
let universitiesData = [];
let scholarshipsData = [];
let availablePrograms = [];
let canadaProgramsData = [];
async function loadEligibilityData() {
  try {
    const progRes = await fetch('canadafulldataset.json');
    canadaProgramsData = await progRes.json();
    availablePrograms = [...new Set(canadaProgramsData.map(p => p.Program))].sort();
    const uniRes = await fetch('universities.json');
    universitiesData = await uniRes.json();
    const schRes = await fetch('scholarships.json');
    scholarshipsData = await schRes.json();
  } catch (err) {
    universitiesData = [];
    scholarshipsData = [];
    availablePrograms = [];
    canadaProgramsData = [];
  }
}

function evaluateEligibility(program, level, gpa, langTest, langScore) {
  // Find matching programs in canadafulldataset.json
  let matches = canadaProgramsData.filter(item => item.Program === program);
  let eligible = false;
  let reasons = [];
  if (matches.length > 0) {
    eligible = true;
    matches.forEach(m => {
      if (gpa && m["Entry Requirements (summary)"] && m["Entry Requirements (summary)"].match(/([0-9]+)%/)) {
        const reqGpa = parseInt(m["Entry Requirements (summary)"].match(/([0-9]+)%/)[1]);
        if (parseFloat(gpa) < reqGpa) {
          eligible = false;
          reasons.push(`GPA below required for ${m.Program} at ${m.University}`);
        }
      }
    });
  } else {
    reasons.push('No matching program found');
  }
  // Scholarships
  let qualifiedScholarships = scholarshipsData.filter(sch => {
    return sch.Sponsor && matches.some(m => m.University && m.University.includes(sch.Sponsor)) && sch.Level && sch.Level.toLowerCase().includes(level.toLowerCase());
  });
  return {
    status: eligible ? 'Likely Eligible' : 'Not Eligible',
    reasons,
    matches,
    scholarships: qualifiedScholarships
  };
}

function resetCheckWizard(){ checkState = { step:1, program:'', level:'', gpa:'', langTest:'', langScore:'', result:null }; renderCheckWizard(); }
function renderCheckWizard(){
  checkStepsContainer.innerHTML = '';
  checkStepIndicator.textContent = `Step ${checkState.step} / 2`;
  const saveBtn = document.getElementById('check-save');
  const closeBtn = document.getElementById('check-close');
  if (checkState.step === 1){
    if (saveBtn) saveBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    const d = document.createElement('div');
    d.innerHTML = `
      <label>Program or field
        <select id="chk-program" style="width:100%;">
          <option value="">Select a program</option>
          ${availablePrograms.map(p => `<option value="${p}" ${checkState.program===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </label>
      <label>Level
        <select id="chk-level"><option value="">Select</option>
          <option ${checkState.level==='Undergraduate'?'selected':''}>Undergraduate</option>
          <option ${checkState.level==='Postgraduate'?'selected':''}>Postgraduate</option>
          <option ${checkState.level==='PhD'?'selected':''}>PhD</option>
        </select>
      </label>
      <label>GPA / Grade <input id="chk-gpa" type="text" value="${escapeHtml(checkState.gpa)}"></label>
      <label>Language test (optional) <input id="chk-lang" type="text" value="${escapeHtml(checkState.langTest)}"></label>
      <label>Score <input id="chk-score" type="text" value="${escapeHtml(checkState.langScore)}"></label>
      <button id="eligibility-check-btn" class="btn primary" style="margin-top:16px;width:100%;">Check</button>
    `;
    checkStepsContainer.appendChild(d);
    // Update program selection
    const progSelect = d.querySelector('#chk-program');
    if (progSelect) {
      progSelect.addEventListener('change', e => {
        checkState.program = e.target.value;
      });
    }
    d.querySelector('#chk-level').addEventListener('change', e => {
      checkState.level = e.target.value;
    });
    d.querySelector('#chk-gpa').addEventListener('input', e => {
      checkState.gpa = e.target.value;
    });
    d.querySelector('#chk-lang').addEventListener('input', e => {
      checkState.langTest = e.target.value;
    });
    d.querySelector('#chk-score').addEventListener('input', e => {
      checkState.langScore = e.target.value;
    });
    d.querySelector('#eligibility-check-btn').addEventListener('click', () => {
      checkState.step = 2;
      renderCheckWizard();
    });
  } else {
    if (saveBtn) saveBtn.style.display = '';
    if (closeBtn) closeBtn.style.display = '';
    // Step 2: Show result
    const d = document.createElement('div');
    const result = evaluateEligibility(checkState.program, checkState.level, checkState.gpa, checkState.langTest, checkState.langScore);
    checkState.result = result;
    if (!result) {
      d.innerHTML = `<div class="muted">No result yet. Click Check.</div>`;
    } else {
      const bg = result.status === 'Likely Eligible' ? '#ecfdf5' : '#fff7f2';
      d.innerHTML = `<div style="background:${bg};padding:12px;border-radius:10px"><strong>${result.status}</strong><div class="muted" style="margin-top:8px">${(result.reasons||[]).join(', ')}</div></div>`;
      if (result.status !== 'Likely Eligible' && result.matches && result.matches.length > 0) {
        // Show only the first minimum condition to qualify
        const m = result.matches[0];
        if (m) {
          d.innerHTML += `<h4 style="margin-top:16px;">Minimum Condition to Qualify</h4><ul><li><strong>${m.Program || ''}</strong> at ${m.University || ''}: ${m["Entry Requirements (summary)"] || 'N/A'}</li></ul>`;
        }
      }
      if (result.matches && result.matches.length > 0) {
        // Show only the first matching program
        const m = result.matches[0];
        if (m) {
          d.innerHTML += `<h4 style="margin-top:16px;">Matching Program</h4><ul><li><strong>${m.Program || ''}</strong> at <a href="${m["Primary Source / Admissions or Tuition Page"] || '#'}" target="_blank">${m.University || ''}</a> (${m.City || ''})<br>Requirements: ${m["Entry Requirements (summary)"] || 'N/A'}<br>Yearly Fee: ${m["Yearly Tuition for International Students (CAD)"] ?? 'N/A'} CAD, Application Fee: ${m["Application / Registration Fee (CAD)"] ?? 'N/A'} CAD, Deadline: ${m.Deadline || 'N/A'}</li></ul>`;
        }
      }
      if (result.scholarships && result.scholarships.length > 0) {
        // Show only the first qualified scholarship
        const s = result.scholarships[0];
        if (s) {
          d.innerHTML += `<h4 style="margin-top:16px;">Qualified Scholarship</h4><ul><li><strong>${s["Scholarship Name"] || ''}</strong> (${s.Sponsor || ''})<br>Amount: ${s.Amount || 'N/A'}, Duration: ${s.Duration || 'N/A'}<br>Eligibility: ${s.Eligibility || 'N/A'}<br>Deadline: ${s["Deadline (Approx.)"] || 'N/A'}<br><a href="${s.URL || '#'}" target="_blank">More info</a></li></ul>`;
        }
      }
    }
    checkStepsContainer.appendChild(d);
    // Save button logic
    if (saveBtn) {
      saveBtn.onclick = async function() {
        if (!db) {
          alert(`Result: ${result.status}. (To save, add databaseURL in app.js)`);
          return;
        }
        try {
          const base = currentUser ? `qualification_checks/${currentUser.uid}` : `qualification_checks/anonymous`;
          const node = push(ref(db, base));
          await set(node, { program: checkState.program, level: checkState.level, gpa: checkState.gpa, langTest: checkState.langTest, langScore: checkState.langScore, verdict: result, createdAt: Date.now(), user: currentUser?.uid || null });
          alert('Saved eligibility check — ' + result.status);
        } catch (err) {
          console.error(err);
          alert('Failed to save check: ' + (err.message||err));
        }
      };
    }
    // Close button logic
    if (closeBtn) {
      closeBtn.onclick = function() {
        closeCheckModal();
      };
    }
  }
}

/* ============ Realtime listeners (DB) ============ */
function attachRealtimeListeners(uid){
  // applications for user
  const appsRef = ref(db, `applications/${uid}`);
  onValue(appsRef, snap => {
    const data = snap.val() || {};
    const keys = Object.keys(data || {});
    statApps.textContent = keys.length;
    const items = keys.slice(-6).reverse().map(k => {
      const it = data[k];
      return { when: it.submittedAt || it.updatedAt || Date.now(), title: (it.form?.intendedProgram || "Application"), note: (it.form?.fullName || '') };
    });
    renderActivity(items);
    renderApplicationsTable(data);
  });

  // drafts (look for draft flag)
  const draftsRef = ref(db, `applications/${uid}`);
  onValue(draftsRef, snap => {
    const d = snap.val() || {};
    const count = Object.values(d || {}).filter(v => v.draft).length;
    statDrafts.textContent = count;
  });

  // qualification checks
  const checksRef = ref(db, `qualification_checks/${uid}`);
  onValue(checksRef, snap => {
    const d = snap.val() || {};
    statChecks.textContent = Object.keys(d || {}).length;
  });
}

/* Render helpers */
function renderActivity(items){
  activityList.innerHTML = '';
  if (!items.length) { activityList.innerHTML = '<li class="muted">No activity yet.</li>'; return; }
  items.forEach(it => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(it.title)}</strong></div><div class="muted" style="font-size:13px">${escapeHtml(it.note)} • ${new Date(it.when).toLocaleString()}</div>`;
    activityList.appendChild(li);
  });
}
function renderApplicationsTable(dataObj){
  applicationsTable.innerHTML = '';
  const keys = Object.keys(dataObj || {});
  if (!keys.length) { applicationsTable.innerHTML = '<div class="muted">No applications yet.</div>'; return; }
  const table = document.createElement('table');
  table.style.width='100%';
  table.innerHTML = `<thead><tr><th>Name</th><th>Program</th><th>Status</th><th>Submitted</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  keys.reverse().forEach(k => {
    const it = dataObj[k];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(it.form?.fullName||'—')}</td>
      <td>${escapeHtml(it.form?.intendedProgram||'—')}</td>
      <td>${escapeHtml(it.status|| (it.submittedAt? 'Submitted':'Draft'))}</td>
      <td>${it.submittedAt ? new Date(it.submittedAt).toLocaleString() : '-'}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  applicationsTable.appendChild(table);
}

/* Demo fallback when DB not enabled */
function renderDemoStats(){
  statApps.textContent = '—';
  statDrafts.textContent = '—';
  statChecks.textContent = '—';
  activityList.innerHTML = '<li class="muted">Realtime Database not enabled. Set databaseURL in app.js to use live data.</li>';
  applicationsTable.innerHTML = '<div class="muted">Realtime Database not enabled.</div>';
}

/* Utilities */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* Initialize UI */
navigateToPage('dashboard');
renderDemoStats();
resetCheckWizard();
loadEligibilityData();

// ========== FAQ DATA (Firebase) ==========
const FAQ_CATEGORIES = [
  { key: 'applications', label: '🎓 Applications & Admissions' },
  { key: 'visa', label: '🛂 Visa & Immigration' },
  { key: 'tuition', label: '💰 Tuition, Scholarships & Finances' },
  { key: 'accommodation', label: '🏠 Accommodation & Living in Canada' },
  { key: 'documents', label: '📄 Documents & Requirements' },
  { key: 'aftergrad', label: '🛠 After Graduation' },
];

const faqSection = document.getElementById('page-faq-view');
const faqList = document.getElementById('faq-list');
const faqSearch = document.getElementById('faq-search');
const faqCategories = document.getElementById('faq-categories');
let activeFaqCategory = null;
let FAQ_ENTRIES = [];

function renderFaqCategories() {
  faqCategories.innerHTML = '';
  FAQ_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'faq-category' + (activeFaqCategory === cat.key ? ' active' : '');
    btn.textContent = cat.label;
    btn.onclick = () => {
      activeFaqCategory = activeFaqCategory === cat.key ? null : cat.key;
      renderFaqCategories();
      renderFaqList();
    };
    faqCategories.appendChild(btn);
  });
}

function renderFaqList() {
  const search = (faqSearch.value || '').toLowerCase();
  let filtered = FAQ_ENTRIES.filter(faq => {
    const matchesCategory = !activeFaqCategory || (faq.categories && faq.categories.includes(activeFaqCategory));
    const matchesSearch = !search || (faq.q && faq.q.toLowerCase().includes(search)) || (faq.a && faq.a.toLowerCase().includes(search));
    return matchesCategory && matchesSearch;
  });
  faqList.innerHTML = '';
  if (filtered.length === 0) {
    faqList.innerHTML = '<div class="muted">No FAQs found. Try another keyword or category.</div>';
    return;
  }
  filtered.forEach((faq, idx) => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    const q = document.createElement('div');
    q.className = 'faq-q';
    q.innerHTML = faq.q + ' <span style="font-size:20px;">➕</span>';
    const a = document.createElement('div');
    a.className = 'faq-a';
    a.innerHTML = (faq.a || '').replace(/\n/g, '<br>');
    q.onclick = () => {
      const open = item.classList.toggle('open');
      q.querySelector('span').textContent = open ? '➖' : '➕';
    };
    item.appendChild(q);
    item.appendChild(a);
    faqList.appendChild(item);
  });
}

async function loadFaqFromFirebase() {
  if (!db) {
    console.error('FAQ: No database connection');
    faqList.innerHTML = '<div class="error">FAQ: No database connection.</div>';
    return;
  }
  const faqsRef = ref(db, 'faq');
  onValue(faqsRef, (snapshot) => {
    const data = snapshot.val();
    console.log('FAQ: Loaded from Firebase:', data);
    if (data) {
      FAQ_ENTRIES = Object.values(data);
      renderFaqList();
    } else {
      faqList.innerHTML = '<div class="muted">No FAQs found in Firebase. Try reloading or check your database rules.</div>';
    }
  }, (error) => {
    console.error('FAQ: Error loading from Firebase:', error);
    faqList.innerHTML = '<div class="error">FAQ: Error loading from Firebase.<br>' + error.message + '</div>';
  });
}

async function seedFaqToFirebase() {
  if (!db) {
    console.error('FAQ: No database connection for seeding');
    return;
  }
  const faqsRef = ref(db, 'faq');
  // Only seed if empty
  onValue(faqsRef, (snapshot) => {
    if (!snapshot.exists()) {
      fetch('faq.json')
        .then(res => res.json())
        .then(faqs => {
          faqs.forEach((faq, i) => {
            set(ref(db, `faq/${i}`), faq)
              .then(() => console.log(`FAQ: Seeded question ${i}`))
              .catch(err => console.error('FAQ: Error seeding', err));
          });
        })
        .catch(err => console.error('FAQ: Error loading faq.json', err));
    } else {
      console.log('FAQ: Data already exists in Firebase, not seeding.');
    }
  }, { onlyOnce: true });
}

if (faqSection) {
  renderFaqCategories();
  loadFaqFromFirebase();
  seedFaqToFirebase();
  faqSearch.addEventListener('input', renderFaqList);
}

// ========== Student Profile Logic ==========
const profileFields = [
  'fullname', 'dob', 'citybirth', 'countryorigin', 'countryresidence', 'highschoolyear', 'idnumber'
];
function getProfileFromForm() {
  return {
    fullname: document.getElementById('profile-fullname').value.trim(),
    dob: document.getElementById('profile-dob').value,
    citybirth: document.getElementById('profile-citybirth').value.trim(),
    countryorigin: document.getElementById('profile-countryorigin').value.trim(),
    countryresidence: document.getElementById('profile-countryresidence').value.trim(),
    highschoolyear: document.getElementById('profile-highschoolyear').value.trim(),
    idnumber: document.getElementById('profile-idnumber').value.trim()
  };
}
function isProfileComplete(profile) {
  return profileFields.every(f => profile[f] && profile[f].length > 0);
}
function showProfilePrompt() {
  navigateToPage('profile');
  profileStatus.textContent = 'Please complete your student profile to continue.';
}
function loadProfile(userId) {
  if (!db || !userId) return;
  const profileRef = ref(db, `profiles/${userId}`);
  onValue(profileRef, (snapshot) => {
    const profile = snapshot.val();
    if (!profile || !isProfileComplete(profile)) {
      showProfilePrompt();
      autoPopupProfileIfIncomplete(profile || {});
    }
  });
}
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !db) {
      profileStatus.textContent = 'You must be signed in to save your profile.';
      return;
    }
    const profile = getProfileFromForm();
    if (!isProfileComplete(profile)) {
      profileStatus.textContent = 'Please fill in all fields.';
      return;
    }
    try {
      await set(ref(db, `profiles/${currentUser.uid}`), profile);
      profileStatus.textContent = 'Profile saved successfully!';
      hideProfileModal();
    } catch (err) {
      profileStatus.textContent = 'Error saving profile: ' + (err.message || err);
    }
  });
}

/* Program search logic */
async function loadProgramsDropdown() {
  try {
    const res = await fetch('canadafulldataset.json');
    const data = await res.json();
    allData = data;
    const uniquePrograms = [...new Set(data.map(item => item.Program))].sort();
    allPrograms = uniquePrograms;
    programSearchSelect.innerHTML = uniquePrograms.map(p => `<option value="${p}">${p}</option>`).join('');
  } catch (err) {
    programSearchSelect.innerHTML = '<option>Error loading programs</option>';
  }
}
loadProgramsDropdown();

function searchUniversitiesByProgram(programName) {
  programSearchResults.innerHTML = '<div class="muted">Searching...</div>';
  const results = allData.filter(item => item.Program === programName);
  if (results.length === 0) {
    programSearchResults.innerHTML = '<div class="muted">No universities found for this program.</div>';
    return;
  }
  programSearchResults.innerHTML = `
    <h4 style="margin-bottom:10px;">${programName}</h4>
    <table class="table" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th>University</th>
          <th>Application Fee</th>
          <th>Yearly Tuition</th>
          <th>City</th>
          <th>Province</th>
        </tr>
      </thead>
      <tbody>
        ${results.map(r => `
          <tr>
            <td>${r.University}</td>
            <td>${r["Application / Registration Fee (CAD)"]}</td>
            <td>${r["Yearly Tuition for International Students (CAD)"] ?? '-'}</td>
            <td>${r.City}</td>
            <td>${r["Province/Territory"]}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
if (programSearchBtn) {
  programSearchBtn.addEventListener('click', () => {
    const val = programSearchSelect.value;
    if (!val) {
      programSearchResults.innerHTML = '<div class="muted">Please select a program.</div>';
      return;
    }
    searchUniversitiesByProgram(val);
  });
}

/* Accommodation modal logic */
const openAccommodationModalBtn = document.getElementById('open-accommodation-modal');
const modalAccommodation = document.getElementById('modal-accommodation');
const accommodationModalBody = document.getElementById('accommodation-modal-body');
const closeAccommodationModalBtn = document.getElementById('close-accommodation-modal');

const accommodationFaqList = document.getElementById('accommodation-faq-list');
const accommodationFaqs = [
  {
    q: 'What types of accommodation are available for international students in Canada?',
    a: `<ul>
      <li>On-campus residences (dormitories): Managed by universities/colleges, usually furnished, close to classes.</li>
      <li>Off-campus shared housing: Apartments or houses shared with other students, typically the most affordable.</li>
      <li>Private rentals: Individual apartments or studios, more independence but higher cost.</li>
      <li>Homestay: Living with a Canadian host family, often includes meals and utilities.</li>
      <li>Student cooperatives (co-ops): Non-profit housing run by students for students.</li>
    </ul>`
  },
  {
    q: 'How much does student housing cost in Canada?',
    a: `On-campus residence: CAD 600 – 1,300/month<br>Off-campus shared housing: CAD 600 – 1,500/month<br>Private rentals: CAD 1,100 – 2,500/month (varies by city)<br>Homestay: CAD 700 – 1,500/month (with meals)<br><span style="color:#F59E42;">💡 Costs are higher in Toronto, Vancouver, and Victoria, and lower in Winnipeg, Regina, and St. John’s.</span>`
  },
  {
    q: 'How do I apply for on-campus housing?',
    a: `Apply through your university’s housing office or student portal.<br>Most universities require early applications (often immediately after admission).<br>Spaces are limited and assigned on a first-come, first-served basis.`
  },
  {
    q: 'Is on-campus housing guaranteed for international students?',
    a: `In Ontario, institutions are now required to guarantee housing for incoming international students.<br>Outside Ontario, guarantees depend on the university. Many offer priority housing for first-year international students.`
  },
  {
    q: 'What documents are needed to rent off-campus housing?',
    a: `<ul>
      <li>Valid ID (passport, study permit)</li>
      <li>Proof of enrollment (acceptance letter/student ID)</li>
      <li>Proof of funds or guarantor (e.g., Canadian bank account, sponsor)</li>
      <li>First month’s rent (and sometimes last month’s rent as deposit)</li>
    </ul>`
  },
  {
    q: 'Are utilities and internet included in rent?',
    a: `On-campus housing: Almost always included (heating, electricity, internet).<br>Off-campus housing: Sometimes included, but often students split costs for internet, electricity, and heating.`
  },
  {
    q: 'Can international students face housing discrimination?',
    a: `Yes. Surveys indicate over 50% of international students face challenges securing housing due to:<ul><li>Discrimination</li><li>Limited credit history in Canada</li><li>Exploitative landlords</li></ul><span style="color:#F43F5E;">👉 To avoid this: rent through trusted university channels, verified rental websites, or student housing cooperatives.</span>`
  },
  {
    q: 'What should I budget monthly for accommodation and living expenses?',
    a: `On average, students spend CAD 1,000 – 2,000 per month on housing + utilities.<br>Adding food, transport, and personal expenses, expect a monthly budget of CAD 1,500 – 2,500 (varies by city).`
  },
  {
    q: 'What is “unsuitable housing,” and why is it common among international students?',
    a: `According to Statistics Canada, unsuitable housing means the unit does not have enough bedrooms for household size.<br>Example: 6–8 students sharing a 2-bedroom apartment.<br>Common in Brampton (63%) and Surrey (61%) among international students due to affordability pressures.`
  },
  {
    q: 'What should I check before signing a rental agreement?',
    a: `Lease duration and terms (usually 8–12 months minimum).<br>What is included in rent (utilities, internet, furniture).<br>Refund policy on deposit.<br>Maintenance responsibilities.<br>Read carefully for clauses on early termination.`
  },
  {
    q: 'What are student housing cooperatives (co-ops)?',
    a: `Affordable, community-run housing managed by students.<br>Examples: Waterloo Co-operative Residence Inc., Toronto Campus Co-op, ECOLE (Montreal).<br>Cheaper than private rentals, but students share responsibilities (cleaning, administration).`
  },
  {
    q: 'What should I do if I can’t find housing before arrival?',
    a: `Contact your university’s international student office.<br>Book short-term housing (hostels, Airbnb, homestay) for 2–4 weeks.<br>Use that time to visit apartments in person and sign a safe lease.`
  },
  {
    q: 'Are there scams to watch out for?',
    a: `Yes. Warning signs include:<ul><li>Requests for money transfer before viewing the property.</li><li>No lease or written agreement.</li><li>Rent price far below market average.</li></ul><span style="color:#F43F5E;">👉 Always visit the unit in person or through video call, and pay only through traceable methods (not cash).</span>`
  },
  {
    q: 'Where can I find reliable housing listings?',
    a: `University housing boards<br>Verified student housing portals (e.g., Places4Students, Rentals.ca, PadMapper)<br>Local student associations<br>Non-profit housing co-ops`
  },
  {
    q: 'What support is available if I struggle with housing?',
    a: `University international student office<br>Local student unions<br>Provincial tenant rights organizations (e.g., Ontario Landlord and Tenant Board)<br>Community legal aid clinics`
  }
];
function renderAccommodationFaq() {
  if (!accommodationFaqList) return;
  accommodationFaqList.innerHTML = accommodationFaqs.map((item, i) => `
    <div class="faq-item" style="border-bottom:1px solid #e5e7eb;">
      <button class="faq-toggle" aria-expanded="false" style="background:none;border:none;width:100%;text-align:left;padding:12px 0;font-size:1em;display:flex;align-items:center;gap:8px;cursor:pointer;">
        <span class="faq-plus" style="font-weight:bold;font-size:1.2em;">+</span>
        <span>${item.q}</span>
      </button>
      <div class="faq-answer" style="display:none;padding:0 0 12px 28px;color:#374151;">${item.a}</div>
    </div>
  `).join('');
  accommodationFaqList.querySelectorAll('.faq-toggle').forEach((btn, idx) => {
    btn.addEventListener('click', function() {
      const answer = btn.parentElement.querySelector('.faq-answer');
      const plus = btn.querySelector('.faq-plus');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
      if (!expanded) {
        answer.style.display = 'block';
        plus.textContent = '−';
      } else {
        answer.style.display = 'none';
        plus.textContent = '+';
      }
    });
  });
}
// Render FAQ when modal opens
async function showAccommodationModal() {
  modalAccommodation.classList.remove('hidden');
  modalAccommodation.setAttribute('aria-hidden', 'false');
  renderAccommodationFaq();
  // Only append accommodation info below FAQ section
  let infoList = document.getElementById('accommodation-info-list');
  if (!infoList) {
    const faqSection = document.querySelector('#accommodation-modal-body .faq-section');
    if (faqSection) {
      faqSection.insertAdjacentHTML('afterend', '<div id="accommodation-info-list"><div class="muted">Loading...</div></div>');
      infoList = document.getElementById('accommodation-info-list');
    }
  }
  try {
    const res = await fetch('accommodation.json');
    const data = await res.json();
    const infoHtml = data.map(item => `
      <div class="accommodation-card" style="margin-bottom:18px;padding:12px;border-radius:8px;background:#f8fafc;box-shadow:0 2px 8px #1e3a8a22;">
        <h4 style="margin-bottom:8px;">${item.City}</h4>
        <div><strong>Percent Renting:</strong> ${item.Percent_Renting ?? '-'}%</div>
        <div><strong>Percent Roommates:</strong> ${item.Percent_Roommates ?? '-'}%</div>
        <div><strong>On-Campus Rent (Monthly):</strong> ${item.OnCampus_Rent_Monthly ?? '-'} CAD</div>
        <div><strong>Off-Campus Shared Rent:</strong> ${item.OffCampus_Shared_Rent ?? '-'} CAD</div>
        <div><strong>Off-Campus Private Rent:</strong> ${item.OffCampus_Private_Rent ?? '-'} CAD</div>
        <div><strong>Homestay Rent:</strong> ${item.Homestay_Rent ?? '-'} CAD</div>
        <div><strong>PBSA Percent Coverage:</strong> ${item.PBSA_Percent_Coverage ?? '-'}%</div>
        <div><strong>Rent Trends:</strong> ${item.Rent_Trends_Notes ?? '-'} </div>
        <div><strong>Survey Housing Struggle:</strong> ${item["Survey_HousingStruggle(%)"] ?? '-'}%</div>
        <div><strong>Co-Op Exists:</strong> ${item.CoOp_Exists ?? '-'} </div>
        <div><strong>Policy Guarantee:</strong> ${item.Policy_Guarantee ?? '-'} </div>
      </div>
    `).join('');
    infoList.innerHTML = infoHtml;
  } catch (err) {
    if (infoList) infoList.innerHTML = '<div class="muted">Error loading accommodation data.</div>';
  }
}
if (openAccommodationModalBtn) {
  openAccommodationModalBtn.addEventListener('click', showAccommodationModal);
}
if (closeAccommodationModalBtn) {
  closeAccommodationModalBtn.addEventListener('click', () => {
    modalAccommodation.classList.add('hidden');
    modalAccommodation.setAttribute('aria-hidden', 'true');
  });
}
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', () => {
    modalAccommodation.classList.add('hidden');
    modalAccommodation.setAttribute('aria-hidden', 'true');
  });
});
