
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';



/**
 * Convert any YouTube URL format to a proper embed URL.
 * Returns null for non-YouTube / Vimeo URLs that are already embeds,
 * or passes them through unchanged if they already contain /embed/.
 *
 * Handles:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID  (already correct — pass through)
 *   https://player.vimeo.com/video/ID       (already correct — pass through)
 *   null / undefined / empty string         (returns null)
 */
function toEmbedUrl(url) {
    if (!url) return null;

    // Already an embed URL — use as-is
    if (/\/embed\/|player\.vimeo\.com/i.test(url)) return url;

    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

    // youtube.com/watch?v=VIDEO_ID  or  youtube.com/shorts/VIDEO_ID
    const watchMatch = url.match(/(?:v=|shorts\/)([A-Za-z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

    // Unknown format — skip the iframe to avoid reCAPTCHA / consent pages
    return null;
}

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

        container.innerHTML = projects.map(project => {
            const embedUrl = toEmbedUrl(project.demo_video_url);
            return `
            <div class="project-card">
                ${project.image_path
                    ? `<div class="project-card-media"><img src="${project.image_path}" alt="${project.name}" onerror="this.parentElement.outerHTML='<div class=project-card-no-image><span>No Preview</span></div>'"></div>`
                    : `<div class="project-card-no-image"><span>No Preview</span></div>`
                }
                <h3>${project.name}</h3>
                <p>${project.description || ''}</p>
                ${embedUrl ? `
                <div class="project-card-video">
                    <iframe src="${embedUrl}" title="${project.name} demo" allowfullscreen loading="lazy"></iframe>
                </div>` : ''}
                <div class="links">
                    ${project.live_url ? `<a href="${project.live_url}" target="_blank" class="link-live"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
                    ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="link-github"><i class="fab fa-github"></i> GitHub</a>` : ''}
                    ${project.demo_video_url ? `<a href="${project.demo_video_url}" target="_blank" class="link-video"><i class="fab fa-youtube"></i> Demo Video</a>` : ''}
                </div>
            </div>`;
        }).join('');

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