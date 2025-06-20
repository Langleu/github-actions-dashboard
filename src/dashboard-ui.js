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

// Helper: get repo key for localStorage
function getRepoKey() {
    const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/actions/);
    if (match) return `gh_dashboard_categories_${match[1]}_${match[2]}`;
    return null;
}

function saveCategories(categories) {
    const key = getRepoKey();
    if (key) localStorage.setItem(key, JSON.stringify(categories));
}

function loadCategories() {
    const key = getRepoKey();
    if (key) {
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
    }
    return null;
}

function resetCategories(workflows) {
    let categories = {};
    workflows.forEach(wf => {
        const parts = wf.name.split(' - ');
        const group = parts.length >= 3 ? parts[0] : 'Uncategorized';
        if (!categories[group]) categories[group] = [];
        categories[group].push(wf.id);
    });
    saveCategories(categories);
    return categories;
}

// Helper: Move workflow to a new category, ensuring uniqueness
function moveWorkflowToCategory(wfId, newCategory, categories) {
    // Remove from all categories (compare as string for robustness)
    Object.keys(categories).forEach(cat => {
        categories[cat] = categories[cat].filter(id => String(id) !== String(wfId));
    });
    // Add to new category
    if (!categories[newCategory]) categories[newCategory] = [];
    categories[newCategory].push(wfId);
}

export function renderDashboard({ workflows, container, categories: passedCategories }) {
    // Load or initialize categories
    let categories = passedCategories || loadCategories();
    if (!categories) {
        categories = resetCategories(workflows);
    }
    const workflowMap = {};
    workflows.forEach(wf => { workflowMap[wf.id] = wf; });

    const dashboardRoot = document.createElement('div');
    dashboardRoot.className = 'gh-dashboard-root';

    // Navigation bar: categories management (left) and theme toggle (right)
    const navBar = document.createElement('div');
    navBar.style.display = 'flex';
    navBar.style.justifyContent = 'space-between';
    navBar.style.alignItems = 'center';
    navBar.style.marginBottom = '18px';

    // Left: Category management UI
    const catBar = document.createElement('div');
    catBar.style.display = 'flex';
    catBar.style.gap = '10px';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Category';
    addBtn.className = 'gh-theme-toggle';
    addBtn.onclick = () => {
        const name = prompt('New category name:');
        if (name && !categories[name]) {
            categories[name] = [];
            saveCategories(categories);
            container.innerHTML = '';
            renderDashboard({ workflows, container });
        }
    };
    catBar.appendChild(addBtn);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Categories';
    resetBtn.className = 'gh-theme-toggle';
    resetBtn.onclick = () => {
        if (confirm('Reset all categories to default grouping?')) {
            categories = resetCategories(workflows);
            container.innerHTML = '';
            renderDashboard({ workflows, container });
        }
    };
    catBar.appendChild(resetBtn);
    navBar.appendChild(catBar);

    // Right: Theme toggle (directly in navBar, not in a wrapper div)
    addThemeToggle(navBar, dashboardRoot);
    dashboardRoot.appendChild(navBar);

    // Main grid
    const grid = document.createElement('div');
    grid.className = 'gh-dashboard-grid';

    // If categories exist (custom), use them; otherwise, use auto-grouping fallback
    if (categories && Object.keys(categories).length > 0 && Object.values(categories).some(arr => arr.length > 0)) {
        // --- CUSTOM CATEGORY MODE ---
        Object.keys(categories).forEach(category => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'gh-dashboard-item';
            // Category heading with rename/delete (existing logic)
            const groupHeading = document.createElement('div');
            groupHeading.style.display = 'flex';
            groupHeading.style.alignItems = 'center';
            groupHeading.style.justifyContent = 'space-between';
            groupHeading.style.marginBottom = '10px';
            groupHeading.style.fontWeight = 'bold';
            groupHeading.style.fontSize = '1.15em';
            // Drag handle (left)
            const dragHandle = document.createElement('span');
            dragHandle.className = 'gh-drag-handle';
            dragHandle.style.cursor = 'grab';
            dragHandle.ondragstart = e => {
                e.preventDefault();
            };
            groupHeading.appendChild(dragHandle);
            // Name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = category;
            groupHeading.appendChild(nameSpan);
            // Rename button (right)
            const renameBtn = document.createElement('button');
            renameBtn.textContent = '✎';
            renameBtn.className = 'gh-rename-btn';
            renameBtn.style.marginLeft = '8px';
            renameBtn.onclick = () => {
                const newName = prompt('Rename category to:', category);
                if (newName && newName !== category && !categories[newName]) {
                    categories[newName] = categories[category];
                    delete categories[category];
                    saveCategories(categories);
                    container.innerHTML = '';
                    renderDashboard({ workflows, container });
                }
            };
            groupHeading.appendChild(renameBtn);
            // Delete button (right)
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.className = 'gh-delete-btn';
            deleteBtn.style.marginLeft = '4px';
            deleteBtn.onclick = () => {
                if (confirm(`Delete category "${category}"?`)) {
                    delete categories[category];
                    saveCategories(categories);
                    container.innerHTML = '';
                    renderDashboard({ workflows, container });
                }
            };
            groupHeading.appendChild(deleteBtn);
            groupDiv.appendChild(groupHeading);
            // Names list (drop target)
            const namesList = document.createElement('div');
            namesList.className = 'gh-names-list';
            namesList.ondragover = e => { e.preventDefault(); namesList.style.background = '#eaecef'; };
            namesList.ondragleave = e => { namesList.style.background = ''; };
            namesList.ondrop = e => {
                e.preventDefault();
                namesList.style.background = '';
                const wfId = e.dataTransfer.getData('text/plain');
                if (!categories[category].includes(wfId)) {
                    moveWorkflowToCategory(wfId, category, categories);
                    saveCategories(categories);
                    container.innerHTML = '';
                    renderDashboard({ workflows, container, categories });
                }
            };
            // If category is empty, show a placeholder for drop
            if (categories[category].length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = 'Drop workflow here';
                emptyMsg.style.color = '#888';
                emptyMsg.style.fontStyle = 'italic';
                emptyMsg.style.padding = '12px 0';
                namesList.appendChild(emptyMsg);
            }
            categories[category].forEach(wfId => {
                const wf = workflowMap[wfId];
                if (!wf) return;
                const namePill = document.createElement('a');
                namePill.className = 'gh-name-pill';
                namePill.style.display = 'flex';
                namePill.style.justifyContent = 'space-between';
                namePill.style.alignItems = 'center';
                namePill.style.gap = '8px';
                namePill.textContent = '';
                // Only show Name part if pattern matches
                const nameParts = wf.name.split(' - ');
                let displayName = nameParts.length >= 3 ? nameParts.slice(2).join(' - ') : wf.name;
                const nameSpan = document.createElement('span');
                nameSpan.textContent = displayName;
                nameSpan.title = wf.name;
                namePill.appendChild(nameSpan);
                // Build correct workflow link
                const repoMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
                if (repoMatch && wf.path) {
                    const owner = repoMatch[1];
                    const repo = repoMatch[2];
                    const filename = wf.path.split('/').pop();
                    namePill.href = `/${owner}/${repo}/actions/workflows/${filename}`;
                } else {
                    namePill.href = '#';
                }
                namePill.target = '_blank';
                namePill.rel = 'noopener noreferrer';
                namePill.draggable = true;
                namePill.ondragstart = e => {
                    e.dataTransfer.setData('text/plain', wf.id);
                };
                if (wf.state && wf.state !== 'active') {
                    namePill.style.opacity = '0.5';
                    namePill.style.textDecoration = 'line-through';
                    namePill.title = `Workflow state: ${wf.state}`;
                }
                let statusSpan = document.createElement('span');
                statusSpan.style.fontWeight = 'bold';
                statusSpan.style.fontSize = '0.95em';
                statusSpan.style.color = '#57606a';
                statusSpan.style.whiteSpace = 'nowrap';
                statusSpan.style.marginLeft = 'auto';
                if (wf.badge_url) {
                    statusSpan.textContent = ' [ … ]';
                    namePill.appendChild(statusSpan);
                    fetchWithTimeoutAndRetry(wf.badge_url, {}, 8000, 3)
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
                namesList.appendChild(namePill);
            });
            groupDiv.appendChild(namesList);
            grid.appendChild(groupDiv);
        });
    } else {
        // --- AUTO-GROUPING FALLBACK ---
        // Build nested structure: Group -> Category -> [Workflows]
        // 1. Collect all workflows by group/category
        let groupMap = {};
        workflows.forEach(wf => {
            const parts = wf.name.split(' - ');
            if (parts.length >= 3) {
                const group = parts[0];
                const category = parts[1];
                if (!groupMap[group]) groupMap[group] = {};
                if (!groupMap[group][category]) groupMap[group][category] = [];
                groupMap[group][category].push(wf);
            } else {
                // Fallback: Uncategorized
                if (!groupMap['Uncategorized']) groupMap['Uncategorized'] = { '': [] };
                groupMap['Uncategorized'][''].push(wf);
            }
        });

        // 2. Render groups and categories
        Object.keys(groupMap).forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'gh-dashboard-item';
            // Group heading
            const groupHeading = document.createElement('div');
            groupHeading.textContent = group;
            groupHeading.style.fontWeight = 'bold';
            groupHeading.style.fontSize = '1.15em';
            groupHeading.style.marginBottom = '8px';
            groupDiv.appendChild(groupHeading);
            Object.keys(groupMap[group]).forEach(category => {
                if (category) {
                    const catHeading = document.createElement('div');
                    catHeading.textContent = category;
                    catHeading.style.fontWeight = '500';
                    catHeading.style.fontSize = '1em';
                    catHeading.style.margin = '6px 0 4px 0';
                    catHeading.style.color = '#57606a';
                    groupDiv.appendChild(catHeading);
                }
                groupMap[group][category].forEach(wf => {
                    const namePill = document.createElement('a');
                    namePill.className = 'gh-name-pill';
                    namePill.style.display = 'flex';
                    namePill.style.justifyContent = 'space-between';
                    namePill.style.alignItems = 'center';
                    namePill.style.gap = '8px';
                    namePill.textContent = '';
                    const nameParts = wf.name.split(' - ');
                    let displayName = nameParts.length >= 3 ? nameParts.slice(2).join(' - ') : wf.name;
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = displayName;
                    nameSpan.title = wf.name;
                    namePill.appendChild(nameSpan);
                    const repoMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
                    if (repoMatch && wf.path) {
                        const owner = repoMatch[1];
                        const repo = repoMatch[2];
                        const filename = wf.path.split('/').pop();
                        namePill.href = `/${owner}/${repo}/actions/workflows/${filename}`;
                    } else {
                        namePill.href = '#';
                    }
                    namePill.target = '_blank';
                    namePill.rel = 'noopener noreferrer';
                    namePill.draggable = true;
                    namePill.ondragstart = e => {
                        e.dataTransfer.setData('text/plain', wf.id);
                    };
                    if (wf.state && wf.state !== 'active') {
                        namePill.style.opacity = '0.5';
                        namePill.style.textDecoration = 'line-through';
                        namePill.title = `Workflow state: ${wf.state}`;
                    }
                    let statusSpan = document.createElement('span');
                    statusSpan.style.fontWeight = 'bold';
                    statusSpan.style.fontSize = '0.95em';
                    statusSpan.style.color = '#57606a';
                    statusSpan.style.whiteSpace = 'nowrap';
                    statusSpan.style.marginLeft = 'auto';
                    if (wf.badge_url) {
                        statusSpan.textContent = ' [ … ]';
                        namePill.appendChild(statusSpan);
                        fetchWithTimeoutAndRetry(wf.badge_url, {}, 8000, 3)
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
                    groupDiv.appendChild(namePill);
                });
            });
            grid.appendChild(groupDiv);
        });
    }
    dashboardRoot.appendChild(grid);
    container.innerHTML = '';
    container.appendChild(dashboardRoot);
}

export function addThemeToggle(navBar, dashboardRoot) {
    let toggle = document.createElement('button');
    toggle.className = 'gh-theme-toggle';
    let darkMode = localStorage.getItem('gh_dashboard_dark_mode') === 'true';
    if (darkMode) {
        dashboardRoot.classList.add('gh-dark-mode');
        toggle.textContent = 'Switch to Light Mode';
    } else {
        dashboardRoot.classList.remove('gh-dark-mode');
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
    navBar.appendChild(toggle);
}
