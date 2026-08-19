# SKINATOR Production Tracker

A self-contained production tracker. Open `index.html` in a modern browser; no server or installation is required. Large images and GIF records are stored in IndexedDB rather than the much smaller local-storage area.

## Included

- Create, browse, search, edit, and delete character records
- Name in files and name in game
- 540 × 960 character 360 GIF upload with animated preview and dimension validation
- Spawn image stored inside the main character record
- Up to two Spawn Modifiers per character, selected from 30 Offensive, Defensive, and Passive records; matching supplied icons are included and unfinished icons use placeholders
- Spawn Modifiers are visible in the main Modifier Database under All and Spawn, but disappear whenever a zone or grade filter is active
- Multiple 540 × 960 variant-skin GIFs with names and previews
- 61 editable God Eye, Attack, Support, and Heart modifier records seeded from the supplied catalogue
- Bundled production modifier icons and editable replacement icons
- Optional super-version name and description on every modifier
- Character Super Modifiers selected from the shared modifier database
- Modifier filters for category, zone, and grade, using the supplied grade icons
- Optional independent grade for each modifier's super version
- Uppercase modifier and super-description storage for direct game copy/paste
- Drag-and-drop support for character GIFs, variants, Spawns, and modifier icons
- Graveyard/Zoo character filtering and complete/incomplete production filtering
- Per-character completion checklist; bosses are exempt from the variant requirement
- Availability-aware modifier filters: Graveyard shows global, Zone 1, and shared records; Zoo shows global, Zone 2, shared, and Heart records
- Heart modifiers normalized as Zoo / Zone 2 exclusives
- Character-prefab-created flag, included in character completion
- NPC tab with image, mechanic description, six production checks, and six Unity checks
- NPC create, browse, search, filter, edit, delete, drag-and-drop image, JSON backup, and CSV export
- Festival application tab with location, date range, online/presential format, website, and Selected/Rejected/Waiting status tracking
- Browser-local storage with completion summaries
- Full JSON backup/import, including images
- CSV export for spreadsheet handoff (image presence is recorded, but binary images are not embedded)
- Reserved navigation for future Modifiers and Pets tabs

## Sharing and storage

Use **Export → JSON backup** to transfer the complete dataset to another person. They can open the app and choose **Import**. Keep exported JSON files in a shared drive or commit them to a GitHub repository for a simple reviewable workflow.

### Supabase Realtime setup

For instant multi-user synchronization, run `supabase-realtime.sql` once in the Supabase SQL Editor for the tracker project. The app applies individual Realtime changes immediately and keeps a lightweight two-minute fallback check while the tab is visible. When Realtime is connected, the fallback becomes a five-minute consistency check.

Storage preview URLs are reused for their 24-hour lifetime, and media is rendered only for the open section. Uploads use immutable object paths and a one-year browser cache lifetime to prevent repeated GIF and image downloads.

### Supabase Storage cleanup setup

Run `supabase-storage-cleanup.sql` once in the Supabase SQL Editor. It gives approved team editors permission to remove replaced files and lets the organization owner use the **Clean Storage** button in the tracker.

After a successful save, the tracker automatically removes an old image when it is replaced, cleared, or its record is deleted. The owner-only cleanup button scans the `skinator-assets` bucket for files that are not referenced by any current tracker record. It shows the number and size first, requires confirmation, rechecks the database immediately before deletion, and ignores files uploaded during the last hour.

Suggested repository layout:

```
/tracker-app/       # these app files
/data/characters.json
```

For a later multi-user version, replace the local-storage functions in `app.js` with a small hosted database (Supabase, Firebase, or a GitHub API endpoint). Avoid putting a GitHub access token directly in this browser app; use an authenticated server or GitHub App instead.

## Data model

Each character has an ID, both names, image data URLs for the 360 and pet previews, arrays of variant skins and super modifiers, and created/updated timestamps. JSON exports include a schema version so future versions can migrate the data safely.
