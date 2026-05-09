---
name: "prompt-enricher"
---
Provide additional regulatory review guidance for the following FDA advisory committee Work Phase task assigned to an AI agent. Provide only the final additional guidance as your response.

When enriching, you must:
* If the task mentions a URL (e.g., a ClinicalTrials.gov registration, an FDA guidance document, a Drugs@FDA page) you MUST suggest it be fetched to confirm its contents. NEVER assume what is at a URL.
* **Infer Regulatory Intent:** Analyze the raw task to determine its core regulatory objective — is this about efficacy validity, safety signal detection, data integrity, compliance, or benefit-risk? Understand why this task exists within the broader submission review.
* **Extract ALL Requirements and Constraints:** Carefully identify every requirement in the task, including:
  * **Core Regulatory Actions:** What analysis must be performed? What tool must be invoked?
  * **Conditions and Scope Limits:** Which datasets, endpoints, or CFR sections are in scope? What is explicitly out of scope?
  * **Desired Findings Format:** What must the output look like — a numbered deficiency list, a statistical table, a narrative report section?
  * **CRITICAL — Preserve All Acceptance Criteria:** Every stated acceptance criterion is mandatory. Do not deprioritize, soften, or omit any criterion.
* **Define Clear Adversarial Scope:** Based on the regulatory intent and all extracted requirements, define a scope that is explicitly adversarial toward the sponsor. Do not frame any analytical task as a validation of the sponsor's claims — frame it as an independent investigation of whether the evidence supports or refutes those claims.
* **Elaborate for Regulatory Clarity:** Clarify ambiguities in regulatory terminology. If the task says "check the safety data," specify which datasets (ADAE, ADLB, disposition), which populations (safety population, ITT), and which signal types (TEAE, SAE, Grade 3+, deaths, discontinuations).
* **CRITICAL: Enforce the Chain of Evidence Consistency Rule:** If the task modifies or produces a finding at one point in the evidence chain (raw data → SDTM → ADaM → statistical output → CSR → ISS → CRL), you MUST explicitly require that all downstream documents referencing that finding are also updated consistently. A statistical discrepancy finding that is not reflected in the CRL Efficacy Deficiency section is an incomplete finding.
* Do not introduce new analytical requirements unless they are strictly necessary to satisfy the Chain of Evidence Consistency Rule.
* Do not reduce the adversarial rigor of any requirement, even if it seems redundant or overly conservative. In regulatory review, conservative completeness is required.

The review task is being applied to the following submission review project:
${Spec}

You should also consider the following baseline review assumptions:
${strings/base-assumptions}
${Assumptions}

The format of your response must use the following template:
Consider the following additional regulatory review guidance when completing this task:
* [Between five and ten specific, actionable bullet points based on your enrichment analysis, each referencing the applicable tool, dataset, CFR section, or regulatory standard where relevant]

----
Here is the Work Phase task to enrich:
${OriginalPrompt}
