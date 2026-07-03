# ReligionPage — Небожитель view

Component: `ReligionModals` (`src/components/ReligionModals.vue`)

## Purpose
Celestial/divine entity section. Shows information about a religion's patron deity or celestial being, and any associated modals/interactions for faith-related mechanics.

## Notes
- Rendered when `viewMode === 'celestial'`
- Monthly Deva faith consumption runs as part of cycle creation in `cycleService`, not when this view is opened.
- Check `ReligionModals.vue` for the exact features — name suggests modal-driven interactions
