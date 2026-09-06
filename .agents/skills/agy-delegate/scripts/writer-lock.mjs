#!/usr/bin/env node
/**
 * delegate-skills · writer-lock.mjs
 *
 * Host-owned logical Writer mutex and process-liveness supervisor.
 * Represents the logical Writer lane (not just a provider session).
 * Stored in an OS-local runtime directory outside the Git working tree.
 * Enforces atomic creation (wx flag), tri-state liveness, and start-time PID reuse safety.
 */

import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const LOCK_SCHEMA_VERSION = "writer-lock.v1";

export const LIVENESS_STATE = Object.freeze({
  CONFIRMED_ALIVE: "CONFIRMED_ALIVE",
  CONFIRMED_DEAD: "CONFIRMED_DEAD",
  AMBIGUOUS: "AMBIGUOUS",
});

export function getRuntimeLockDir() {
  const dir = join(tmpdir(), "g7-control-layer", "locks");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLockFilePath(workdir) {
  const hash = createHash("sha256").update(workdir.toLowerCase()).digest("hex").slice(0, 16);
  return join(getRuntimeLockDir(), `writer-${hash}.json`);
}

/**
 * Inspect process liveness and start time with tri-state guarantee.
 * Never treats inspection failure as dead.
 */
export function inspectProcess(pid) {
  if (!pid || typeof pid !== "number") {
    return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null, processName: null };
  }

  try {
    if (process.platform === "win32") {
      const psScript = `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -eq $p) { Write-Output '{\"state\":\"CONFIRMED_DEAD\"}' } else { @{ state='CONFIRMED_ALIVE'; Id=$p.Id; ProcessName=$p.ProcessName; StartTime=$p.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress }`;
      const res = spawnSync("powershell", ["-NoProfile", "-Command", psScript], {
        encoding: "utf8",
        timeout: 5000,
      });

      if (res.status === 0 && res.stdout.trim()) {
        try {
          const info = JSON.parse(res.stdout.trim());
          if (info.state === LIVENESS_STATE.CONFIRMED_DEAD) {
            return { state: LIVENESS_STATE.CONFIRMED_DEAD, pid, startTime: null, processName: null };
          }
          return {
            state: LIVENESS_STATE.CONFIRMED_ALIVE,
            pid: info.Id,
            processName: info.ProcessName,
            startTime: info.StartTime || null,
          };
        } catch {
          return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null, processName: null };
        }
      }
      return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null, processName: null };
    }

    // POSIX
    try {
      process.kill(pid, 0);
      const out = execFileSync("ps", ["-p", String(pid), "-o", "lstart="], {
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      return { state: LIVENESS_STATE.CONFIRMED_ALIVE, pid, startTime: out || null };
    } catch (err) {
      if (err?.code === "ESRCH") {
        return { state: LIVENESS_STATE.CONFIRMED_DEAD, pid, startTime: null };
      }
      return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
    }
  } catch {
    return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null, processName: null };
  }
}

/**
 * Acquire the logical Writer lock atomically.
 */
export function acquireWriterLock({
  workdir,
  taskId,
  logicalWriterId,
  provider,
  pid,
}) {
  if (!workdir || !taskId || !logicalWriterId || !pid) {
    return {
      ok: false,
      error: "MISSING_LOCK_IDENTITY",
      message: "task_id, logical_writer_id, workdir, and pid are mandatory for mutating Writer lock",
    };
  }

  const lockFile = getLockFilePath(workdir);
  const procInfo = inspectProcess(pid);

  const lock = {
    schema_version: LOCK_SCHEMA_VERSION,
    task_id: taskId,
    logical_writer_id: logicalWriterId,
    provider: provider || "unknown",
    pid,
    process_start_time: procInfo.startTime || null,
    process_name: procInfo.processName || null,
    workdir,
    acquired_at: new Date().toISOString(),
  };

  const lockContent = `${JSON.stringify(lock, null, 2)}\n`;

  // 1. Attempt atomic exclusive creation (O_CREAT | O_EXCL)
  try {
    writeFileSync(lockFile, lockContent, { flag: "wx", encoding: "utf8" });
    return { ok: true, lockFile, lock, newlyCreated: true };
  } catch (err) {
    if (err?.code !== "EEXIST") {
      return { ok: false, error: "LOCK_WRITE_FAILED", message: err?.message || String(err) };
    }
  }

  // 2. Lock file already exists: read and verify
  let existing;
  try {
    existing = JSON.parse(readFileSync(lockFile, "utf8"));
  } catch {
    return {
      ok: false,
      error: "AMBIGUOUS_LOCK_UNREADABLE",
      message: "Existing lockfile exists but could not be parsed as JSON. Safe fail.",
    };
  }

  if (!existing || !existing.pid) {
    return {
      ok: false,
      error: "AMBIGUOUS_LOCK_CORRUPT",
      message: "Existing lockfile lacks valid process identity. Safe fail.",
    };
  }

  const existingProc = inspectProcess(existing.pid);

  // Ambiguous liveness -> never kill, never reclaim
  if (existingProc.state === LIVENESS_STATE.AMBIGUOUS) {
    return {
      ok: false,
      error: "AMBIGUOUS_LOCK_PID_LIVE",
      message: `PID ${existing.pid} liveness cannot be confirmed reliably. Safe fail; will not reclaim lock or terminate process.`,
      existingLock: existing,
    };
  }

  // Confirmed alive
  if (existingProc.state === LIVENESS_STATE.CONFIRMED_ALIVE) {
    // Check re-entrancy: require PID, task_id, logical_writer_id, AND start-time match
    const matchesIdentity =
      existing.task_id === taskId &&
      existing.logical_writer_id === logicalWriterId &&
      existing.pid === pid;

    const matchesStartTime =
      existing.process_start_time &&
      procInfo.startTime &&
      existing.process_start_time === procInfo.startTime;

    if (matchesIdentity && matchesStartTime) {
      return { ok: true, lockFile, lock: existing, reentrant: true };
    }

    // Check for PID reuse / start-time verification
    if (!existing.process_start_time || !existingProc.startTime) {
      return {
        ok: false,
        error: "AMBIGUOUS_LOCK_PID_LIVE",
        message: `PID ${existing.pid} is live but start-time identity is missing/unverifiable. Fail safe without reclaiming.`,
        existingLock: existing,
      };
    }

    if (existing.process_start_time !== existingProc.startTime) {
      // OS recycled PID for another process. Original process is dead.
    } else {
      // Process is genuinely still running
      return {
        ok: false,
        error: "MUTATING_WRITER_LOCK_ACTIVE",
        message: `Active mutating Writer is running (PID ${existing.pid}, writer: ${existing.logical_writer_id}, task: ${existing.task_id})`,
        existingLock: existing,
      };
    }
  }

  // At this point, predecessor is confirmed dead or PID was recycled.
  // Reclaim lock atomically.
  try {
    unlinkSync(lockFile);
    writeFileSync(lockFile, lockContent, { flag: "wx", encoding: "utf8" });
    return { ok: true, lockFile, lock, reclaimed: true };
  } catch (retryErr) {
    if (retryErr?.code === "EEXIST") {
      return {
        ok: false,
        error: "LOCK_ACQUISITION_RACE",
        message: "A concurrent process acquired the lock during stale reclamation race.",
      };
    }
    return {
      ok: false,
      error: "LOCK_WRITE_FAILED",
      message: retryErr?.message || String(retryErr),
    };
  }
}

/**
 * Release the logical Writer lock.
 */
export function releaseWriterLock(workdir, logicalWriterId, taskId) {
  const lockFile = getLockFilePath(workdir);
  if (!existsSync(lockFile)) return { ok: true, released: false };

  try {
    const existing = JSON.parse(readFileSync(lockFile, "utf8"));
    if (
      existing.logical_writer_id === logicalWriterId &&
      (!taskId || existing.task_id === taskId)
    ) {
      unlinkSync(lockFile);
      return { ok: true, released: true };
    }
    return {
      ok: false,
      error: "LOCK_OWNERSHIP_MISMATCH",
      message: `Cannot release lock owned by writer "${existing.logical_writer_id}" / task "${existing.task_id}"`,
    };
  } catch (err) {
    return { ok: false, error: "LOCK_RELEASE_FAILED", message: err?.message || String(err) };
  }
}

/**
 * Verify predecessor termination and atomically update provider lock.
 */
export function verifyAndSwitchProvider({
  workdir,
  taskId,
  logicalWriterId,
  newProvider,
  newPid,
  oldPid,
}) {
  const lockFile = getLockFilePath(workdir);
  if (!existsSync(lockFile)) {
    return acquireWriterLock({
      workdir,
      taskId,
      logicalWriterId,
      provider: newProvider,
      pid: newPid,
    });
  }

  let existing;
  try {
    existing = JSON.parse(readFileSync(lockFile, "utf8"));
  } catch {
    return {
      ok: false,
      error: "AMBIGUOUS_LOCK_UNREADABLE",
      message: "Lock exists but cannot be read.",
    };
  }

  if (existing.logical_writer_id !== logicalWriterId) {
    return {
      ok: false,
      error: "DIFFERENT_LOGICAL_WRITER",
      message: `Lock is owned by another logical writer (${existing.logical_writer_id})`,
    };
  }

  const pidToCheck = oldPid || existing.pid;
  const liveCheck = inspectProcess(pidToCheck);

  if (liveCheck.state === LIVENESS_STATE.CONFIRMED_ALIVE) {
    if (existing.process_start_time && liveCheck.startTime && existing.process_start_time === liveCheck.startTime) {
      return {
        ok: false,
        error: "PREDECESSOR_PROCESS_STILL_ALIVE",
        message: `Predecessor process PID ${pidToCheck} is still confirmed alive. Must prove termination before switching provider.`,
      };
    }
  } else if (liveCheck.state === LIVENESS_STATE.AMBIGUOUS) {
    return {
      ok: false,
      error: "AMBIGUOUS_LOCK_PID_LIVE",
      message: `Predecessor PID ${pidToCheck} liveness is ambiguous. Safe stop.`,
    };
  }

  // Predecessor is confirmed dead. Re-acquire atomically for new provider.
  try {
    unlinkSync(lockFile);
  } catch {
    // ignore
  }

  return acquireWriterLock({
    workdir,
    taskId,
    logicalWriterId,
    provider: newProvider,
    pid: newPid,
  });
}
