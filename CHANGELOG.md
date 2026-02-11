# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Handle stanzas named "Ending"

### Changed

- When including draft plans, show all plans in date order, rather than published plans coming first
- Reduce HTTP requests to ChurchSuite by simplifying app startup and introducing a cache

## [v1.3.0] - 2026-02-09

### Added

- New "Song Lyrics" template
- Add option for showing song lyrics in full service order template
- New settings for base font size, including song lyrics, and showing page numbers
- New settings for showing timings in outline and full service order templates, and 
  preferred time format
- If plan includes a notes category named "People", supplied templates now show those
  notes alongside the people for each item
- Add ability for a template to hide irrelevant settings in the main window

### Changed

- Split settings into global settings, template settings, and authentication settings
- Many settings are now configurable per template, rather than being global
- Change "Show draft plans" to "Include draft plans"
- Dependencies updated

## [v1.2.0] - 2025-10-31

### Added

- Menu item for docs
- Make plan item types available to templates as `types`, keyed by name, so item type can
  be checked by name rather than needing to check by ID directly. Updated supplied templates
  to match.
- Make default brand available to templates as `brand` rather than `plan.brand`
- Output PDFs now have a suitable title
- Show plan time and name in "Select a plan" drop-down, not just date
- Include plan time in suggested filename, not just date
- Make each plan item's start time available to templates

### Changed

- Fix functionality of refresh button
- Remove superfluous logging

## [v1.1.0] - 2025-10-03

### Added

- Automatically select first plan in drop-down
- Implement About dialog including dependency licences
- Highlight video items in plan
- Make main window resizeable
- Encrypt API key in config file
- Multiple, selectable, templates, each with their own CSS
- When printing a multi-page document two-up, print two of the same page on each sheet
- Add "Full" template, which renders markdown in liturgy and prayer items
- Option to change how names are shown against plan items - first name, first name and initial, or full name
- Context menu in plan view with Select All and Copy options
- Show default brand logo in plan header
- Use default brand color in headings
- Include song keys
- Template editor, including duplicate, delete, export, import functions

### Changed

- Proper first-time initialisation of settings
- Cosmetic tweaks to program name and icon
- Hide Inspect menu except in develoment mode
- When showing past plans, sort in reverse date order (most recent first)
- Improved date formatting
- Fix issue when API access token expires
- Much refactoring
- Dependencies updated

## [v1.0.0] - 2025-07-29

### Added

- Initial version of Companion Plan Viewer for the needs of Elmdon Church

[Unreleased]: https://github.com/hussra/churchsuite-plan-viewer/compare/v1.3.0...HEAD
[v1.3.0]: https://github.com/hussra/churchsuite-plan-viewer/releases/tag/v1.3.0
[v1.2.0]: https://github.com/hussra/churchsuite-plan-viewer/releases/tag/v1.2.0
[v1.1.0]: https://github.com/hussra/churchsuite-plan-viewer/releases/tag/v1.1.0
[v1.0.0]: https://github.com/hussra/churchsuite-plan-viewer/releases/tag/v1.0.0