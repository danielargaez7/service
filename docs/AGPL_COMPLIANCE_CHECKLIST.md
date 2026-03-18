# AGPL Compliance Checklist

This repo includes product work that may coexist with AGPL-licensed systems or APIs.
The rule for this project is simple: do not blur the boundary between proprietary
ServiceCore application code and AGPL-covered runtime code without an explicit review.

## Use This Checklist When

- adding a new backend integration
- embedding or vendoring a third-party service
- copying code from an AGPL project
- exposing a new combined workflow that depends on AGPL software
- changing deployment topology around Kimai, TimeTrex, or similar systems

## Required Review Questions

1. Is the external system AGPL, GPL, or otherwise copyleft?
2. Are we calling it over a documented API, or linking/embedding its code?
3. Are we copying templates, components, routes, or business logic into this repo?
4. Could a user reasonably view the result as one combined application instead of two separate systems?
5. Did we preserve a clean HTTP/API boundary with no shared runtime modules?
6. Are license notices, attribution, and source-offer obligations triggered?
7. Did legal/product sign off if the answer to any of the above is unclear?

## Engineering Guardrails

- Prefer API integration over code reuse.
- Do not vendor AGPL frontend or backend source into `apps/` or `libs/`.
- Keep third-party copyleft services isolated behind explicit adapters in `apps/backend-api/src/services/`.
- Do not share internal UI components, stylesheets, or utility libraries across the license boundary.
- Record every new external dependency choice in the PR description.
- If a dependency license is unclear, stop and escalate before merging.

## PR Template Addendum

Add this block to any integration-heavy PR:

```md
## AGPL Review
- External system:
- License reviewed:
- Integration boundary:
- Any copied code/assets:
- Legal/product sign-off needed:
```

## Reviewer Sign-Off

- Engineering confirms the integration stays at an API/service boundary.
- Product confirms the feature does not require embedded AGPL UI or runtime code.
- Legal review is requested for any uncertain case.

When in doubt, treat it as a stop-the-line review item.
