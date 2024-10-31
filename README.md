# JIRA Link Copier

A Chrome extension that adds a copy button next to JIRA tickets to copy formatted links.

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Features

- Adds a copy button (📋) next to JIRA ticket numbers
- Copies formatted links including ticket number and title
- Customizable format through options page
- Supports HTML and plain text formats

## Variables

The following variables are available for custom formats:
- `$ticket`: JIRA ticket number
- `$title`: Issue title
- `$url`: Full JIRA URL
- Use `$html:` prefix for HTML format

## Default Format
`$html:<a href="$url">$ticket:$title</a>`
