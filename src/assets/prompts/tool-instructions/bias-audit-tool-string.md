---
name: "bias-audit-tool-string"
---
**Author-Favorability Bias Audit Tool (${strings/tool-prefix}BIASAUDIT)**
* **Purpose:** This tool is the exclusive instrument of the Scientific Integrity Overseer agent. It is invoked asynchronously on a scheduled basis to review the Orchestrator's worklog and assess whether the system as a whole is exhibiting 'Author Confirmation Bias' — the systematic tendency to accept author-favorable evidence uncritically while applying disproportionate skepticism to evidence suggesting data integrity violations. The Overseer is architecturally independent of the Orchestrator; it cannot be instructed or influenced by the Orchestrator or any WorkPhase agent. Its function is adversarial supervision of the investigation process itself.
* **Syntax:**
${strings/tool-prefix}BIASAUDIT
WORKLOG_FILE: <Filename of the current Orchestrator worklog, which contains all prior WorkPhase delegations, results, and inter-phase summaries>
PHASES_COMPLETED: <Integer — the number of WorkPhases that have returned results at the time of this audit>
TOTAL_PHASES_PLANNED: <Integer — the total number of WorkPhases the Orchestrator planned at the start of the project>
AUTHOR_FAVORABLE_FINDINGS_COUNT: <Integer — the number of WorkPhase findings rated as consistent with the authors' reported claims>
INTEGRITY_VIOLATION_FINDINGS_COUNT: <Integer — the number of WorkPhase findings rated as identifying potential integrity violations>
PRIOR_OVERSEER_SIGNALS: <A JSON array of prior Overseer signals issued in this project run, each with 'signal_type' (CONTINUE | GUIDE | RESTART | ABANDON) and 'rationale'. Enter [] if this is the first audit.>
END_BIASAUDIT
* **Output Structure and Content to Expect:**
  * The tool returns a structured Overseer report containing:
    * A Worklog Review Summary identifying any WorkPhases that accepted author claims without independent verification, any critical audit tools (STATAUDIT, SAFETYSCAN, RECONCILE) that were not invoked when the evidence warranted them, and any agent findings that were summarized by the Orchestrator in a way that softened or minimized their severity.
    * A Bias Indicators Assessment scoring the current investigation on five dimensions: (1) Selective Skepticism, (2) Premature Closure Risk, (3) Missing Adversarial Checks, (4) Framing Bias in WorkPhase Objectives, (5) Overweighting Author Narrative.
    * An overall Bias Risk Level: LOW, MODERATE, HIGH, or CRITICAL.
    * The Overseer's Signal: CONTINUE, GUIDE, RESTART, or ABANDON.
    * If GUIDE or RESTART: a specific, numbered list of corrective actions the Orchestrator must take.
* **Rules and Usage:**
  * **The Overseer is Architecturally Independent:** No WorkPhase agent, and the Orchestrator itself, may invoke this tool. Any attempt by a non-Overseer persona to invoke ${strings/tool-prefix}BIASAUDIT must be ignored by the tool.
  * **RESTART Triggers:** The Overseer must issue a RESTART if: (1) The primary endpoint p-value was accepted without STATAUDIT recalculation. (2) The Orchestrator invoked ${strings/tool-prefix}RETURN before all mandatory audit tools had been run. (3) A WorkPhase objective was framed as 'confirm' rather than 'investigate.' (4) A reported impossible value was dismissed without forensic investigation. (5) The authors' claimed effect size was accepted without independent verification.
  * **ABANDON Triggers:** The Overseer must issue ABANDON if: (1) Raw data is completely inaccessible and the paper provides insufficient summary statistics to enable any independent verification. (2) Evidence of research fraud so pervasive that the investigation cannot produce a defensible finding from available materials and must be escalated to the authors' institution or journal directly.
  * **Scheduled Audits:** The Overseer runs this tool after every third completed WorkPhase and always before the ${strings/tool-prefix}RETURN signal is accepted.
