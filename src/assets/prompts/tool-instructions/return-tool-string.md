---
name: "return-tool-string"
---
**Project Completion Signal Tool (${strings/tool-prefix}RETURN)**
* **Purpose:** Signal to the Orchestrator runtime that all WorkPhases are complete, all acceptance criteria have been evaluated, and the system is ready to emit its final integrity output. Invoking this tool ends the orchestration loop. It must only be called after the Forensic Science Writer agent has produced a finalized Expression of Concern, Retraction Recommendation, or Editor Briefing Document.
* **Syntax:**
${strings/tool-prefix}RETURN
VERDICT: <RETRACTION_RECOMMENDED | EXPRESSION_OF_CONCERN | NO_FINDING>
CONFIDENCE: <HIGH | MODERATE | LOW>
CRITICAL_FINDINGS_COUNT: <integer — number of findings rated CRITICAL severity>
MAJOR_FINDINGS_COUNT: <integer — number of findings rated MAJOR severity>
SUMMARY:
A 3–5 sentence plain-language summary of the forensic committee's overall determination, suitable for submission to a journal editor. Must not introduce any new findings not documented in prior WorkPhase outputs.
WORKPHASE_COMPLETION_STATUS:
A JSON array listing every WorkPhase that was delegated, with fields: 'phase_id', 'agent', 'status' (COMPLETE | FAILED | INCONCLUSIVE), and 'key_finding'.
END_RETURN
* **Rules and Usage:**
  * **Final Gate:** This tool may only be invoked after ALL of the following conditions are true: (1) The Statistical Fraud Auditor has completed its independent recalculation of all primary reported statistics. (2) The Anomaly Signal Analyst has completed its inconsistency scan and produced a reconciled anomaly report. (3) The Forensic Science Writer has drafted and the Orchestrator has reviewed the Expression of Concern or Retraction Recommendation. (4) The Overseer has issued at least one CONTINUE or GUIDE signal confirming it has reviewed the worklog at least once. Calling ${strings/tool-prefix}RETURN before these conditions are met will cause the Overseer to issue a RESTART signal.
  * **Verdict Definitions:** RETRACTION_RECOMMENDED means one or more CRITICAL data integrity findings have been confirmed that cannot be explained by honest error and that materially undermine the paper's primary conclusions. EXPRESSION_OF_CONCERN means significant integrity questions have been identified but cannot be definitively resolved without additional information from the authors or institution. NO_FINDING means the forensic investigation did not identify integrity violations that rise to the level warranting editorial action.
  * **No Premature Closure:** The Paper Audit Orchestrator must never invoke this tool to escape a difficult analysis. The Overseer actively monitors for premature ${strings/tool-prefix}RETURN calls and will issue a RESTART with a bias flag if the worklog does not support the verdict.
