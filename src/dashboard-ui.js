// UI rendering and DOM logic for GitHub Actions Dashboard
import { fetchWithTimeoutAndRetry } from './dashboard-utils.js';

export function injectDashboardStyles() {
    fetch('dashboard-style.css')
        .then(r => r.text())
        .then(css => {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        });
}

export function renderDashboard({ workflows, container }) {
    // Add theme toggle and dashboard root
    const dashboardRoot = document.createElement('div');
    dashboardRoot.className = 'gh-dashboard-root';
    addThemeToggle(dashboardRoot);
    container.appendChild(dashboardRoot);

    // Group workflows by Group and Category
    const groups = {};
    workflows.forEach(workflow => {
        const parts = workflow.name.split(' - ');
        const workflowEntry = {
            name: parts.length >= 3 ? parts.slice(2).join(' - ') : workflow.name,
            url: workflow.html_url,
            badge_url: workflow.badge_url || null,
            state: workflow.state // include state for visual indication
        };
        if (parts.length >= 3) {
            const group = parts[0];
            const category = parts[1];
            if (!groups[group]) groups[group] = {};
            if (!groups[group][category]) groups[group][category] = [];
            groups[group][category].push(workflowEntry);
        } else {
            if (!groups['Uncategorized']) groups['Uncategorized'] = {};
            if (!groups['Uncategorized']['Other']) groups['Uncategorized']['Other'] = [];
            groups['Uncategorized']['Other'].push(workflowEntry);
        }
    });

    // Create grid wrapper
    const grid = document.createElement('div');
    grid.className = 'gh-dashboard-grid';
    const categoryCount = Object.keys(groups).length;
    if (categoryCount < 3) {
        grid.classList.add('fewer');
        grid.style.setProperty('--cat-count', categoryCount);
    } else {
        grid.classList.add('max-3');
    }
    Object.keys(groups).forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'gh-dashboard-item';
        if (categoryCount < 3) {
            groupDiv.classList.add('flex-fill');
        } else {
            groupDiv.classList.add('flex-third');
        }
        const groupHeading = document.createElement('div');
        groupHeading.style.fontWeight = 'bold';
        groupHeading.style.marginBottom = '10px';
        groupHeading.style.fontSize = '1.15em';
        groupHeading.textContent = group;
        groupDiv.appendChild(groupHeading);
        Object.keys(groups[group]).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'gh-category-label';
            categoryDiv.textContent = category;
            groupDiv.appendChild(categoryDiv);
            const namesList = document.createElement('div');
            namesList.className = 'gh-names-list';
            // Sort entries alphabetically by name
            const sortedEntries = groups[group][category].slice().sort((a, b) => a.name.localeCompare(b.name));
            sortedEntries.forEach(entry => {
                // Robustly construct the /actions/workflows/{filename} URL
                let fileUrl = entry.url;
                try {
                    const urlObj = new URL(fileUrl);
                    const pathParts = urlObj.pathname.split('/');
                    if (pathParts.length >= 6) {
                        const repoBase = urlObj.origin + '/' + pathParts[1] + '/' + pathParts[2];
                        const filename = pathParts.slice(-1)[0];
                        fileUrl = `${repoBase}/actions/workflows/${filename}`;
                    }
                } catch (e) { /* fallback to entry.url */ }
                const namePill = document.createElement('a');
                namePill.className = 'gh-name-pill';
                namePill.href = fileUrl;
                namePill.target = '_blank';
                namePill.rel = 'noopener noreferrer';
                namePill.style.display = 'flex';
                namePill.style.alignItems = 'center';
                namePill.style.justifyContent = 'space-between';
                namePill.style.gap = '12px';
                namePill.style.minHeight = '32px';
                namePill.style.padding = '8px 16px';
                // Visually indicate if workflow is not active
                if (entry.state && entry.state !== 'active') {
                    namePill.style.opacity = '0.5';
                    namePill.style.textDecoration = 'line-through';
                    namePill.title = `Workflow state: ${entry.state}`;
                }
                // Name span
                const nameSpan = document.createElement('span');
                nameSpan.textContent = entry.name;
                // Remove truncation styles for full name display
                nameSpan.style.flex = '1 1 auto';
                nameSpan.style.overflow = 'visible';
                nameSpan.style.textOverflow = 'unset';
                nameSpan.style.whiteSpace = 'normal';
                namePill.appendChild(nameSpan);
                // Status span
                let statusSpan = document.createElement('span');
                statusSpan.style.fontWeight = 'bold';
                statusSpan.style.fontSize = '0.95em';
                statusSpan.style.color = '#57606a';
                statusSpan.style.whiteSpace = 'nowrap';
                statusSpan.style.marginLeft = '16px';
                if (entry.badge_url) {
                    statusSpan.textContent = ' [ … ]';
                    namePill.appendChild(statusSpan);
                    fetchWithTimeoutAndRetry(entry.badge_url, {}, 8000, 3)
                        .then(r => r.text())
                        .then(svg => {
                            try {
                                const parser = new DOMParser();
                                const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
                                const texts = svgDoc.querySelectorAll('text');
                                if (texts.length > 0) {
                                    const status = texts[texts.length - 1].textContent.trim();
                                    statusSpan.textContent = ` [${status}]`;
                                    if (/pass|success|ok/i.test(status)) {
                                        statusSpan.style.color = '#2da44e';
                                    } else if (/fail|error/i.test(status)) {
                                        statusSpan.style.color = '#cf222e';
                                    } else if (/cancel|skip/i.test(status)) {
                                        statusSpan.style.color = '#d29922';
                                    } else {
                                        statusSpan.style.color = '#57606a';
                                    }
                                } else {
                                    statusSpan.textContent = ' [unknown]';
                                    statusSpan.style.color = '#57606a';
                                }
                            } catch (e) {
                                statusSpan.textContent = ' [unknown]';
                                statusSpan.style.color = '#57606a';
                                console.error('Badge SVG parse error:', e);
                            }
                        })
                        .catch((err) => {
                            statusSpan.textContent = ' [unknown]';
                            statusSpan.style.color = '#57606a';
                            console.error('Badge fetch error:', err);
                        });
                } else {
                    statusSpan.textContent = ' [no badge]';
                    namePill.appendChild(statusSpan);
                }
                namePill.appendChild(statusSpan);
                namesList.appendChild(namePill);
            });
            groupDiv.appendChild(namesList);
        });
        grid.appendChild(groupDiv);
    });
    dashboardRoot.appendChild(grid);

    // Add scroll arrows above the grid (move this before grid is appended)
    const scrollBar = document.createElement('div');
    scrollBar.className = 'gh-dashboard-scroll-arrows';
    const leftBtn = document.createElement('button');
    leftBtn.className = 'gh-dashboard-arrow-btn';
    leftBtn.innerHTML = '&#8592;';
    leftBtn.title = 'Scroll left';
    leftBtn.disabled = true;
    const rightBtn = document.createElement('button');
    rightBtn.className = 'gh-dashboard-arrow-btn';
    rightBtn.innerHTML = '&#8594;';
    rightBtn.title = 'Scroll right';
    scrollBar.appendChild(leftBtn);
    scrollBar.appendChild(document.createElement('div')); // Spacer
    scrollBar.appendChild(rightBtn);
    dashboardRoot.appendChild(scrollBar);

    // Now append the grid after the scrollBar
    dashboardRoot.appendChild(grid);

    // Scroll logic
    function updateArrowState() {
        leftBtn.disabled = grid.scrollLeft <= 5;
        rightBtn.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 5;
    }
    leftBtn.onclick = () => {
        grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: 'smooth' });
    };
    rightBtn.onclick = () => {
        grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: 'smooth' });
    };
    grid.addEventListener('scroll', updateArrowState);
    setTimeout(updateArrowState, 100); // Initial state
}

export function addThemeToggle(dashboardRoot) {
    let toggle = document.createElement('button');
    toggle.className = 'gh-theme-toggle';
    let darkMode = localStorage.getItem('gh_dashboard_dark_mode') === 'true';
    if (darkMode) {
        dashboardRoot.classList.add('gh-dark-mode');
        toggle.textContent = 'Switch to Light Mode';
    } else {
        toggle.textContent = 'Switch to Dark Mode';
    }
    toggle.onclick = function() {
        darkMode = !darkMode;
        if (darkMode) {
            dashboardRoot.classList.add('gh-dark-mode');
            toggle.textContent = 'Switch to Light Mode';
        } else {
            dashboardRoot.classList.remove('gh-dark-mode');
            toggle.textContent = 'Switch to Dark Mode';
        }
        localStorage.setItem('gh_dashboard_dark_mode', darkMode);
    };
    dashboardRoot.appendChild(toggle);
}
