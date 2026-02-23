# Accounts Knowledge Book

This folder is the user-shareable rule book for accounting behavior in `vidhione`.

Purpose:
- Keep accounting rules explicit and consistent across UI, reports, and backend validations.
- Give support/team members a single place to answer "why did the system behave this way?"
- Let users read the same rules that are enforced in the product.

Current topics:
- `accounts-posting-date-policy.md`: voucher date vs posting date policy, usage, and guardrails.
- `accounts-cancellation-policy.md`: cancellation behavior, restrictions, and audit expectations.
- `accounts-voucher-delete-policy.md`: hard-delete guardrails, draft-vs-posted eligibility, and cancel/reversal expectation.
- `accounts-reconciliation-policy.md`: reconciled status rules and edit-lock behavior.
- `accounts-period-lock-policy.md`: lock-period rules based on posting date.
- `accounts-voucher-save-parity-playbook.md`: step-by-step parity testing guide for voucher edit/save behavior vs legacy.
- `accounts-voucher-save-parity-log-template.csv`: test evidence template for scenario-wise parity runs.
- `sales-invoice-master-forms-gap-analysis.md`: legacy-vs-new parity gaps for Sales Invoice related master forms (add/edit/delete/view and field coverage).
- `sales-invoice-master-forms-uat-playbook.md`: form-by-form UAT flow for Sales Invoice master parity (rights + CRUD + delete guardrails).
- `sales-invoice-master-forms-uat-log-template.csv`: execution/evidence template for Sales Invoice master UAT scenarios.
- `sales-invoice-master-forms-uat-run-plan-template.csv`: run-order, priority, and owner-assignment tracker for Sales Invoice master UAT execution.

Planned topics:
- Dr/Cr conventions and ledger-side mapping by voucher type.

Authoring notes:
- Write each rule as a policy statement first, then list system behavior.
- Include examples for edge cases (back-dated entry, cross-month posting, reconciled edits).
- Keep wording user-facing; avoid implementation-only jargon where possible.
- Add a `Rule Header` section in each policy file with:
  - `Rule Version`
  - `Rule Date`
