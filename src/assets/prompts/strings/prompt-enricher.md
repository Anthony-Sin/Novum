---
name: "prompt-enricher"
---
Provide additional research integrity investigation guidance for the following forensic audit Work Phase task assigned to an AI agent. Provide only the final additional guidance as your response.

When enriching, you must:
* If the task mentions a URL (e.g., a preregistration record, a journal policy page, a Retraction Watch entry, a PubPeer thread, a CrossRef DOI) you MUST suggest it be fetched to confirm its contents. NEVER assume what is at a URL.
* **Infer Investigation Intent:** Analyze the raw task to determine its core forensic objective — is this about statistical validity, data integrity, figure authenticity, publication ethics compliance, or research impact? Understand why this task exists within the broader paper investigation.
* **Extract ALL Requirements and Constraints:** Carefully identify every requirement in the task, including:
  * **Core Forensic Actions:** What analysis must be performed? What tool must be invoked?
  * **Conditions and Scope Limits:** Which datasets, endpoints, or COPE sections are in scope? What is explicitly out of scope?
  * **Desired Findings Format:** What must the output look like — a numbered anomaly list, a statistical discrepancy table, a narrative report section?
  * **CRITICAL — Preserve All Acceptance Criteria:** Every stated acceptance criterion is mandatory. Do not deprioritize, soften, or omit any criterion.
* **Define Clear Adversarial Scope:** Based on the forensic intent and all extracted requirements, define a scope that is explicitly adversarial toward the authors' conclusions. Do not frame any analytical task as a validation of the authors' claims — frame it as an independent investigation of whether the evidence supports or refutes those claims.
* **Elaborate for Forensic Clarity:** Clarify ambiguities in scientific terminology. If the task says 'check the data', specify which files (raw data, supplementary tables, figure source data), which populations (full sample, per-protocol subgroup), and which integrity types (value fabrication, selective exclusion, figure duplication, impossible statistics).
* **CRITICAL: Enforce the Chain of Evidence Consistency Rule:** If the task modifies or produces a finding at one point in the evidence chain (raw data → summary statistics → reported table or figure → methods description → abstract conclusion), you MUST explicitly require that all downstream documents referencing that finding are also updated consistently. A statistical discrepancy finding that is not reflected in the Expression of Concern's Methods Integrity section is an incomplete finding.
* Do not introduce new analytical requirements unless they are strictly necessary to satisfy the Chain of Evidence Consistency Rule.
* Do not reduce the adversarial rigor of any requirement, even if it seems redundant or overly conservative. In forensic investigation, conservative completeness is required.

The investigation task is being applied to the following paper investigation project:
${Spec}

You should also consider the following baseline investigation assumptions:
${strings/base-assumptions}
${Assumptions}

The format of your response must use the following template:
Consider the following additional research integrity investigation guidance when completing this task:
* [Between five and ten specific, actionable bullet points based on your enrichment analysis, each referencing the applicable tool, dataset, COPE section, or scientific standard where relevant]

----
Here is the Work Phase task to enrich:
${OriginalPrompt}
