// ==UserScript==
// @name         GitHub Actions Dashboard
// @namespace    http://tampermonkey.net/
// @version      2025-06-20
// @description  A better GitHub Actions Overview
// @author       Langleu
// @match        https://github.com/*/*/actions
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("Debug: Tampermonkey script started");

    // Remove contents of the div with class 'container-xl'
    const container = document.querySelector('div.container-xl');
    if (container) {
        container.innerHTML = '';
    }

    // Add grid styles to the page
    const style = document.createElement('style');
    style.textContent = `
        .gh-dashboard-root {
            background: var(--gh-bg, #f6f8fa);
            color: var(--gh-text, #24292f);
            border-radius: 12px;
            padding: 24px 0 0 0;
        }
        .gh-dashboard-root.gh-dark-mode {
            --gh-bg: #22272e;
            --gh-card-bg: #22272e;
            --gh-card-border: #30363d;
            --gh-card-shadow: 0 2px 8px rgba(0,0,0,0.18);
            --gh-card-hover-bg: #272b33;
            --gh-text: #c9d1d9;
            --gh-pill-bg: #22272e;
            --gh-pill-hover-bg: #30363d;
        }
        .gh-dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
            padding: 30px 0;
        }
        .gh-dashboard-item {
            background: var(--gh-card-bg, #fff);
            border-radius: 10px;
            box-shadow: var(--gh-card-shadow, 0 2px 8px rgba(0,0,0,0.04));
            border: 1px solid var(--gh-card-border, #d0d7de);
            padding: 24px 18px;
            font-size: 1.1em;
            font-weight: 500;
            color: var(--gh-text, #24292f);
            text-align: left;
            transition: box-shadow 0.2s, background 0.2s, color 0.2s;
        }
        .gh-dashboard-item:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.10);
            background: var(--gh-card-hover-bg, #eaecef);
        }
        .gh-category-label {
            font-weight: 600;
            margin: 8px 0 4px 0;
            font-size: 1em;
        }
        .gh-names-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 10px;
        }
        .gh-name-pill {
            background: var(--gh-pill-bg, #fff);
            border: 1px solid var(--gh-card-border, #d0d7de);
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 0.98em;
            font-weight: 400;
            color: var(--gh-text, #24292f);
            margin: 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            transition: background 0.2s, box-shadow 0.2s, color 0.2s;
            width: 100%;
            box-sizing: border-box;
        }
        .gh-name-pill:hover {
            background: var(--gh-pill-hover-bg, #f0f6fc);
            box-shadow: 0 2px 6px rgba(0,0,0,0.07);
        }
        .gh-theme-toggle {
            display: inline-block;
            margin: 18px 0 18px 0;
            padding: 8px 18px;
            border-radius: 6px;
            border: 1px solid var(--gh-card-border, #d0d7de);
            background: var(--gh-card-bg, #fff);
            color: var(--gh-text, #24292f);
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, color 0.2s, border 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .gh-theme-toggle:hover {
            background: var(--gh-card-hover-bg, #eaecef);
        }
    `;
    document.head.appendChild(style);

    // Add theme toggle button and dashboard root
    function addThemeToggleAndRoot() {
        const container = document.querySelector('div.container-xl');
        if (!container) return null;
        // Create dashboard root
        const dashboardRoot = document.createElement('div');
        dashboardRoot.className = 'gh-dashboard-root';
        // Add theme toggle button
        let toggle = document.createElement('button');
        toggle.className = 'gh-theme-toggle';
        // Restore theme from localStorage
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
        // Clear container and add dashboard root
        container.innerHTML = '';
        container.appendChild(dashboardRoot);
        return dashboardRoot;
    }
    const dashboardRoot = addThemeToggleAndRoot();

    // Dynamically determine the API URL based on the current /actions page
    const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/actions/);
    let apiUrl = null;
    if (match) {
        const owner = match[1];
        const repo = match[2];
        apiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;
    }
    if (!apiUrl) {
        console.error('Could not determine repository for GitHub Actions dashboard.');
        return;
    }

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json(); // Parse as JSON
        })
        .then(data => {
            if (dashboardRoot && Array.isArray(data.workflows)) {
                // Group workflows by Group and Category, keep html_url
                const groups = {};
                data.workflows.forEach(workflow => {
                    const parts = workflow.name.split(' - ');
                    const workflowEntry = { name: parts.length >= 3 ? parts.slice(2).join(' - ') : workflow.name, url: workflow.html_url };
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
                Object.keys(groups).forEach(group => {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'gh-dashboard-item';
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
                                // Find the repo base: https://github.com/org/repo
                                const pathParts = urlObj.pathname.split('/');
                                // pathParts: ['', 'org', 'repo', 'actions', 'workflows', 'filename.yml']
                                if (pathParts.length >= 6) {
                                    const repoBase = urlObj.origin + '/' + pathParts[1] + '/' + pathParts[2];
                                    const filename = pathParts.slice(-1)[0];
                                    fileUrl = `${repoBase}/actions/workflows/${filename}`;
                                }
                            } catch (e) { /* fallback to entry.url */ }
                            const namePill = document.createElement('a');
                            namePill.className = 'gh-name-pill';
                            namePill.textContent = entry.name;
                            namePill.href = fileUrl;
                            namePill.target = '_blank';
                            namePill.rel = 'noopener noreferrer';
                            namesList.appendChild(namePill);
                        });
                        groupDiv.appendChild(namesList);
                    });
                    grid.appendChild(groupDiv);
                });
                dashboardRoot.appendChild(grid);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
})();
