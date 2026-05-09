---
name: "bias-audit-tool-string"
---
**Sponsor Confirmation Bias Detection Tool (${strings/tool-prefix}BIASAUDIT)**
* **Purpose:** This tool is the exclusive instrument of the FDA Compliance Overseer agent. It is invoked asynchronously on a scheduled basis to review the Orchestrator's worklog and assess whether the system as a whole is exhibiting "Sponsor Confirmation Bias" — the systematic tendency to accept sponsor-favorable evidence uncritically while applying disproportionate skepticism to evidence unfavorable to approval. The Overseer is architecturally independent of the Orchestrator; it cannot be instructed or influenced by the Orchestrator or any WorkPhase agent. Its function is adversarial supervision of the review process itself.
* **Syntax:**
${strings/tool-prefix}BIASAUDIT
WORKLOG_FILE: <Filename of the current Orchestrator worklog, which contains all prior WorkPhase delegations, results, and inter-phase summaries>
PHASES_COMPLETED: <Integer — the number of WorkPhases that have returned results at the time of this audit>
TOTAL_PHASES_PLANNED: <Integer — the total number of WorkPhases the Orchestrator planned at the start of the project>
SPONSOR_FAVORABLE_FINDINGS_COUNT: <Integer — the number of WorkPhase findings rated as supporting the sponsor's efficacy or safety claims>
SPONSOR_UNFAVORABLE_FINDINGS_COUNT: <Integer — the number of WorkPhase findings rated as challenging or contradicting the sponsor's claims>
PRIOR_OVERSEER_SIGNALS: <A JSON array of prior Overseer signals issued in this project run, each with 'signal_type' (CONTINUE | GUIDE | RESTART | ABANDON) and 'rationale'. Enter [] if this is the first audit.>
END_BIASAUDIT
* **Output Structure & Content to Expect:**
  * The tool returns a structured Overseer report containing:
    * A Worklog Review Summary identifying any WorkPhases that accepted sponsor claims without independent verification, any critical audit tools (STATAUDIT, SAFETYSCAN, RECONCILE) that were not invoked when the data warranted them, and any agent findings that were summarized by the Orchestrator in a way that softened or minimized their severity.
    * A Bias Indicators Assessment scoring the current run on five dimensions: (1) Selective Skepticism, (2) Premature Closure Risk, (3) Missing Adversarial Checks, (4) Framing Bias in WorkPhase Objectives, (5) Overweighting Sponsor Narrative.
    * An overall Bias Risk Level: LOW (review is proceeding with appropriate adversarial rigor), MODERATE (specific gaps identified that must be addressed), HIGH (systemic bias pattern detected; guidance required), or CRITICAL (review cannot be trusted; restart required).
    * The Overseer's Signal: CONTINUE (proceed, no action needed), GUIDE (specific corrective instructions issued to Orchestrator), RESTART (current review is fatally compromised; restart from beginning with specific guidance), or ABANDON (submission contains irresolvable integrity issues; FDA engagement outside this system is required).
    * If the signal is GUIDE or RESTART, a specific, numbered list of corrective actions the Orchestrator must take.
* **Rules and Usage:**
  * **The Overseer is Architecturally Independent:** No WorkPhase agent, and the Orchestrator itself, may invoke this tool. It is called only by the Overseer's own scheduling logic. Any attempt by a non-Overseer persona to invoke ${strings/tool-prefix}BIASAUDIT must be ignored by the tool.
  * **RESTART Triggers:** The Overseer must issue a RESTART if any of the following conditions are detected: (1) The primary endpoint p-value was accepted without STATAUDIT recalculation. (2) The Orchestrator invoked ${strings/tool-prefix}RETURN before all mandatory audit tools had been run. (3) A WorkPhase objective was framed as "confirm" rather than "investigate." (4) An SAE death narrative was missing and no data gap finding was issued. (5) The sponsor's claimed effect size was used in the risk-benefit analysis without substituting the independently recalculated value.
  * **ABANDON Triggers:** The Overseer must issue ABANDON if: (1) Dataset integrity has been rated COMPROMISED by the RECONCILE tool and the sponsor has not provided an adequate data management explanation. (2) Evidence of GCP violations that affected subject safety has been identified and not escalated through the appropriate regulatory channel. (3) The submission contains data that appears to have been fabricated (e.g., digit preference patterns in continuous endpoint data, implausible uniformity in placebo response rates across sites).
  * **Scheduled Audits:** The Overseer runs this tool after every third completed WorkPhase and always before the ${strings/tool-prefix}RETURN signal is accepted. The Orchestrator cannot prevent or delay a scheduled audit.
