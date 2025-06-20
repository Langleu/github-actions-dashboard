# GitHub Actions Dashboard UserScript

This UserScript enhances the GitHub Actions overview page for any repository by providing a modern, grouped, and visually appealing dashboard of all workflows.

## Features
- Replaces the default Actions overview with a responsive dashboard.
- Groups workflows by their naming convention (`Group - Category - Name`).
- Displays each workflow as a clickable box linking to its Actions UI.
- Supports both light and dark mode, with a toggle and persistent theme choice.
- Automatically works on any repository's `/actions` page.

## Installation
1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension if you haven't already.
2. Copy the contents of `index.js` from this repository.
3. In Tampermonkey, create a new script and paste the code.
4. Save the script.
5. Visit any GitHub repository's `/actions` page to see the dashboard in action.

## How it Works
- The script detects the current repository from the URL and fetches its workflows using the GitHub API.
- Workflows are grouped and displayed in a grid, with clickable links to their Actions UI.
- The dashboard is styled to blend with GitHub's UI and supports both light and dark themes.

## Customization
- You can further customize the grouping, appearance, or add more workflow details by editing `index.js`.
