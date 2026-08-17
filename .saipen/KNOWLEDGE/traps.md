# Traps

## Caption/subtitle sidecars import as "clips"
Premiere imports `.srt` (and `.vtt/.ass/.scc/.txt/.csv/...`) as ProjectItems.
`isUsableClip` used to treat anything non-bin as footage, so captions got
randomly placed AND inflated the bin clip count. Fixed in `host/lib/bins.jsx`
via `isNonMediaSidecar` — extension denylist (`AP_NON_MEDIA_EXTS`) matched
against BOTH `getMediaPath()` and `item.name` (a caption item may expose
neither reliably across versions). Denylist, not video-allowlist, so nested
sequences / stills / audio used as source keep working. If a real caption
item slips through, add its extension to `AP_NON_MEDIA_EXTS`.

## Narrator source selection
`AP_getBinClips({binId,recursive})` lists {id,name} of a bin's usable clips
(same filter). `AP_fillNarratorGaps` honors `params.narratorSourceId`: if set
and != "all", pool = just that one item (via findItemById); else whole bin.
UI dropdown `#narratorSource` repopulated on refresh + binSelect change.
