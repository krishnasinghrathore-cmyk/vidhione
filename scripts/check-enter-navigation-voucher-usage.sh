#!/usr/bin/env bash
set -euo pipefail

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for this check."
  exit 2
fi

pattern='^\s*<(InputText|InputNumber|Dropdown|AutoComplete)(\s|>)'
targets=(
  "src/pages/(main)/apps/accounts/vouchers"
  "src/pages/(main)/apps/billing/money-receipt-cash"
  "src/pages/(main)/apps/billing/money-receipt-bank"
  "src/pages/(main)/apps/billing/money-receipt-manual-book-issue"
)

matches="$(rg -n "${pattern}" "${targets[@]}" -g'*.tsx' || true)"

if [[ -n "${matches}" ]]; then
  echo "Found direct PrimeReact form controls in voucher/receipt flows."
  echo "Use AppInput/AppDropdown/AppAutoComplete wrappers so Enter-to-next stays consistent."
  echo
  echo "${matches}"
  exit 1
fi

echo "OK: Voucher and money-receipt flows are using App* input wrappers."
