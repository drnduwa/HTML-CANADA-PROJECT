// Admin Portal Logic
const adminLoginDiv = document.getElementById('admin-login');
const adminDashboardDiv = document.getElementById('admin-dashboard');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminLoginError = document.getElementById('admin-login-error');

adminLoginBtn.addEventListener('click', () => {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;
  if (username === 'admincanada' && password === 'constitution1A') {
    adminLoginDiv.style.display = 'none';
    adminDashboardDiv.style.display = 'block';
    adminLoginError.textContent = '';
    loadAdminData();
  } else {
    adminLoginError.textContent = 'Invalid username or password.';
  }
});

adminLogoutBtn.addEventListener('click', () => {
  adminDashboardDiv.style.display = 'none';
  adminLoginDiv.style.display = 'block';
  document.getElementById('admin-username').value = '';
  document.getElementById('admin-password').value = '';
});

async function loadAdminData() {
  // Load student profiles
  try {
    const studentsResp = await fetch('https://jaekernacanada-default-rtdb.firebaseio.com/profiles.json');
    const students = await studentsResp.json();
    const studentsTable = document.getElementById('admin-students-table').querySelector('tbody');
    studentsTable.innerHTML = Object.values(students || {}).map(s => `
      <tr>
        <td>${s.fullname || ''}</td>
        <td>${s.email || ''}</td>
        <td>${s.subscription || 'FREE'}</td>
        <td>${s.citybirth || ''}</td>
        <td>${s.countryorigin || ''}</td>
        <td>${s.countryresidence || ''}</td>
        <td>${s.dob || ''}</td>
        <td>${s.highschoolyear || ''}</td>
        <td>${s.idnumber || ''}</td>
        <td><button style=\"background:#38BDF8;color:#fff;border:none;padding:4px 10px;border-radius:4px;\">View</button></td>
      </tr>
    `).join('');
  } catch (err) {
    document.getElementById('admin-students-table').querySelector('tbody').innerHTML = '<tr><td colspan="4">Failed to load students.</td></tr>';
  }

  // Load applications
  try {
    const appsResp = await fetch('https://jaekernacanada-default-rtdb.firebaseio.com/applications.json');
    const apps = await appsResp.json();
    const appsTable = document.getElementById('admin-applications-table').querySelector('tbody');
    // Flatten nested applications structure: {uid: {appId: {form: {...}}}}
    let allForms = [];
    Object.values(apps || {}).forEach(userApps => {
      if (typeof userApps === 'object') {
        Object.values(userApps).forEach(app => {
          if (app.form) {
            allForms.push(app.form);
          }
        });
      }
    });
    appsTable.innerHTML = allForms.length === 0 ? '<tr><td colspan="11">No applications found.</td></tr>' : allForms.map(a => {
      let docs = '';
      if (a.documents && typeof a.documents === 'object') {
        docs = Object.keys(a.documents).map(key => {
          const val = a.documents[key];
          if (typeof val === 'string' && val.startsWith('http')) {
            return `<a href="${val}" target="_blank">${key}</a>`;
          }
          return key;
        }).join(', ');
      } else if (typeof a.documents === 'string') {
        docs = a.documents;
      }
      return `
        <tr>
          <td>${a.fullName || ''}</td>
          <td>${a.educationLevel || ''}</td>
          <td>${a.gpa || ''}</td>
          <td>${a.intake || ''}</td>
          <td>${a.intendedProgram || ''}</td>
          <td>${a.lastSchool || ''}</td>
          <td>${a.programLevel || ''}</td>
          <td>${a.submittedAt ? new Date(a.submittedAt).toLocaleString() : ''}</td>
          <td>${a.submittedBy || ''}</td>
          <td>${docs}</td>
          <td><button style=\"background:#38BDF8;color:#fff;border:none;padding:4px 10px;border-radius:4px;\">View</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    document.getElementById('admin-applications-table').querySelector('tbody').innerHTML = '<tr><td colspan="5">Failed to load applications.</td></tr>';
  }

  // Load scholarships
  try {
    const scholarshipsResp = await fetch('scholarships.json');
    const scholarships = await scholarshipsResp.json();
    const scholarshipsTable = document.getElementById('admin-scholarships-table').querySelector('tbody');
    scholarshipsTable.innerHTML = (scholarships || []).map(s => `
      <tr>
        <td>${s["Scholarship Name"]}</td>
        <td>${s.Sponsor}</td>
        <td>${s.Amount}</td>
        <td>${s["Deadline (Approx.)"]}</td>
        <td><a href="${s.URL}" target="_blank" style="color:#38BDF8;text-decoration:underline;">View</a></td>
      </tr>
    `).join('');
  } catch (err) {
    document.getElementById('admin-scholarships-table').querySelector('tbody').innerHTML = '<tr><td colspan="5">Failed to load scholarships.</td></tr>';
  }
}
