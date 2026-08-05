const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

// ── Auth helper: attach JWT to every admin request ───────────────────────────
function authHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// ── Auth headers for FormData (no Content-Type override) ────────────────────
function authHeadersNoContentType() {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

document.addEventListener('DOMContentLoaded', () => {
    const editModal = document.getElementById('editProjectModal');
    const editProjectForm = document.getElementById('edit-project-form');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');

    function openEditModal() {
        if (!editModal) return;
        editModal.classList.add('active');
        editModal.setAttribute('aria-hidden', 'false');
    }

    function closeEditModal() {
        if (!editModal) return;
        editModal.classList.remove('active');
        editModal.setAttribute('aria-hidden', 'true');
        if (editProjectForm) editProjectForm.reset();
        // Clear image preview
        const preview = document.getElementById('editImagePreview');
        if (preview) preview.innerHTML = '';
        const fileInput = document.getElementById('editImageFile');
        if (fileInput) fileInput.value = '';
    }

    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if (cancelEditModalBtn) cancelEditModalBtn.addEventListener('click', closeEditModal);

    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal && editModal.classList.contains('active')) {
            closeEditModal();
        }
    });

    // Sidebar Navigation
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav .nav-link').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(this.dataset.section);
            if (target) target.classList.add('active');
            if (this.dataset.section === 'manage-projects') loadProjectsTable();
            if (this.dataset.section === 'recycle-bin') loadRecycleBin();
            if (this.dataset.section === 'manage-skills') loadSkillsTable();
        });
    });

    // Project Tabs
    document.querySelectorAll('.project-tabs .tab-button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.project-tabs .tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tab = document.getElementById(this.dataset.tab);
            if (tab) tab.classList.add('active');
            if (this.dataset.tab === 'view-projects') loadProjectsTable();
        });
    });

    // ── Dismiss page loader once DOM + first data load is done ──
    async function initDashboard() {
        await loadProjectsTable();
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 420);
        }
    }
    initDashboard();

    // ── Add Project image preview ─────────────────────────────────────────────
    const addImageInput = document.getElementById('addImageFile');
    if (addImageInput) {
        addImageInput.addEventListener('change', () => {
            const preview = document.getElementById('addImagePreview');
            if (!preview) return;
            const file = addImageInput.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                preview.innerHTML = `<img src="${url}" alt="Preview" style="max-width:200px;max-height:120px;border-radius:6px;margin-top:8px;border:1px solid #ddd;">`;
            } else {
                preview.innerHTML = '';
            }
        });
    }

    // ── Add Project Form ──────────────────────────────────────────────────────
    const addProjectForm = document.getElementById('add-project-form');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div class="spinner"></div> Adding...`;

            const formData = new FormData(this);
            const projectData = Object.fromEntries(formData.entries());

            try {
                // Step 1: save project text data
                const res = await fetch(`${API_BASE_URL}/admin/projects`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify(projectData),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const result = await res.json();
                const newId = result.id;

                // Step 2: upload image if one was selected
                const imageFile = document.getElementById('addImageFile')?.files[0];
                if (imageFile && newId) {
                    submitBtn.innerHTML = `<div class="spinner"></div> Uploading image...`;
                    await uploadProjectImage(newId, imageFile);
                }

                showNotification('✅ ' + result.message, 'success');
                this.reset();
                document.getElementById('addImagePreview').innerHTML = '';
                loadProjectsTable();
                document.querySelector('.project-tabs .tab-button[data-tab="view-projects"]').click();
            } catch (err) {
                console.error('[Error] Add project failed:', err);
                showNotification('Failed to add project. Check the console.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ── Load & Render Projects Table ─────────────────────────────────────────
    async function loadProjectsTable() {
        const tableBody = document.getElementById('projectsTableBody');
        if (!tableBody) return;
        // Skeleton rows
        tableBody.innerHTML = Array(4).fill(0).map(() => `
            <tr class="skeleton-row">
                <td><span class="skel" style="width:24px"></span></td>
                <td><span class="skel" style="width:60px;height:40px;border-radius:4px;"></span></td>
                <td><span class="skel" style="width:120px"></span></td>
                <td><span class="skel" style="width:40px"></span></td>
                <td><span class="skel" style="width:50px"></span></td>
                <td><span class="skel" style="width:60px"></span></td>
                <td><span class="skel" style="width:100px"></span></td>
            </tr>`).join('');

        try {
            const res = await fetch(`${API_BASE_URL}/projects`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const projects = await res.json();
            renderProjectsTable(projects.sort((a, b) => a.id - b.id));
        } catch (err) {
            console.error('[Error] Load projects failed:', err);
            tableBody.innerHTML = '<tr><td colspan="7" class="error" style="text-align:center;padding:20px;color:#dc3545;">Failed to load projects. Is the server running?</td></tr>';
        }
    }

    function renderProjectsTable(projects) {
        const tableBody = document.getElementById('projectsTableBody');
        if (!projects || projects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#28a745;padding:20px;">No projects found. Add one to get started!</td></tr>';
            return;
        }
        tableBody.innerHTML = projects.map((p, i) => `
            <tr>
                <td style="font-weight:bold;">${i + 1}</td>
                <td>
                    ${p.image_path
                        ? `<img src="${p.image_path}" alt="${p.name}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`
                        : '<span style="color:#aaa;font-size:12px;">No image</span>'
                    }
                </td>
                <td>${p.name || 'N/A'}</td>
                <td>${p.year || 'N/A'}</td>
                <td>${p.live_url ? `<a href="${p.live_url}" target="_blank" class="table-link table-link-live">Live</a>` : '—'}</td>
                <td>${p.github_url ? `<a href="${p.github_url}" target="_blank" class="table-link table-link-github">GitHub</a>` : '—'}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="editProject(${p.id})" class="btn-edit">Edit</button>
                        <button onclick="deleteProject(${p.id})" class="btn-delete">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ── Edit Project ──────────────────────────────────────────────────────────
    async function editProject(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/projects/${id}`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const p = await res.json();

            document.getElementById('editProjectId').value = p.id;
            document.getElementById('editProjectName').value = p.name || '';
            document.getElementById('editProjectDescription').value = p.description || '';
            document.getElementById('editProjectLiveUrl').value = p.live_url || '';
            document.getElementById('editProjectGithubUrl').value = p.github_url || '';
            document.getElementById('editProjectYear').value = p.year || new Date().getFullYear();
            document.getElementById('editProjectDemoVideoUrl').value = p.demo_video_url || '';

            // Show current image in the modal
            const preview = document.getElementById('editImagePreview');
            if (preview) {
                preview.innerHTML = p.image_path
                    ? `<p style="font-size:12px;color:#666;margin-bottom:6px;">Current image:</p>
                       <img src="${p.image_path}" alt="current" style="max-width:180px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">`
                    : '<p style="font-size:12px;color:#aaa;">No image set.</p>';
            }

            openEditModal();
            document.getElementById('editProjectName').focus();
        } catch (err) {
            console.error('[Error] Edit project load failed:', err);
            showNotification('Failed to load project data.', 'error');
        }
    }

    // Edit form submit (text fields only)
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
            const projectId = document.getElementById('editProjectId')?.value;

            if (!projectId) { showNotification('Missing project ID.', 'error'); return; }

            const name         = document.getElementById('editProjectName')?.value.trim() || '';
            const desc         = document.getElementById('editProjectDescription')?.value.trim() || '';
            const liveUrl      = document.getElementById('editProjectLiveUrl')?.value.trim() || '';
            const githubUrl    = document.getElementById('editProjectGithubUrl')?.value.trim() || '';
            const yearVal      = document.getElementById('editProjectYear')?.value.trim() || '';
            const demoVideoUrl = document.getElementById('editProjectDemoVideoUrl')?.value.trim() || '';

            if (!name) { showNotification('Project name is required.', 'error'); return; }
            const parsedYear = Number(yearVal);
            if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
                showNotification('Please enter a valid year (1900–2100).', 'error');
                return;
            }

            if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = `<div class="spinner"></div> Saving...`; }

            try {
                const res = await fetch(`${API_BASE_URL}/admin/projects/${projectId}`, {
                    method: 'PUT',
                    headers: authHeaders(),
                    body: JSON.stringify({ name, description: desc, live_url: liveUrl, github_url: githubUrl, year: parsedYear, demo_video_url: demoVideoUrl || null }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

                showNotification(result.message || 'Project updated!', 'success');
                closeEditModal();
                loadProjectsTable();
            } catch (err) {
                console.error('[Error] Update failed:', err);
                showNotification(`Failed to update: ${err.message}`, 'error');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
            }
        });
    }

    // Upload image from edit modal
    const editImageFile = document.getElementById('editImageFile');
    if (editImageFile) {
        // Show a local preview when a file is chosen
        editImageFile.addEventListener('change', () => {
            const file = editImageFile.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const preview = document.getElementById('editImagePreview');
            if (preview) {
                preview.innerHTML = `<p style="font-size:12px;color:#666;margin-bottom:6px;">New image preview:</p>
                    <img src="${url}" alt="Preview" style="max-width:180px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">`;
            }
        });
    }

    const uploadImageBtn = document.getElementById('uploadEditImageBtn');
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', async () => {
            const projectId = document.getElementById('editProjectId')?.value;
            const file = document.getElementById('editImageFile')?.files[0];
            if (!projectId) { showNotification('Save the project first.', 'error'); return; }
            if (!file) { showNotification('Please choose an image file first.', 'error'); return; }

            uploadImageBtn.disabled = true;
            uploadImageBtn.innerHTML = `<div class="spinner"></div> Uploading...`;

            try {
                const imagePath = await uploadProjectImage(projectId, file);
                showNotification('✅ Image uploaded successfully!', 'success');
                // Refresh the current image preview
                const preview = document.getElementById('editImagePreview');
                if (preview && imagePath) {
                    preview.innerHTML = `<p style="font-size:12px;color:#666;margin-bottom:6px;">Current image:</p>
                        <img src="${imagePath}" alt="current" style="max-width:180px;max-height:110px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">`;
                }
                document.getElementById('editImageFile').value = '';
                loadProjectsTable();
            } catch (err) {
                showNotification(`Upload failed: ${err.message}`, 'error');
            } finally {
                uploadImageBtn.disabled = false;
                uploadImageBtn.innerHTML = `<i class="fas fa-upload"></i> Upload Image`;
            }
        });
    }

    // ── Delete Project ────────────────────────────────────────────────────────
    async function deleteProject(id) {
        if (!confirm(`Move project ID ${id} to the Recycle Bin?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/projects/${id}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
            showNotification(result.message, 'success');
            loadProjectsTable();
        } catch (err) {
            console.error('[Error] Delete failed:', err);
            showNotification('Failed to delete project.', 'error');
        }
    }

    // Expose to inline onclick handlers
    window.loadProjectsTable = loadProjectsTable;
    window.editProject = editProject;
    window.deleteProject = deleteProject;
    window.restoreProject = restoreProject;
    window.permanentDelete = permanentDelete;
});

// ── Image Upload Helper (used by both add & edit flows) ─────────────────────
async function uploadProjectImage(projectId, file) {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('authToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : '/api';

    const res = await fetch(`${API_BASE_URL}/admin/projects/${projectId}/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data.image_path;
}

// ── Recycle Bin ──────────────────────────────────────────────────────────────
async function loadRecycleBin() {
    const body = document.getElementById('recycle-bin-body');
    if (!body) return;
    body.innerHTML = Array(3).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><span class="skel" style="width:20px"></span></td>
            <td><span class="skel" style="width:130px"></span></td>
            <td><span class="skel" style="width:40px"></span></td>
            <td><span class="skel" style="width:120px"></span></td>
        </tr>`).join('');

    const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:5000/api'
        : '/api';

    try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/admin/recycle-bin`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const projects = await res.json();

        if (!Array.isArray(projects) || projects.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:#888;font-style:italic;">Recycle Bin is empty.</td></tr>';
            return;
        }

        body.innerHTML = projects.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.year}</td>
                <td>
                    <button onclick="restoreProject(${p.id})" class="btn-restore">Restore</button>
                    <button onclick="permanentDelete(${p.id})" class="btn-delete">Delete Forever</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('[Error] Load recycle bin failed:', err);
        body.innerHTML = '<tr><td colspan="4" class="error" style="text-align:center;color:#dc3545;padding:20px;">Failed to load recycle bin.</td></tr>';
    }
}

async function restoreProject(id) {
    const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('authToken');
    await fetch(`${API_BASE_URL}/admin/projects/${id}/restore`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    showNotification('Project restored!', 'success');
    loadRecycleBin();
    if (typeof loadProjectsTable === 'function') loadProjectsTable();
}

async function permanentDelete(id) {
    if (!confirm('This cannot be undone. Delete forever?')) return;
    const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('authToken');
    await fetch(`${API_BASE_URL}/admin/projects/${id}/permanent`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    showNotification('Project permanently deleted.', 'success');
    loadRecycleBin();
}

// ── Toast notification (replaces alert()) ───────────────────────────────────
function showNotification(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.2);
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        max-width: 340px;
        animation: slideIn 0.25s ease-out;
    `;
    toast.textContent = message;

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = '@keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }';
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 320);
    }, 3500);
}

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

// ══════════════════════════════════════════════
// SKILLS MANAGEMENT
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // ── Skill tabs (separate from project tabs) ──
    document.querySelectorAll('#manage-skills .project-tabs .tab-button').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#manage-skills .project-tabs .tab-button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#manage-skills .tab-content').forEach(c => c.classList.remove('active'));
            const tab = document.getElementById(this.dataset.tab);
            if (tab) tab.classList.add('active');
            if (this.dataset.tab === 'view-skills') loadSkillsTable();
        });
    });

    // ── Add Skill Form ──
    const addSkillForm = document.getElementById('add-skill-form');
    if (addSkillForm) {
        addSkillForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div> Adding…';
            const data = {
                title: document.getElementById('skillTitle').value.trim(),
                description: document.getElementById('skillDescription').value.trim(),
                icon: document.getElementById('skillIcon').value.trim() || 'fa-solid fa-star',
                sort_order: Number(document.getElementById('skillOrder').value) || 0,
            };
            try {
                const res = await fetch(`${API_BASE_URL}/admin/skills`, {
                    method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                showNotification('✅ ' + result.message, 'success');
                this.reset();
                document.getElementById('skillIcon').value = 'fa-solid fa-star';
                document.getElementById('skillOrder').value = '0';
                // Switch to view tab
                document.querySelector('#manage-skills .tab-button[data-tab="view-skills"]')?.click();
            } catch (err) {
                showNotification('Failed to add skill: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    // ── Edit Skill Modal setup ──
    const editSkillModal  = document.getElementById('editSkillModal');
    const editSkillForm   = document.getElementById('edit-skill-form');
    const closeSkillBtn   = document.getElementById('closeEditSkillModalBtn');
    const cancelSkillBtn  = document.getElementById('cancelEditSkillModalBtn');

    function openSkillModal()  { if (editSkillModal) { editSkillModal.classList.add('active'); editSkillModal.setAttribute('aria-hidden','false'); } }
    function closeSkillModal() {
        if (!editSkillModal) return;
        editSkillModal.classList.remove('active');
        editSkillModal.setAttribute('aria-hidden','true');
        if (editSkillForm) editSkillForm.reset();
    }

    if (closeSkillBtn)  closeSkillBtn.addEventListener('click', closeSkillModal);
    if (cancelSkillBtn) cancelSkillBtn.addEventListener('click', closeSkillModal);
    if (editSkillModal) editSkillModal.addEventListener('click', e => { if (e.target === editSkillModal) closeSkillModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && editSkillModal?.classList.contains('active')) closeSkillModal(); });

    // Edit skill form submit
    if (editSkillForm) {
        editSkillForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            const id = document.getElementById('editSkillId').value;
            if (!id) { showNotification('Missing skill ID.', 'error'); return; }
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner"></div> Saving…';
            const data = {
                title:       document.getElementById('editSkillTitle').value.trim(),
                description: document.getElementById('editSkillDescription').value.trim(),
                icon:        document.getElementById('editSkillIcon').value.trim() || 'fa-solid fa-star',
                sort_order:  Number(document.getElementById('editSkillOrder').value) || 0,
                is_active:   document.getElementById('editSkillActive').checked,
            };
            if (!data.title) { showNotification('Title is required.', 'error'); btn.disabled = false; btn.innerHTML = orig; return; }
            try {
                const res = await fetch(`${API_BASE_URL}/admin/skills/${id}`, {
                    method: 'PUT', headers: authHeaders(), body: JSON.stringify(data)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                showNotification(result.message || 'Skill updated!', 'success');
                closeSkillModal();
                loadSkillsTable();
            } catch (err) {
                showNotification('Update failed: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    // Expose to inline onclick
    window.editSkill   = editSkill;
    window.deleteSkill = deleteSkill;
    window.loadSkillsTable = loadSkillsTable;
});

async function loadSkillsTable() {
    const body = document.getElementById('skillsTableBody');
    if (!body) return;
    body.innerHTML = Array(5).fill(0).map(() => `
        <tr class="skeleton-row">
            <td><span class="skel" style="width:20px"></span></td>
            <td><span class="skel" style="width:28px;height:28px;border-radius:4px;"></span></td>
            <td><span class="skel" style="width:140px"></span></td>
            <td><span class="skel" style="width:30px"></span></td>
            <td><span class="skel" style="width:36px"></span></td>
            <td><span class="skel" style="width:110px"></span></td>
        </tr>`).join('');
    const API = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    try {
        const res = await fetch(`${API}/admin/skills`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const skills = await res.json();
        if (!skills || skills.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#28a745;padding:20px;">No skills yet. Add one above!</td></tr>';
            return;
        }
        body.innerHTML = skills.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><i class="${s.icon || 'fa-solid fa-star'}" style="font-size:18px;color:#007bff;"></i></td>
                <td>${s.title || ''}</td>
                <td>${s.sort_order}</td>
                <td><span style="color:${s.is_active ? '#28a745' : '#dc3545'}">${s.is_active ? 'Yes' : 'No'}</span></td>
                <td>
                    <div class="action-btns">
                        <button onclick="editSkill(${s.id})" class="btn-edit">Edit</button>
                        <button onclick="deleteSkill(${s.id})" class="btn-delete">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc3545;padding:20px;">Failed to load skills.</td></tr>';
    }
}

async function editSkill(id) {
    const API = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    try {
        const res = await fetch(`${API}/admin/skills`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const skills = await res.json();
        const s = skills.find(x => x.id === id);
        if (!s) { showNotification('Skill not found.', 'error'); return; }
        document.getElementById('editSkillId').value        = s.id;
        document.getElementById('editSkillTitle').value     = s.title || '';
        document.getElementById('editSkillDescription').value = s.description || '';
        document.getElementById('editSkillIcon').value      = s.icon || 'fa-solid fa-star';
        document.getElementById('editSkillOrder').value     = s.sort_order || 0;
        document.getElementById('editSkillActive').checked  = !!s.is_active;
        document.getElementById('editSkillModal').classList.add('active');
        document.getElementById('editSkillModal').setAttribute('aria-hidden', 'false');
        document.getElementById('editSkillTitle').focus();
    } catch (err) {
        showNotification('Failed to load skill data.', 'error');
    }
}

async function deleteSkill(id) {
    if (!confirm(`Delete skill ID ${id}? This cannot be undone.`)) return;
    const API = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    try {
        const res = await fetch(`${API}/admin/skills/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        showNotification(result.message, 'success');
        loadSkillsTable();
    } catch (err) {
        showNotification('Delete failed: ' + err.message, 'error');
    }
}
