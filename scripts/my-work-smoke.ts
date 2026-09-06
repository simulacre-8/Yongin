import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const bucket = "evidence-private";

if (!url || !key || !key.startsWith("sb_publishable_")) {
  throw new Error("A Supabase URL and publishable key are required");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const report: Record<string, unknown> = {};
let mutationStarted = false;
let resetCompleted = false;
const uploadedPaths: string[] = [];

async function count(table: string, filters?: (query: any) => any) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) query = filters(query);
  const { count: value, error } = await query;
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return value ?? 0;
}

async function resetToBaseline(actorProfileId: string) {
  const { data: rows, error: pathError } = await supabase
    .from("demo_work_attachment")
    .select("storage_path")
    .limit(1000);
  if (pathError)
    throw new Error(`attachment path read failed: ${pathError.message}`);
  const paths = (rows || []).map(row => row.storage_path as string);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths.slice(index, index + 100));
    if (error) throw new Error(`storage cleanup failed: ${error.message}`);
  }
  const occurredAt = new Date().toISOString();
  const { data, error } = await supabase.rpc("demo_work_reset", {
    p_actor_profile_id: actorProfileId,
    p_occurred_at: occurredAt,
  });
  if (error) throw new Error(`work reset failed: ${error.message}`);
  return data as Record<string, unknown>;
}

async function upload(path: string, marker: string) {
  const bytes = new TextEncoder().encode(marker);
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: "text/plain",
    upsert: false,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  uploadedPaths.push(path);
  return bytes;
}

async function expectRpcError(
  rpcName: string,
  args: Record<string, unknown>,
  messageFragment: string
) {
  const { error } = await supabase.rpc(rpcName, args);
  if (!error || !error.message.includes(messageFragment)) {
    throw new Error(
      `Expected ${rpcName} to fail with ${messageFragment}, got ${error?.message || "success"}`
    );
  }
}

try {
  const [workTotal, autoTotal, manualTotal, attachmentTotal, delegationTotal] =
    await Promise.all([
      count("demo_work_item"),
      count("demo_work_item", query => query.eq("assignment_mode", "AUTO")),
      count("demo_work_item", query => query.eq("assignment_mode", "MANUAL")),
      count("demo_work_attachment"),
      count("demo_work_delegation_request"),
    ]);

  if (
    workTotal !== 2891 ||
    autoTotal !== 2235 ||
    manualTotal !== 656 ||
    attachmentTotal !== 0 ||
    delegationTotal !== 0
  ) {
    throw new Error(
      `Refusing destructive smoke outside clean baseline: work=${workTotal}, auto=${autoTotal}, manual=${manualTotal}, attachments=${attachmentTotal}, delegations=${delegationTotal}`
    );
  }
  report.baseline = {
    workTotal,
    autoTotal,
    manualTotal,
    attachmentTotal,
    delegationTotal,
  };

  const { count: coreEvidenceBefore, error: evidenceBeforeError } =
    await supabase
      .from("evidence")
      .select("evidence_id", { count: "exact", head: true });
  if (evidenceBeforeError)
    throw new Error(
      `core evidence count failed: ${evidenceBeforeError.message}`
    );

  const { data: topBefore, error: topBeforeError } = await supabase.storage
    .from(bucket)
    .list("demo", { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (topBeforeError)
    throw new Error(
      `storage baseline listing failed: ${topBeforeError.message}`
    );
  const preservedNamesBefore = (topBefore || [])
    .map(entry => entry.name)
    .filter(name => name !== "my-work");

  const { data: actor, error: actorError } = await supabase
    .from("profile")
    .select("profile_id,display_name")
    .eq("role_code", "executive")
    .limit(1)
    .single();
  if (actorError || !actor)
    throw new Error(actorError?.message || "executive profile missing");

  const { data: destinationOrgs, error: orgError } = await supabase
    .from("ref_yongin_org_unit")
    .select("org_key,name")
    .in("name", ["수도시설과", "중대재해예방팀", "도시철도과"])
    .eq("is_active", true)
    .limit(10);
  if (orgError)
    throw new Error(`organization lookup failed: ${orgError.message}`);
  const orgByName = new Map(
    (destinationOrgs || []).map(org => [org.name, org.org_key])
  );
  const waterOrg = orgByName.get("수도시설과");
  const safetyOrg = orgByName.get("중대재해예방팀");
  const railOrg = orgByName.get("도시철도과");
  if (!waterOrg || !safetyOrg || !railOrg)
    throw new Error("required official organization units are missing");

  const { data: samples, error: sampleError } = await supabase
    .from("v_demo_my_work")
    .select(
      "work_item_id,target_name,obligation_id,obligation_title,status_code"
    )
    .eq("status_code", "UNASSIGNED")
    .order("work_item_id")
    .limit(2);
  if (sampleError || !samples || samples.length !== 2)
    throw new Error(
      sampleError?.message || "two unassigned work items are required"
    );

  const primary = samples[0];
  const delegated = samples[1];
  mutationStarted = true;
  const actorId = actor.profile_id as string;

  const assignmentOccurredAt = new Date().toISOString();
  const { error: assignError } = await supabase.rpc("demo_work_assign", {
    p_work_item_id: primary.work_item_id,
    p_to_org_key: waterOrg,
    p_assignee_display_name: "스모크 담당자",
    p_actor_profile_id: actorId,
    p_reason: "내 업무 공개키 수동배정 스모크",
    p_occurred_at: assignmentOccurredAt,
  });
  if (assignError) throw new Error(`assignment failed: ${assignError.message}`);

  await expectRpcError(
    "demo_work_change_status",
    {
      p_work_item_id: primary.work_item_id,
      p_status_code: "IN_PROGRESS",
      p_note: "수락 전 잘못된 상태 변경",
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    },
    "Accept the assignment"
  );

  const firstReassignedAt = new Date().toISOString();
  const { error: firstReassignError } = await supabase.rpc("demo_work_assign", {
    p_work_item_id: primary.work_item_id,
    p_to_org_key: safetyOrg,
    p_assignee_display_name: "재배정 중간 담당자",
    p_actor_profile_id: actorId,
    p_reason: "최초 배정시각 보존 스모크 1",
    p_occurred_at: firstReassignedAt,
  });
  if (firstReassignError)
    throw new Error(`first reassignment failed: ${firstReassignError.message}`);

  const finalReassignedAt = new Date().toISOString();
  const { error: finalReassignError } = await supabase.rpc("demo_work_assign", {
    p_work_item_id: primary.work_item_id,
    p_to_org_key: waterOrg,
    p_assignee_display_name: "스모크 담당자",
    p_actor_profile_id: actorId,
    p_reason: "최초 배정시각 보존 스모크 2",
    p_occurred_at: finalReassignedAt,
  });
  if (finalReassignError)
    throw new Error(`final reassignment failed: ${finalReassignError.message}`);

  const acceptedAt = new Date().toISOString();
  const { error: acceptError } = await supabase.rpc("demo_work_accept", {
    p_work_item_id: primary.work_item_id,
    p_actor_profile_id: actorId,
    p_occurred_at: acceptedAt,
  });
  if (acceptError) throw new Error(`accept failed: ${acceptError.message}`);

  const progressAt = new Date().toISOString();
  const { error: progressError } = await supabase.rpc(
    "demo_work_change_status",
    {
      p_work_item_id: primary.work_item_id,
      p_status_code: "IN_PROGRESS",
      p_note: "스모크 업무 시작",
      p_actor_profile_id: actorId,
      p_occurred_at: progressAt,
    }
  );
  if (progressError)
    throw new Error(`progress failed: ${progressError.message}`);

  const marker = `MY_WORK_SMOKE_${crypto.randomUUID()}`;
  const workPath = `demo/my-work/${primary.work_item_id}/smoke-${crypto.randomUUID()}.txt`;
  const workBytes = await upload(workPath, marker);
  const { error: metadataError } = await supabase.rpc(
    "demo_work_add_attachment",
    {
      p_work_item_id: primary.work_item_id,
      p_storage_path: workPath,
      p_original_name: "my-work-smoke.txt",
      p_mime_type: "text/plain",
      p_size_bytes: workBytes.byteLength,
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    }
  );
  if (metadataError)
    throw new Error(`attachment metadata failed: ${metadataError.message}`);

  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(workPath);
  if (downloadError || !downloaded)
    throw new Error(downloadError?.message || "attachment download failed");
  if ((await downloaded.text()) !== marker)
    throw new Error("attachment roundtrip marker mismatch");

  const completedAt = new Date().toISOString();
  const { error: completeError } = await supabase.rpc(
    "demo_work_change_status",
    {
      p_work_item_id: primary.work_item_id,
      p_status_code: "COMPLETED",
      p_note: "스모크 완료",
      p_actor_profile_id: actorId,
      p_occurred_at: completedAt,
    }
  );
  if (completeError)
    throw new Error(`completion failed: ${completeError.message}`);

  const confirmedAt = new Date().toISOString();
  const { error: confirmationError } = await supabase.rpc(
    "demo_work_confirm_completion",
    {
      p_work_item_id: primary.work_item_id,
      p_confirmation_note: "스모크 완료 결과 확인",
      p_actor_profile_id: actorId,
      p_occurred_at: confirmedAt,
    }
  );
  if (confirmationError)
    throw new Error(
      `completion confirmation failed: ${confirmationError.message}`
    );

  await expectRpcError(
    "demo_work_assign",
    {
      p_work_item_id: primary.work_item_id,
      p_to_org_key: safetyOrg,
      p_assignee_display_name: "금지된 완료 후 재배정",
      p_actor_profile_id: actorId,
      p_reason: "완료 후 재배정 거부 스모크",
      p_occurred_at: new Date().toISOString(),
    },
    "Completed work cannot be reassigned"
  );
  await expectRpcError(
    "demo_work_change_status",
    {
      p_work_item_id: primary.work_item_id,
      p_status_code: "IN_PROGRESS",
      p_note: "완료 후 상태변경 거부 스모크",
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    },
    "Completed work cannot change status"
  );

  await expectRpcError(
    "demo_work_request_delegation",
    {
      p_work_item_id: primary.work_item_id,
      p_to_org_key: safetyOrg,
      p_requested_assignee_name: "금지된 완료 후 위임",
      p_basis_note: "완료 후 위임 거부 스모크",
      p_storage_path: `demo/my-work/${primary.work_item_id}/rejected-delegation.txt`,
      p_original_name: "rejected-delegation.txt",
      p_mime_type: "text/plain",
      p_size_bytes: 1,
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    },
    "Only accepted active work can request delegation"
  );

  const { error: delegationAssignError } = await supabase.rpc(
    "demo_work_assign",
    {
      p_work_item_id: delegated.work_item_id,
      p_to_org_key: safetyOrg,
      p_assignee_display_name: "위임 전 담당자",
      p_actor_profile_id: actorId,
      p_reason: "위임 스모크 사전 배정",
      p_occurred_at: new Date().toISOString(),
    }
  );
  if (delegationAssignError)
    throw new Error(
      `delegation pre-assignment failed: ${delegationAssignError.message}`
    );

  await expectRpcError(
    "demo_work_request_delegation",
    {
      p_work_item_id: delegated.work_item_id,
      p_to_org_key: railOrg,
      p_requested_assignee_name: "금지된 미수락 위임",
      p_basis_note: "미수락 위임 거부 스모크",
      p_storage_path: `demo/my-work/${delegated.work_item_id}/rejected-unaccepted.txt`,
      p_original_name: "rejected-unaccepted.txt",
      p_mime_type: "text/plain",
      p_size_bytes: 1,
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    },
    "Only accepted active work can request delegation"
  );

  const { error: delegationAcceptError } = await supabase.rpc(
    "demo_work_accept",
    {
      p_work_item_id: delegated.work_item_id,
      p_actor_profile_id: actorId,
      p_occurred_at: new Date().toISOString(),
    }
  );
  if (delegationAcceptError)
    throw new Error(
      `delegation acceptance failed: ${delegationAcceptError.message}`
    );

  const basisMarker = `MY_WORK_DELEGATION_${crypto.randomUUID()}`;
  const basisPath = `demo/my-work/${delegated.work_item_id}/delegation-${crypto.randomUUID()}.txt`;
  const basisBytes = await upload(basisPath, basisMarker);
  const delegationOccurredAt = new Date().toISOString();
  const { error: delegationError } = await supabase.rpc(
    "demo_work_request_delegation",
    {
      p_work_item_id: delegated.work_item_id,
      p_to_org_key: railOrg,
      p_requested_assignee_name: "도시철도과 시연 담당",
      p_basis_note: "조직 소관 검토를 위한 공개키 위임 스모크",
      p_storage_path: basisPath,
      p_original_name: "delegation-basis-smoke.txt",
      p_mime_type: "text/plain",
      p_size_bytes: basisBytes.byteLength,
      p_actor_profile_id: actorId,
      p_occurred_at: delegationOccurredAt,
    }
  );
  if (delegationError)
    throw new Error(`delegation request failed: ${delegationError.message}`);

  const { data: primaryAfter, error: primaryError } = await supabase
    .from("v_demo_my_work")
    .select(
      "status_code,assignment_mode,assigned_org_name,assignee_display_name,assigned_at,reassigned_at,accepted_at,completed_at,confirmed_by_name,confirmed_at,confirmation_note,attachment_count,attachment_names"
    )
    .eq("work_item_id", primary.work_item_id)
    .single();
  if (primaryError || !primaryAfter)
    throw new Error(primaryError?.message || "primary work readback failed");
  if (
    primaryAfter.status_code !== "COMPLETED" ||
    primaryAfter.assignment_mode !== "MANUAL" ||
    primaryAfter.assigned_org_name !== "수도시설과" ||
    !primaryAfter.assigned_at ||
    new Date(primaryAfter.assigned_at).getTime() !==
      new Date(assignmentOccurredAt).getTime() ||
    !primaryAfter.reassigned_at ||
    new Date(primaryAfter.reassigned_at).getTime() !==
      new Date(finalReassignedAt).getTime() ||
    !primaryAfter.accepted_at ||
    !primaryAfter.completed_at ||
    !primaryAfter.confirmed_by_name ||
    !primaryAfter.confirmed_at ||
    primaryAfter.confirmation_note !== "스모크 완료 결과 확인" ||
    primaryAfter.attachment_count !== 1 ||
    !primaryAfter.attachment_names?.includes("my-work-smoke.txt")
  ) {
    throw new Error(
      `primary work roundtrip mismatch: ${JSON.stringify(primaryAfter)}`
    );
  }

  const { data: delegatedAfter, error: delegatedError } = await supabase
    .from("v_demo_my_work")
    .select(
      "status_code,delegation_requested_at,delegation_to_org_name,delegation_status,attachment_count,attachment_names"
    )
    .eq("work_item_id", delegated.work_item_id)
    .single();
  if (delegatedError || !delegatedAfter)
    throw new Error(delegatedError?.message || "delegation readback failed");
  if (
    delegatedAfter.status_code !== "DELEGATION_REQUESTED" ||
    delegatedAfter.delegation_to_org_name !== "도시철도과" ||
    delegatedAfter.delegation_status !== "REQUESTED" ||
    !delegatedAfter.delegation_requested_at ||
    delegatedAfter.attachment_count !== 1 ||
    !delegatedAfter.attachment_names?.includes("delegation-basis-smoke.txt")
  ) {
    throw new Error(
      `delegation roundtrip mismatch: ${JSON.stringify(delegatedAfter)}`
    );
  }

  const { data: events, error: eventError } = await supabase
    .from("demo_work_assignment_event")
    .select("work_item_id,event_type,occurred_at,created_at")
    .in("work_item_id", [primary.work_item_id, delegated.work_item_id])
    .limit(100);
  if (eventError) throw new Error(`history read failed: ${eventError.message}`);
  const eventTypes = new Set((events || []).map(event => event.event_type));
  for (const required of [
    "MANUAL_ASSIGNED",
    "REASSIGNED",
    "ACCEPTED",
    "STATUS_CHANGED",
    "ATTACHMENT_ADDED",
    "COMPLETED",
    "CONFIRMED",
    "DELEGATION_REQUESTED",
  ]) {
    if (!eventTypes.has(required))
      throw new Error(`missing history event: ${required}`);
  }
  if ((events || []).some(event => !event.occurred_at || !event.created_at)) {
    throw new Error("history event is missing occurred_at or created_at");
  }

  report.roundtrip = {
    assignment: true,
    originalAssignmentTimestampPreserved: true,
    reassignmentTimestampSeparated: true,
    acceptance: true,
    status: true,
    completionTimestamp: true,
    confirmationActorAndTimestamp: true,
    attachmentUploadDownload: true,
    delegation: true,
    bitemporalHistory: true,
    invalidTransitionsRejected: true,
  };

  const resetResult = await resetToBaseline(actorId);
  resetCompleted = true;
  report.reset = resetResult;

  const [workAfter, autoAfter, manualAfter, attachmentAfter, delegationAfter] =
    await Promise.all([
      count("demo_work_item"),
      count("demo_work_item", query => query.eq("assignment_mode", "AUTO")),
      count("demo_work_item", query => query.eq("assignment_mode", "MANUAL")),
      count("demo_work_attachment"),
      count("demo_work_delegation_request"),
    ]);
  if (
    workAfter !== 2891 ||
    autoAfter !== 2235 ||
    manualAfter !== 656 ||
    attachmentAfter !== 0 ||
    delegationAfter !== 0
  ) {
    throw new Error("reset did not restore the My Work baseline");
  }

  const { count: coreEvidenceAfter, error: evidenceAfterError } = await supabase
    .from("evidence")
    .select("evidence_id", { count: "exact", head: true });
  if (evidenceAfterError)
    throw new Error(
      `core evidence post-count failed: ${evidenceAfterError.message}`
    );
  if (coreEvidenceAfter !== coreEvidenceBefore)
    throw new Error("existing evidence metadata changed during My Work reset");

  const { data: topAfter, error: topAfterError } = await supabase.storage
    .from(bucket)
    .list("demo", { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (topAfterError)
    throw new Error(
      `storage post-reset listing failed: ${topAfterError.message}`
    );
  const preservedNamesAfter = (topAfter || [])
    .map(entry => entry.name)
    .filter(name => name !== "my-work");
  if (
    JSON.stringify(preservedNamesAfter) !== JSON.stringify(preservedNamesBefore)
  ) {
    throw new Error(
      "storage entries outside demo/my-work changed during reset"
    );
  }

  const { data: resetLog, error: resetLogError } = await supabase
    .from("demo_work_reset_log")
    .select("seeded_work_items,occurred_at,created_at")
    .order("reset_id", { ascending: false })
    .limit(1)
    .single();
  if (resetLogError || resetLog?.seeded_work_items !== 2891)
    throw new Error(resetLogError?.message || "reset audit log missing");

  report.preservation = {
    coreEvidenceRows: coreEvidenceAfter,
    storageOutsideMyWork: true,
    resetAuditRetained: true,
  };
  report.passed = true;
  console.log(JSON.stringify(report, null, 2));
  console.log("MY_WORK_SMOKE_PASSED");
} catch (error) {
  report.passed = false;
  report.error = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  if (mutationStarted && !resetCompleted) {
    const { data: actor } = await supabase
      .from("profile")
      .select("profile_id")
      .eq("role_code", "executive")
      .limit(1)
      .maybeSingle();
    if (actor?.profile_id) {
      try {
        await resetToBaseline(actor.profile_id);
      } catch (cleanupError) {
        console.error(
          `MY_WORK_SMOKE_CLEANUP_FAILED: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        );
        process.exitCode = 1;
      }
    } else if (uploadedPaths.length) {
      await supabase.storage.from(bucket).remove(uploadedPaths);
    }
  }
}
