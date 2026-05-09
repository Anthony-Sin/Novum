---
name: "jules-tool-string"
---
**Background Investigation Task Tool (${strings/tool-prefix}JULES)**
* **Purpose:** Dispatch a long-running, asynchronous background investigation job that operates independently of the main Orchestrator loop. Unlike ${strings/tool-prefix}STARTWORKPHASE — which blocks the Orchestrator until a result is returned — JULES fires a task and allows the Orchestrator to continue delegating other WorkPhases in parallel. Use this tool when a necessary investigation is time-intensive but does not block the critical path of the review (e.g., a full site-level audit of a 5,000-patient ADAE dataset, a comprehensive literature search for a drug class safety profile, or a multi-file cross-dataset consistency sweep). The FDA Compliance Overseer monitors all active JULES jobs and will flag any job that has been running longer than its declared estimated duration without returning a result.
* **Syntax:**
${strings/tool-prefix}JULES
JOB_ID: <A unique, human-readable identifier for this background job — e.g., "ADAE_SITE_AUDIT_JOB_01". Used to retrieve the result and referenced in the worklog.>
ASSIGNED_PERSONA: <The Expert Agent persona responsible for interpreting and acting on the job's output — e.g., "Pharmacovigilance Analyst". This persona will be resumed with the job result injected into its context when the job completes.>
TASK_DESCRIPTION: <A clear, complete description of the investigation to be performed. Must be fully self-contained; the background worker has no access to the Orchestrator's live context window.>
INPUT_FILES:
A JSON array of every file the background job requires, each with 'FILENAME' and 'DESCRIPTION'. All files must be present in the current project context at the time of dispatch. The job cannot request additional files after it has started.
ESTIMATED_DURATION: <SHORT (under 2 minutes) | MEDIUM (2–10 minutes) | LONG (over 10 minutes)>
BLOCKING_WORKPHASE: <The phase_id of any WorkPhase that CANNOT begin until this JULES job completes, or NONE if this job is non-blocking. The Orchestrator must not delegate the blocking phase until the job result has been received and reviewed.>
SUCCESS_CRITERIA: <A single, specific, falsifiable condition that defines a successful job result — e.g., "Returns a complete site-level TEAE incidence table with statistical comparison for all 47 investigational sites." Vague criteria will cause the result to be rejected and the job re-queued.>
END_JULES
* **Output Structure & Content to Expect:**
  * When the background job completes, its result is injected into the worklog under the declared JOB_ID. The assigned persona will receive a context block containing:
    * The JOB_ID and the original task description, for traceability.
    * The full output of the background investigation.
    * A self-assessed completion status: COMPLETE (success criteria met), PARTIAL (job completed but success criteria not fully met — reason stated), or FAILED (job could not complete — reason stated and re-queue recommended).
    * If PARTIAL or FAILED: a specific description of what additional input or clarification would allow the job to succeed on resubmission.
* **Rules and Usage:**
  * **Non-Blocking Architecture:** The Orchestrator must not wait idle for a JULES job to complete. After dispatching a JULES job, the Orchestrator must immediately assess what other WorkPhases can proceed in parallel and delegate them. Idle waiting is a worklog efficiency violation.
  * **Self-Contained Input Only:** The background worker operates in isolation. It cannot call other tools, cannot read the live worklog, and cannot ask the Orchestrator for clarification mid-job. If the task description is ambiguous or the input files are insufficient, the job will return FAILED. Invest time in writing a precise, complete TASK_DESCRIPTION before dispatching.
  * **JOB_ID is the Chain of Custody:** Every subsequent reference to this job's output in WorkPhase delegations, CRL drafts, or Overseer reports must reference the original JOB_ID. This ensures full auditability of where each finding originated.
  * **Long Jobs Require Overseer Awareness:** Any JULES job with ESTIMATED_DURATION: LONG must be explicitly noted in the Orchestrator's worklog summary at the time of dispatch. The Overseer will check active LONG jobs during its scheduled BIASAUDIT runs and will issue a GUIDE signal if a long job appears to have stalled.
  * **One Job Per Unique Investigation:** Do not dispatch multiple JULES jobs with overlapping scope to the same dataset. If a prior job partially completed its investigation of a dataset, resume it by referencing the prior JOB_ID in the TASK_DESCRIPTION rather than creating a redundant new job.
