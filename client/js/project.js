
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';



function showProjectsSpinner() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    container.innerHTML = `
        <div class="projects-spinner" style="grid-column:1/-1;">
            <div class="spinner-ring"></div>
            <p>Loading projects...</p>
        </div>`;
}

async function fetchProjects(year = 'all') {
    const container = document.getElementById('projects-container');
    if (!container) return;

    showProjectsSpinner();

    try {
        const response = await fetch(
            `${API_BASE_URL}/projects${year !== 'all' ? `?year=${year}` : ''}`
        );

        if (!response.ok) throw new Error("API Error");

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;">No projects found.</p>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card">
                ${project.image_path
                    ? `<div class="project-card-media"><img src="${project.image_path}" alt="${project.name}" onerror="this.parentElement.outerHTML='<div class=project-card-no-image><span>No Preview</span></div>'"></div>`
                    : `<div class="project-card-no-image"><span>No Preview</span></div>`
                }
                <h3>${project.name}</h3>
                <p>${project.description || ''}</p>
                ${project.demo_video_url ? `
                <div class="project-card-video">
                    <iframe src="${project.demo_video_url}" title="${project.name} demo" allowfullscreen loading="lazy"></iframe>
                </div>` : ''}
                <div class="links">
                    ${project.live_url ? `<a href="${project.live_url}" target="_blank" class="link-live"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
                    ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="link-github"><i class="fab fa-github"></i> GitHub</a>` : ''}
                    ${project.demo_video_url ? `<a href="${project.demo_video_url}" target="_blank" class="link-video"><i class="fab fa-youtube"></i> Demo Video</a>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Fetch failed:", error);
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#c00;">Failed to load projects. Please try again later.</p>';
    }
}

async function initYearTabs() {
    const tabsContainer = document.querySelector('.year-tabs');
    if (!tabsContainer) return;

    // Show skeleton tabs while loading
    tabsContainer.innerHTML = `
        <span class="tab-skeleton"></span>
        <span class="tab-skeleton"></span>
        <span class="tab-skeleton"></span>`;

    try {
        const response = await fetch(`${API_BASE_URL}/projects/years`);
        if (!response.ok) throw new Error("Years API error");
        const years = await response.json();

        years.sort((a, b) => b - a);

        tabsContainer.innerHTML = `<button class="tab-button active" data-year="all">All</button>`;
        years.forEach(year => {
            tabsContainer.innerHTML += `<button class="tab-button" data-year="${year}">${year}</button>`;
        });

        tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function () {
                tabsContainer.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                fetchProjects(this.dataset.year);
            });
        });

    } catch (e) {
        console.error("Tabs init failed", e);
        tabsContainer.innerHTML = `<button class="tab-button active" data-year="all">All</button>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initYearTabs();
    fetchProjects('all');
});