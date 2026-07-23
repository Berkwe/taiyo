# Design system

NovoraScans uses semantic CSS variables exposed as Tailwind utilities:
`background`, `foreground`, `surface`, `surface-raised`, `surface-muted`,
`nv-primary`, `accent`, `nv-muted`, `nv-border`, `input`, `ring`, status colors,
overlay, and reader colors.

Feature components consume meanings, not palette names. Borders are crisp,
radii are restrained, motion is brief, and reduced-motion preference disables
nonessential transitions. Focus states, 44px targets, semantic headings, labels,
and non-color status descriptions are required.

Reusable public components cover navigation, cards, rails/sections, releases,
badges, breadcrumbs, empty/loading/error states, theme/locale switching, reader
images, progress, and chapter navigation.
