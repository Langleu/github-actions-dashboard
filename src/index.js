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
    // Do not clear container until fetch is successful

    // Dynamically determine the API URL based on the current /actions page
    const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/actions/);
    let apiUrl = null;
    if (match) {
        const owner = match[1];
        const repo = match[2];
        apiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows?per_page=100`;
    }
    if (!apiUrl) {
        console.error('Could not determine repository for GitHub Actions dashboard.');
        return;
    }

    async function fetchAllWorkflows(apiUrl) {
        let allWorkflows = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
            const url = apiUrl + `&page=${page}`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                if (Array.isArray(data.workflows)) {
                    allWorkflows = allWorkflows.concat(data.workflows);
                    if (data.workflows.length < 100) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error('Fetch error:', error);
                hasMore = false;
            }
        }
        return allWorkflows;
    }

    fetchAllWorkflows(apiUrl)
        .then(workflows => {
            if (Array.isArray(workflows) && workflows.length > 0) {
                container.innerHTML = '';
                renderDashboard({ workflows, container });
            }
        })
        .catch(error => {
            // Do not modify the page if fetch fails
            console.error('Fetch error:', error);
        });
})();
