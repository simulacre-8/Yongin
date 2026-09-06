# UI fixes browser findings

- 2026-09-07: `/home` loaded from Supabase with 3,688 obligations.
- Left navigation now renders `중대산업재해` as a group and `사업·사업장 14` as its child above `중대시민재해` children `공중이용시설·공중교통수단 13`, `원료·제조물 9`.
- Navigation hierarchy is visually aligned; selected state uses the navy/blue system without layout shift.
- No horizontal overflow was visible at the tested desktop viewport.

## Evidence

- `/evidence` renders the personnel table in the requested order: 직급, 배치 일자, 인적사항, 비고, 증빙자료, 삭제. The attachment control is in the right-side evidence column and right-aligned within that cell.
- The first capture occurred while the facility workflow list was still loading; a settled-state and selection transition check remains to be run.

The settled `/evidence` state loaded 31 obligations for 고기상수도. The law table order is 구분, 법률명, 조항·호·목, 조치내용, 조치 일자, 비고, 증빙자료, 삭제, confirming the evidence column is at the right edge of the business fields.

After selecting `긴급안전조치`, the blue selected treatment moved from `긴급안전점검의 실시` to the new row. The previous row returned to the neutral transparent state, so no stale selection border remained.

## Settings organization chart

`/settings` now places section 02 조직도 directly below the target-profile grid. It loads all 792 official units from Supabase, defaults to 기획조정실, and shows its 21 department/team descendants in a bounded two-column browser. The top-level organization selector and search control fit the existing navy public-sector card system.

## My Work confirmation dialog

`/dashboard` loaded the current shared demo runtime and exposed the first card attachment control. The next verification selects a local test file but will cancel before storage/DB mutation.

A synthetic in-memory `modal-color-check.txt` selection opened the exact `첨부파일을 저장하시겠습니까?` confirmation. The foreground dialog content rendered solid white with navy text while only the page overlay remained dimmed. No upload or metadata save has occurred because the confirm action was not pressed.

Cancelling the attachment confirmation closed the alert dialog and reset the file input to zero selected files. This confirms the visual test did not upload or record the synthetic file.

## Console

The final browser console view showed only the intentional verification scripts and no application warning or error entries.
