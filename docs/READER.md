# Reader

The first reader mode is continuous vertical webtoon reading. Stored page
dimensions reserve layout space; the first image is eager and following images
are lazy. Failed images expose a retry action.

Anonymous progress is stored under `novora:progress:<series>:<chapter>` with
release ID, chapter ID, visible page, scroll ratio, timestamp, and optional
completion time. Invalid JSON is ignored. Progress restores only for the same
release. Left/right arrows and visible links navigate adjacent chapters.

Changing quality keeps the same chapter. Reader pages are always noindex and
canonicalize to the chapter landing page. Double-page, RTL manga, zoom,
multi-chapter infinite flow, and offline download are deferred.
