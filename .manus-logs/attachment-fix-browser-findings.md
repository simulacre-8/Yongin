# Attachment fix browser findings

The `/dashboard` page loaded 2,891 work items and displays the upload policy directly under the filters: 10MB maximum; HWP, TXT, PNG, JPG/JPEG, DOC/DOCX, and PDF; Korean original names are preserved as display names. The layout remained stable at the desktop viewport.

The `담당부서 수동 재배정` dialog rendered with computed background `rgb(255, 255, 255)`, text `rgb(38, 54, 77)`, and opacity `1`, confirming the regular My Work modal surface is no longer transparent or dark.

The first two current runtime rows are already in `위임 요청`, so no new delegation button is available on this page state; their status labels were confirmed. The delegation dialog will be verified by switching to an accepted item without altering stored records.

The status filter was switched to `배정 수락` and back to `전체 상태` without mutating any work item. The current shared runtime had no item exactly in `ACCEPTED`; the page returned to the full list afterward.

A synthetic Korean PDF selection was accepted by the card input. Its browser `accept` value is exactly `.hwp,.txt,.png,.jpg,.jpeg,.doc,.docx,.pdf`; the input then cleared itself as designed while retaining the File object in the pending confirmation action.

The exact `첨부파일을 저장하시겠습니까?` dialog displayed `인하대_과학영재센터_과제b_3A이민후_20260214.pdf`. Its computed surface is white (`rgb(255, 255, 255)`), text is navy (`rgb(38, 54, 77)`), and opacity is `1`.

A synthetic `허용안됨.zip` selection was rejected before confirmation; no attachment confirmation dialog opened. This validates client-side enforcement beyond the operating-system file picker hint.
