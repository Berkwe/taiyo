# Theming

Light, dark, and system modes are managed by `next-themes` at the root layout.
The dark preset uses the supplied ink-blue palette:

`#101112`, `#181A1C`, `#212428`, `#2D3136`, `#EFF1F2`, `#999EA4`,
`#486F91`, `#5A83A6`, and `#192633`.

Change a preset only in `packages/ui/src/styles/globals.css`; product components
do not need edits. `--series-accent` is the future per-series override and falls
back to the site primary. It may be applied only to selected CTA/tab/badge/hero
details. Reader background is an independent semantic token and has local
ink/soft/light choices.
