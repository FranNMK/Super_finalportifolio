// At the top of your JS files

const API_BASE_URL = 'http://localhost:5000/api'; 


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
        if (editProjectForm) {
            editProjectForm.reset();
        }
    }

    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditModal);
    }

    if (cancelEditModalBtn) {
        cancelEditModalBtn.addEventListener('click', closeEditModal);
    }

    if (editModal) {
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal) {
                closeEditModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && editModal && editModal.classList.contains('active')) {
            closeEditModal();
        }
    });

    // Sidebar Navigation
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav .nav-link').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(this.dataset.section);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            if (this.dataset.section === 'manage-projects') {
                loadProjectsTable();
            }

            if (this.dataset.section === 'recycle-bin') {
                loadRecycleBin();
            }
        });
    });

    // Project Tabs (Add New Project / View/Edit Projects)
    document.querySelectorAll('.project-tabs .tab-button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.project-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            const targetTab = document.getElementById(this.dataset.tab);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            if (this.dataset.tab === 'view-projects') {
                loadProjectsTable();
            }
        });
    });

    // Initial load for projects table
    loadProjectsTable();

    // Add Project Form Submission

    const addProjectForm = document.getElementById('add-project-form');

    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Identify the submit button and save its original state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;

            // 2. Visual Feedback: Disable button and show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<div class="spinner"></div> Adding Project...to your Projects Page....`;

            const formData = new FormData(this);
            const projectData = Object.fromEntries(formData.entries());

            try {
                console.log("[Senior Log] Submitting project data to server...");

                const response = await fetch(`${API_BASE_URL}/admin/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const result = await response.json();
                console.log("[Senior Log] Server response:", result);

                alert("Success: " + result.message);
                this.reset(); // Clear the form

                // Refresh the projects table automatically
                if (typeof loadProjectsTable === 'function') loadProjectsTable();

                // Switch to the view projects tab
                document.querySelector('.project-tabs .tab-button[data-tab="view-projects"]').click();

            } catch (error) {
                console.error('[Senior Error] Submission failed:', error);
                alert('Failed to add project. Please check the server logs.');
            } finally {
                // 3. Always re-enable the button, even if it fails
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // S/No Implementation

    // 1. FETCH PROJECTS: Get data from the server
    async function loadProjectsTable() {
        const tableBody = document.getElementById('projectsTableBody');
        if (!tableBody) return;

        try {
            console.log("[Senior Log] Fetching projects from API...");
            const response = await fetch(`${API_BASE_URL}/projects`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const projects = await response.json();

            // --- SENIOR MOVE: SORT BY DATABASE ID (Oldest First) ---
            // This ensures your projects always appear in the order they were created.
            const sortedProjects = projects.sort((a, b) => a.id - b.id);

            // Pass the sorted list to the renderer
            renderProjectsTable(sortedProjects);
        } catch (error) {
            console.error('[Senior Error] Failed to load projects:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="error">Failed to load projects. Is the server running?</td></tr>';
        }
    }

    function renderProjectsTable(projects) {
        const tableBody = document.getElementById('projectsTableBody');

        if (!projects || projects.length === 0) {
            tableBody.innerHTML = '<tr><td style="text-align: center; color: #28a745;" colspan="6" >No projects found. Add one to get started!</td></tr>';
            return;
        }

        // --- EXPLICIT DATA MAPPING ---
        // We sort first, then map only the fields we want to show.
        const sortedProjects = projects.sort((a, b) => a.id - b.id);

        tableBody.innerHTML = sortedProjects.map((project, index) => {
            // We "Extract" only the fields we need (Filtering out the rest)
            const { id, name, year, live_url, github_url } = project;

            return `
            <tr>
                <!-- S/No: Purely Frontend Calculation -->
                <td style="font-weight: bold;">${index + 1}</td> 
                
                <!-- Display Data: Using the filtered fields -->
                <td>${name || 'N/A'}</td>
                <td>${year || 'N/A'}</td>
                <td><a href="${live_url}" target="_blank" rel="noopener noreferrer" class="table-link table-link-live">Live Link</a></td>
                <td><a href="${github_url}" target="_blank" rel="noopener noreferrer" class="table-link table-link-github">GitHub Link</a></td>
                
                <td>
                    <div class="action-btns">
                        <!-- ID: Kept only for backend operations -->
                        <button onclick="editProject(${id})" class="btn-edit">Edit</button>
                        <button onclick="deleteProject(${id})" class="btn-delete">Delete</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        console.log("[Senior Log] Table rendered with explicit data filtering.");
    }




    // Edit Project
    async function editProject(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/projects`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const projects = await response.json();
            const project = projects.find((item) => Number(item.id) === Number(id));

            if (!project) {
                alert('Project not found. Please refresh and try again.');
                return;
            }

            const idField = document.getElementById('editProjectId');
            const nameField = document.getElementById('editProjectName');
            const descriptionField = document.getElementById('editProjectDescription');
            const liveUrlField = document.getElementById('editProjectLiveUrl');
            const githubUrlField = document.getElementById('editProjectGithubUrl');
            const yearField = document.getElementById('editProjectYear');

            if (!idField || !nameField || !descriptionField || !liveUrlField || !githubUrlField || !yearField) {
                alert('Edit form is missing required fields.');
                return;
            }

            idField.value = project.id;
            nameField.value = project.name || '';
            descriptionField.value = project.description || '';
            liveUrlField.value = project.live_url || '';
            githubUrlField.value = project.github_url || '';
            yearField.value = project.year || new Date().getFullYear();

            openEditModal();
            nameField.focus();
        } catch (error) {
            console.error('Error editing project:', error);
            alert(`Failed to edit project: ${error.message}`);
        }
    }

    if (editProjectForm) {
        editProjectForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save Changes';

            const projectId = document.getElementById('editProjectId')?.value;
            const name = document.getElementById('editProjectName')?.value.trim() || '';
            const description = document.getElementById('editProjectDescription')?.value.trim() || '';
            const liveUrl = document.getElementById('editProjectLiveUrl')?.value.trim() || '';
            const githubUrl = document.getElementById('editProjectGithubUrl')?.value.trim() || '';
            const yearValue = document.getElementById('editProjectYear')?.value.trim() || '';

            if (!projectId) {
                alert('Missing project ID for edit operation.');
                return;
            }

            if (!name) {
                alert('Project name is required.');
                return;
            }

            const parsedYear = Number(yearValue);
            if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
                alert('Please enter a valid year between 1900 and 2100.');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<div class="spinner"></div> Saving...`;
            }

            const updatePayload = {
                name,
                description,
                live_url: liveUrl,
                github_url: githubUrl,
                year: parsedYear
            };

            try {
                const updateResponse = await fetch(`${API_BASE_URL}/admin/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });

                const rawResponse = await updateResponse.text();
                let result = {};

                if (rawResponse) {
                    try {
                        result = JSON.parse(rawResponse);
                    } catch (_) {
                        result = { error: rawResponse };
                    }
                }

                if (!updateResponse.ok) {
                    const serverError = result.error || result.message || `HTTP error! status: ${updateResponse.status}`;
                    throw new Error(serverError);
                }

                alert(result.message || 'Project updated successfully.');
                closeEditModal();
                loadProjectsTable();
            } catch (error) {
                console.error('Error updating project:', error);
                alert(`Failed to edit project: ${error.message}`);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    // Delete Project
    async function deleteProject(id) {
        if (!confirm(`Are you sure you want to delete project with ID: ${id}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/admin/projects/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            alert(result.message);
            loadProjectsTable(); // Refresh table
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project.');
        }
    }

    // Inline onclick handlers need global function references.
    window.loadProjectsTable = loadProjectsTable;
    window.editProject = editProject;
    window.deleteProject = deleteProject;
    window.restoreProject = restoreProject;
    window.permanentDelete = permanentDelete;
});

async function loadRecycleBin() {
    const body = document.getElementById('recycle-bin-body');
    if (!body) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/recycle-bin`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const projects = await response.json();

        if (!Array.isArray(projects) || projects.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Recycle Bin is empty.</td></tr>';
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
    } catch (e) {
        console.error('Error loading recycle bin:', e);
        body.innerHTML = '<tr><td colspan="4" class="error">Failed to load recycle bin.</td></tr>';
    }
}

async function restoreProject(id) {
    await fetch(`${API_BASE_URL}/admin/projects/${id}/restore`, { method: 'POST' });
    loadRecycleBin();
    loadProjectsTable(); // Refresh the main table too
}

async function permanentDelete(id) {
    if (!confirm("This cannot be undone. Delete forever?")) return;
    await fetch(`${API_BASE_URL}/admin/projects/${id}/permanent`, { method: 'DELETE' });
    loadRecycleBin();
}
