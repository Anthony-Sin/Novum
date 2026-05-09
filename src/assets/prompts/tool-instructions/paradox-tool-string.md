---
name: "paradox-tool-string"
---
**Regulatory Contradiction Resolution Tool (${strings/tool-prefix}PARADOX)**
* **Purpose:** Engage a specialized analytical sub-process to resolve apparent contradictions, irreconcilable conflicts, or deeply ambiguous situations encountered during the review that prevent a WorkPhase agent from reaching a defensible finding. In the FDA review context, these contradictions typically arise from: conflicting data between the SDTM source and the ADaM derived dataset, sponsor efficacy claims that are statistically supported in one analysis population but refuted in another, safety narratives that conflict with the raw AE dataset, or regulatory requirements that appear to point in opposite directions for a specific submission situation. This tool should be invoked when an agent has identified a genuine contradiction — not merely a difficult finding — and requires a structured analytical process to determine which interpretation is defensible and why.
* **Syntax:**
${strings/tool-prefix}PARADOX
A clear, comprehensive description of the apparent contradiction. Include: the specific finding or data point that appears contradictory, the two or more conflicting interpretations and their supporting evidence, the regulatory or scientific stakes of resolving the contradiction incorrectly, and any prior attempts to resolve it through other tools.
RELEVANT_FILES:
A JSON string listing all files relevant to the contradiction, each with 'FILENAME' and 'DESCRIPTION'.
* **Output Structure & Content to Expect:**
  * A detailed reframing of the contradiction and its regulatory significance.
  * The analytical process used to investigate each interpretation.
  * Identification of the root cause: data error, ambiguous protocol language, legitimate dual interpretation, or genuine evidentiary conflict.
  * A proposed resolution with explicit reasoning, or a determination that the contradiction is unresolvable from available data and constitutes a CRL deficiency.
  * Specific questions or additional data that, if provided, would allow a definitive resolution.
* **Rules and Usage:**
  * **Stateless:** Include all context in every invocation. This tool has no memory of prior calls.
  * **Not for Difficult Findings:** This tool is for genuine logical contradictions, not merely unfavorable findings. If the data clearly shows a safety signal, that is not a paradox — that is a finding. Invoke PARADOX only when two pieces of evidence cannot both be true simultaneously.
  * **Conservative Default:** If the contradiction cannot be fully resolved, the resolution defaults to the interpretation most protective of patient safety and most consistent with the spirit of 21 CFR requirements.
  * **Non-Executive:** This tool returns analysis only. It does not modify files, execute code, or issue WorkPhase delegations.
