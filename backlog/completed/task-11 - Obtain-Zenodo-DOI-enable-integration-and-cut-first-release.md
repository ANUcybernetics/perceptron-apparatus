---
id: TASK-11
title: 'Obtain Zenodo DOI: enable integration and cut first release'
status: Done
assignee: []
created_date: '2026-06-20 00:15'
updated_date: '2026-06-20 02:22'
labels:
  - zenodo
  - docs
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The licensing and citation scaffolding is already committed and pushed (LICENSE-MIT, LICENSE-CC-BY-4.0, .zenodo.json, CITATION.cff, README Citation and Licence sections). The DOI can only be minted by Zenodo on a GitHub release after the Zenodo-GitHub webhook is enabled. These are manual steps on Zenodo and GitHub that cannot be automated from the repo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Zenodo-GitHub integration is enabled for ANUcybernetics/perceptron-apparatus (repo toggled ON in Zenodo GitHub settings, webhook installed)
- [x] #2 A GitHub Release is published while the integration is enabled, and Zenodo archives it and mints a DOI
- [x] #3 The concept DOI is recorded in CITATION.cff (doi field) and shown as a badge near the top of README.md, then committed and pushed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enable integration: sign in to zenodo.org with GitHub, open zenodo.org/account/settings/github, toggle ANUcybernetics/perceptron-apparatus ON (installs the webhook). Org caveat: needs repo-admin rights AND an ANU org owner may need to approve the Zenodo OAuth app under the org third-party-access settings before the repo appears in the list.
2. With the toggle ON, create a GitHub Release (e.g. tag v0.1.0). Zenodo reads .zenodo.json and mints the DOI. CRITICAL ORDERING: enable the toggle BEFORE releasing -- Zenodo does not backfill releases created before the webhook existed.
3. Copy the concept DOI into CITATION.cff (uncomment the doi: line) and the README badge (commented template already sits in the Citation section); commit and push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed 2026-06-20.
- Zenodo-GitHub integration enabled by Ben (repo toggled ON in Zenodo settings).
- GitHub release v0.1.0 published; Zenodo archived it and minted DOIs:
  - concept DOI (cited): 10.5281/zenodo.20768557
  - version DOI (v0.1.0): 10.5281/zenodo.20768558
- Concept DOI added to CITATION.cff (doi field) and as a badge near the top of
  README.md; committed (e461861) and pushed.
- Release also carries apparatus-photos-highres.zip (19 high-res AVIFs by Andrew
  Meares); three web-sized photos added to the README (commit 58125ef).
Release: https://github.com/ANUcybernetics/perceptron-apparatus/releases/tag/v0.1.0
<!-- SECTION:NOTES:END -->
