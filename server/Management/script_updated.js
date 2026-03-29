// // Management/script.js - Admin Dashboard
// const API_BASE_URL = 'http://localhost:5000/api'; // DOUBLE CHECK YOUR PORT!

// // 1. INITIALIZATION
// document.addEventListener('DOMContentLoaded', () => {
//     console.log("[Senior Log] 📄 Admin Dashboard Loaded.");
    
//     const editModal = document.getElementById('editProjectModal');
//     const editProjectForm = document.getElementById('edit-project-form');
//     const closeEditModalBtn = document.getElementById('closeEditModalBtn');
//     const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');

//     function openEditModal() {
//         if (!editModal) return;
//         editModal.classList.add('active');
//         editModal.setAttribute('aria-hidden', 'false');
//     }

//     function closeEditModal() {
//         if (!editModal) return;
//         editModal.classList.remove('active');
//         editModal.setAttribute('aria-hidden', 'true');
//         if (editProjectForm) {
//             editProjectForm.reset();
//         }
//     }

//     if (closeEditModalBtn) {
//         closeEditModalBtn.addEventListener('click', closeEditModal);
//     }

//     if (cancelEditModalBtn) {
//         cancelEditModalBtn.addEventListener('click', closeEditModal);
//     }

//     if (editModal) {
//         editModal.addEventListener('click', (event) => {
//             if (event.target === editModal) {
//                 closeEditModal();
//             }
//         });
//     }

//     document.addEventListener('keydown', (event) => {
//         if (event.key === 'Escape' && editModal && editModal.classList.contains('active')) {
//             closeEditModal();
//         }
//     });

//     // Sidebar Navigation
//     document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
//         link.addEventListener('click', function (e) {
//             e.preventDefault();
//             document.querySelectorAll('.sidebar-nav .nav-link').forEach(nav => nav.classList.remove('active'));
//             this.classList.add('active');

//             document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
//             const targetSection = document.getElementById(this.dataset.section);
//             if (targetSection) {
//                 targetSection.classList.add('active');
//             }

//             if (this.dataset.section === 'manage-projects') {
//                 loadProjectsTable();
//             }

//             if (this.dataset.section === 'recycle-bin') {
//                 loadRecycleBin();
//             }
//         });
//     });

//     // Project Tabs (Add New Project / View/Edit Projects)
//     document.querySelectorAll('.project-tabs .tab-button').forEach(button => {
//         button.addEventListener('click', function () {
//             document.querySelectorAll('.project-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
//             this.classList.add('active');

//             document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
//             const targetTab = document.getElementById(this.dataset.tab);
//             if (targetTab) {
//                 targetTab.classList.add('active');
//             }
//             if (this.dataset.tab === 'view-projects') {
//                 loadProjectsTable();
//             }
//         });
//     });

//     // Initial load for projects table
//     loadProjectsTable();

//     // Add Project Form Submission
//     const addProjectForm = document.getElementById('add-project-form');

//     if (addProjectForm) {
//         addProjectForm.addEventListener('submit', async function (e) {
//             e.preventDefault();

//             const submitBtn = this.querySelector('button[type="submit"]');
//             const originalBtnText = submitBtn.innerHTML;

//             submitBtn.disabled = true;
//             submitBtn.innerHTML = `<div class="spinner"></div> Adding Project...`;

//             const formData = new FormData(this);
//             const projectData = Object.fromEntries(formData.entries());

//             try {
//                 console.log("[Senior Log] Submitting project data to server...");

//                 const response = await fetch(`${API_BASE_URL}/admin/projects`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(projectData)
//                 });

//                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//                 const result = await response.json();
//                 console.log("[Senior Log] Server response:", result);

//                 alert("Success: " + result.message);
//                 this.reset();

//                 if (typeof loadProjectsTable === 'function') loadProjectsTable();

//                 document.querySelector('.project-tabs .tab-button[data-tab="view-projects"]').click();

//             } catch (error) {
//                 console.error('[Senior Error] Submission failed:', error);
//                 alert('Failed to add project. Please check the server logs.');
//             } finally {
//                 submitBtn.disabled = false;
//                 submitBtn.innerHTML = originalBtnText;
//             }
//         });
//     }

//     // 2. FETCH ACTIVE PROJECTS
//     async function loadProjectsTable() {
//         const tableBody = document.getElementById('projectsTableBody');
//         if (!tableBody) return;

//         try {
//             console.log("[Senior Log] 🚀 Fetching projects from API...");
//             const response = await fetch(`${API_BASE_URL}/projects`);
//             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

//             const projects = await response.json();
//             const sortedProjects = projects.sort((a, b) => a.id - b.id);
//             renderProjectsTable(sortedProjects);
//         } catch (error) {
//             console.error('[Senior Error] ❌ Failed to load projects:', error);
//             tableBody.innerHTML = '<tr><td colspan="6" class="error">Failed to load projects. Is the server running?</td></tr>';
//         }
//     }

//     // 3. RENDER ACTIVE PROJECTS TABLE
//     function renderProjectsTable(projects) {
//         const tableBody = document.getElementById('projectsTableBody');

//         if (!projects || projects.length === 0) {
//             tableBody.innerHTML = '<tr><td colspan="6">No projects found. Add one to get started!</td></tr>';
//             return;
//         }

//         const sortedProjects = projects.sort((a, b) => a.id - b.id);

//         tableBody.innerHTML = sortedProjects.map((project, index) => {
//             const { id, name, year, live_url, github_url } = project;

//             return `
//             <tr>
//                 <td style="font-weight: bold; color: #666;">${index + 1}</td> 
//                 <td>${name || 'N/A'}</td>
//                 <td>${year || 'N/A'}</td>
//                 <td><a href="${live_url}" target="_blank" rel="noopener noreferrer" class="table-link table-link-live">Live Link</a></td>
//                 <td><a href="${github_url}" target="_blank" rel="noopener noreferrer" class="table-link table-link-github">GitHub Link</a></td>
//                 <td>
//                     <div class="action-btns">
//                         <button onclick="editProject(${id})" class="btn-edit">Edit</button>
//                         <button onclick="deleteProject(${id})" class="btn-delete">Delete</button>
//                     </div>
//                 </td>
//             </tr>
//         `;
//         }).join('');

//         console.log("[Senior Log] 🎨 Table rendered with explicit data filtering.");
//     }

//     // Edit Project
//     async function editProject(id) {
//         try {
//             const response = await fetch(`${API_BASE_URL}/projects`);
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const projects = await response.json();
//             const project = projects.find((item) => Number(item.id) === Number(id));

//             if (!project) {
//                 alert('Project not found. Please refresh and try again.');
//                 return;
//             }

//             const idField = document.getElementById('editProjectId');
//             const nameField = document.getElementById('editProjectName');
//             const descriptionField = document.getElementById('editProjectDescription');
//             const liveUrlField = document.getElementById('editProjectLiveUrl');
//             const githubUrlField = document.getElementById('editProjectGithubUrl');
//             const yearField = document.getElementById('editProjectYear');

//             if (!idField || !nameField || !descriptionField || !liveUrlField || !githubUrlField || !yearField) {
//                 alert('Edit form is missing required fields.');
//                 return;
//             }

//             idField.value = project.id;
//             nameField.value = project.name || '';
//             descriptionField.value = project.description || '';
//             liveUrlField.value = project.live_url || '';
//             githubUrlField.value = project.github_url || '';
//             yearField.value = project.year || new Date().getFullYear();

//             openEditModal();
//             nameField.focus();
//         } catch (error) {
//             console.error('Error editing project:', error);
//             alert(`Failed to edit project: ${error.message}`);
//         }
//     }

//     if (editProjectForm) {
//         editProjectForm.addEventListener('submit', async function (event) {
//             event.preventDefault();

//             const submitBtn = this.querySelector('button[type="submit"]');
//             const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save Changes';

//             const projectId = document.getElementById('editProjectId')?.value;
//             const name = document.getElementById('editProjectName')?.value.trim() || '';
//             const description = document.getElementById('editProjectDescription')?.value.trim() || '';
//             const liveUrl = document.getElementById('editProjectLiveUrl')?.value.trim() || '';
//             const githubUrl = document.getElementById('editProjectGithubUrl')?.value.trim() || '';
//             const yearValue = document.getElementById('editProjectYear')?.value.trim() || '';

//             if (!projectId) {
//                 alert('Missing project ID for edit operation.');
//                 return;
//             }

//             if (!name) {
//                 alert('Project name is required.');
//                 return;
//             }

//             const parsedYear = Number(yearValue);
//             if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
//                 alert('Please enter a valid year between 1900 and 2100.');
//                 return;
//             }

//             if (submitBtn) {
//                 submitBtn.disabled = true;
//                 submitBtn.innerHTML = `<div class="spinner"></div> Saving...`;
//             }

//             const updatePayload = {
//                 name,
//                 description,
//                 live_url: liveUrl,
//                 github_url: githubUrl,
//                 year: parsedYear
//             };

//             try {
//                 const updateResponse = await fetch(`${API_BASE_URL}/admin/projects/${projectId}`, {
//                     method: 'PUT',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify(updatePayload)
//                 });

//                 const rawResponse = await updateResponse.text();
//                 let result = {};

//                 if (rawResponse) {
//                     try {
//                         result = JSON.parse(rawResponse);
//                     } catch (_) {
//                         result = { error: rawResponse };
//                     }
//                 }

//                 if (!updateResponse.ok) {
//                     const serverError = result.error || result.message || `HTTP error! status: ${updateResponse.status}`;
//                     throw new Error(serverError);
//                 }

//                 alert(result.message || 'Project updated successfully.');
//                 closeEditModal();
//                 loadProjectsTable();
//             } catch (error) {
//                 console.error('Error updating project:', error);
//                 alert(`Failed to edit project: ${error.message}`);
//             } finally {
//                 if (submitBtn) {
//                     submitBtn.disabled = false;
//                     submitBtn.innerHTML = originalBtnText;
//                 }
//             }
//         });
//     }

//     // 4. SOFT DELETE (Move to Recycle Bin)
//     async function deleteProject(id) {
//         if (!confirm("⚠️ Move this project to the Recycle Bin? It will be hidden from your portfolio.")) {
//             return;
//         }

//         try {
//             console.log("[Senior Log] 🗑️ Moving project to trash...");
//             const response = await fetch(`${API_BASE_URL}/admin/projects/${id}`, { method: 'DELETE' });
//             const result = await response.json();
//             if (response.ok) {
//                 alert("✅ " + result.message);
//                 loadProjectsTable();
//             }
//         } catch (error) {
//             console.error('[Senior Error] ❌ Delete failed:', error);
//             alert('Failed to move project to trash.');
//         }
//     }

//     // Inline onclick handlers need global function references
//     window.editProject = editProject;
//     window.deleteProject = deleteProject;
//     window.restoreProject = restoreProject;
//     window.permanentDelete = permanentDelete;
// });

// // --- RECYCLE BIN LOGIC ---

// // 5. FETCH TRASHED PROJECTS
// async function loadRecycleBin() {
//     const tableBody = document.getElementById('recycle-bin-body');
//     if (!tableBody) return;

//     try {
//         console.log("[Senior Log] 🚀 Fetching Recycle Bin...");
//         const response = await fetch(`${API_BASE_URL}/admin/recycle-bin`);
//         const projects = await response.json();
        
//         if (projects.length === 0) {
//             tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">🎉 Recycle Bin is empty.</td></tr>';
//             return;
//         }

//         tableBody.innerHTML = projects.map((project, index) => `
//             <tr>
//                 <td style="font-weight: bold; color: #666;">${index + 1}</td>
//                 <td>${project.name}</td>
//                 <td>${project.year}</td>
//                 <td>
//                     <div class="action-btns">
//                         <button onclick="restoreProject(${project.id})" class="btn-restore">Restore</button>
//                         <button onclick="permanentDelete(${project.id})" class="btn-delete">Delete Forever</button>
//                     </div>
//                 </td>
//             </tr>
//         `).join('');
//     } catch (error) {
//         console.error('[Senior Error] ❌ Failed to load trash:', error);
//     }
// }

// // 6. RESTORE PROJECT
// async function restoreProject(id) {
//     try {
//         console.log("[Senior Log] ♻️ Restoring project...");
//         const response = await fetch(`${API_BASE_URL}/admin/projects/${id}/restore`, { method: 'POST' });
//         const result = await response.json();
//         if (response.ok) {
//             alert("✅ " + result.message);
//             loadRecycleBin();
//             loadProjectsTable();
//         }
//     } catch (error) {
//         console.error('[Senior Error] ❌ Restore failed:', error);
//         alert('Failed to restore project.');
//     }
// }

// // 7. PERMANENT DELETE (Final Step)
// async function permanentDelete(id) {
//     if (!confirm("⚠️ WARNING: This will permanently delete the project and its image file. This cannot be undone!")) {
//         return;
//     }

//     try {
//         console.log("[Senior Log] 🗑️ Permanently deleting project...");
//         const response = await fetch(`${API_BASE_URL}/admin/projects/${id}/permanent`, { method: 'DELETE' });
//         const result = await response.json();
//         if (response.ok) {
//             alert("🗑️ " + result.message);
//             loadRecycleBin();
//         }
//     } catch (error) {
//         console.error('[Senior Error] ❌ Permanent delete failed:', error);
//         alert('Failed to permanently delete project.');
//     }
// }
