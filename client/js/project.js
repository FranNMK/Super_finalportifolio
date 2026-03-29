
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : 'https://your-backend-name.onrender.com/api';


async function fetchProjects(year = 'all') {
    console.log(` Fetching projects: ${year}`);
    const container = document.getElementById('projects-container');

    if (!container) return;

    container.innerHTML = '<p>Loading projects...</p>';

    try {
        const response = await fetch(
            `${API_BASE_URL}/projects${year !== 'all' ? `?year=${year}` : ''}`
        );

        if (!response.ok) throw new Error("API Error");

        const projects = await response.json();

        if (projects.length === 0) {
            container.innerHTML = '<p>No projects found.</p>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card">
                <img src="${project.image_path || 'images/default.jpg'}"
                     alt="${project.name}"
                     onerror="this.src='images/default.jpg';">

                <h3>${project.name}</h3>
                <p>${project.description}</p>

                <div class="links">
                    ${project.live_url ? `<a href="${project.live_url}" target="_blank">Live</a>` : ''}
                    ${project.github_url ? `<a href="${project.github_url}" target="_blank">GitHub</a>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Fetch failed:", error);
        container.innerHTML = '<p>Failed to load projects.</p>';
    }
}

async function initYearTabs() {
    const tabsContainer = document.querySelector('.year-tabs');
    if (!tabsContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/projects/years`);
        const years = await response.json();

        years.sort((a, b) => b - a);

        // IMPORTANT → restore class name
        tabsContainer.innerHTML =
            `<button class="tab-button active" data-year="all">All</button>`;

        years.forEach(year => {
            tabsContainer.innerHTML +=
                `<button class="tab-button" data-year="${year}">${year}</button>`;
        });

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function () {

                document.querySelectorAll('.tab-button')
                    .forEach(b => b.classList.remove('active'));

                this.classList.add('active');

                fetchProjects(this.dataset.year);
            });
        });

    } catch (e) {
        console.error("Tabs init failed", e);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initYearTabs();
    fetchProjects('all');
});