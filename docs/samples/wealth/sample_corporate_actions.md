# Sample corporate actions (enter via Wealth Admin → Corporate Actions)

All values below assume **Ratio is a “multiplier on qty”** (and cost-per-unit is adjusted accordingly for actions that change qty).

## Split / Merge

- **FV split 10 → 2**: `ActionType=SPLIT`, `Ratio=5`
- **Merge 2 → 10**: `ActionType=SPLIT`, `Ratio=0.2`

## Bonus

- **1:1 bonus** (1 bonus share per 1 share): `ActionType=BONUS`, `Ratio=1`
- **1:2 bonus** (1 bonus per 2 shares): `ActionType=BONUS`, `Ratio=0.5`

## Rights

- **1:5 rights @ 100**: `ActionType=RIGHTS`, `Ratio=0.2`, `Price=100`

## Dividend

- **Dividend 5/share**: `ActionType=DIVIDEND`, `Price=5`

## Capital reduction

- **Capital reduction 1:2** (shares halve): `ActionType=CAPITAL_REDUCTION`, `Ratio=0.5`

