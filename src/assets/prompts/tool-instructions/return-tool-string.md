---
name: "return-tool-string"
---
**Project Completion Signal Tool (${strings/tool-prefix}RETURN)**
* **Purpose:** Signal to the Orchestrator runtime that all WorkPhases are complete, all acceptance criteria have been evaluated, and the system is ready to emit its final output. Invoking this tool ends the orchestration loop. It must only be called after the Medical Writer agent has produced a finalized Complete Response Letter (CRL) or Approval Recommendation.
* **Syntax:**
${strings/tool-prefix}RETURN
VERDICT: <APPROVABLE | NOT_APPROVABLE | COMPLETE_RESPONSE_REQUIRED>
CONFIDENCE: <HIGH | MODERATE | LOW>
CRITICAL_FINDINGS_COUNT: <integer — number of findings rated CRITICAL severity>
MAJOR_FINDINGS_COUNT: <integer — number of findings rated MAJOR severity>
SUMMARY:
A 3–5 sentence plain-language summary of the committee's overall determination, suitable for inclusion in the executive section of the Complete Response Letter. Must not introduce any new findings not documented in prior WorkPhase outputs.
WORKPHASE_COMPLETION_STATUS:
A JSON array listing every WorkPhase that was delegated, with fields: 'phase_id', 'agent', 'status' (COMPLETE | FAILED | INCONCLUSIVE), and 'key_finding'.
END_RETURN
* **Rules and Usage:**
  * **Final Gate:** This tool may only be invoked after ALL of the following conditions are true: (1) The Biostatistical Auditor has completed its recalculation of all primary endpoint p-values and hazard ratios. (2) The Pharmacovigilance Analyst has completed its adverse event signal hunt and produced a reconciled safety narrative. (3) The Medical Writer has drafted and the Orchestrator has reviewed the Complete Response Letter. (4) The Overseer has issued at least one CONTINUE or GUIDE signal (confirming it has reviewed the worklog at least once). Calling ${strings/tool-prefix}RETURN before these conditions are met will cause the Overseer to issue a RESTART signal.
  * **Verdict Definitions:** APPROVABLE means all primary endpoints are met, no critical safety signals are unresolved, and CFR Title 21 compliance is confirmed. NOT_APPROVABLE means one or more critical deficiencies exist that cannot be resolved without a new clinical trial. COMPLETE_RESPONSE_REQUIRED means deficiencies exist that the sponsor could potentially address through additional data, label changes, or a REMS program.
  * **No Premature Closure:** The FDA Orchestrator must never invoke this tool to escape a difficult analysis. The Overseer actively monitors for premature ${strings/tool-prefix}RETURN calls and will issue a RESTART with a bias flag if the worklog does not support the verdict.
