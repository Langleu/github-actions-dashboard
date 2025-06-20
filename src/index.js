// ==UserScript==
// @name         GitHub Actions Dashboard
// @description  A better GitHub Actions Overview
// @version      0.1.0
// @namespace    https://github.com/Langleu/github-actions-dashboard
// @supportURL   https://github.com/Langleu/github-actions-dashboard
// @author       Langleu
// @match        https://github.com/*/*/actions
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

import { injectDashboardStyles, renderDashboard } from './dashboard-ui.js';

(function() {
    'use strict';

    // Inject CSS
    injectDashboardStyles();

    // Find the container
    const container = document.querySelector('div.container-xl');
    if (!container) return;
    container.innerHTML = '';

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
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data.workflows)) {
                // Render dashboard UI
                renderDashboard({ workflows: data.workflows, container });
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
})();
