---
name: "draft-crl-tool-string"
---
**Complete Response Letter Drafting Tool (${strings/tool-prefix}DRAFTCRL)**
* **Purpose:** Compile all findings from completed WorkPhases into a structured, regulatory-grade Complete Response Letter (CRL) or Approval Recommendation document. This tool is the primary instrument of the Medical Writer agent and is invoked only after all mandatory audit WorkPhases — Biostatistical Audit, Pharmacovigilance Scan, CFR Compliance Check, Data Reconciliation, and Risk-Benefit Analysis — have returned completed results. The output is a formal regulatory document written in the voice of the FDA Advisory Committee, not the sponsor. It must be adversarial, evidence-grounded, and citation-specific.
* **Syntax:**
${strings/tool-prefix}DRAFTCRL
SUBMISSION_TYPE: <NDA | BLA | IND>
APPLICATION_NUMBER: <The FDA application number, e.g., NDA 214787, or DRAFT if not yet assigned>
DRUG_NAME: <INN and proposed trade name>
PROPOSED_INDICATION: <Exact text of the proposed indication from the draft labeling>
SPONSOR_NAME: <Legal name of the sponsor entity>
OVERALL_VERDICT: <APPROVABLE | NOT_APPROVABLE | COMPLETE_RESPONSE_REQUIRED — must match the Orchestrator's synthesized determination prior to Medical Writer engagement>
WORKPHASE_OUTPUTS:
A JSON array referencing every completed WorkPhase result that must be incorporated into the CRL. Each entry must include: 'phase_id', 'agent_persona', 'verdict', and 'key_findings_summary'. The Medical Writer will retrieve the full output of each referenced phase from the project context.
LABEL_REVISION_REQUESTS: <A JSON array of specific sections of the draft labeling that must be revised, each with 'section' (e.g., "Warnings and Precautions", "Adverse Reactions", "Indications and Usage") and 'required_change'>
POST_MARKET_COMMITMENTS: <A JSON array of any post-market study commitments (PMCs) or post-market requirements (PMRs) the committee is conditioning approval upon, if the verdict is APPROVABLE. Enter [] if not applicable.>
END_DRAFTCRL
* **Output Structure & Content to Expect:**
  * The tool returns a complete, structured CRL document containing the following sections:
    * **Executive Summary:** A 3–5 paragraph plain-language summary of the committee's determination, suitable for public release, stating the overall verdict and the top three reasons for the determination.
    * **Deficiency Section 1 — Efficacy:** Numbered list of all efficacy deficiencies, each with full citation to the specific STATAUDIT finding, the SAP deviation or protocol amendment that gave rise to it, and the data the sponsor would need to provide to resolve it.
    * **Deficiency Section 2 — Safety:** Numbered list of all safety deficiencies, each citing the specific SAFETYSCAN finding, the AE preferred term and incidence data, and the required label change or additional study.
    * **Deficiency Section 3 — Regulatory/CMC:** Numbered list of all CFR compliance deficiencies from the CFRCHECK output, each with the specific regulatory citation.
    * **Deficiency Section 4 — Data Integrity:** Numbered list of all dataset integrity findings from the RECONCILE output, each with the specific dataset, variable, and subject records involved.
    * **Labeling Revision Requests:** A redline-style enumeration of all required changes to the draft labeling, organized by section.
    * **Post-Market Commitments (if applicable):** A formal enumeration of all PMCs/PMRs with proposed timelines and reporting requirements.
    * **Path Forward:** A clear statement of what the sponsor must submit in a resubmission to address each deficiency, organized by deficiency class.
* **Rules and Usage:**
  * **Every Finding Must Be Cited:** The CRL is a legal document. Every deficiency must be traceable to a specific WorkPhase output, dataset record, CFR citation, or statistical calculation. Unsupported assertions are not permitted.
  * **No New Findings:** The Medical Writer may not introduce findings that were not documented in a prior WorkPhase output. If a gap is discovered during drafting, the Medical Writer must stop, flag the gap to the Orchestrator, and request a new WorkPhase to investigate before proceeding.
  * **Verdict Consistency:** The overall verdict in the CRL must be logically consistent with the individual deficiency findings. A NOT_APPROVABLE verdict cannot coexist with zero CRITICAL deficiencies. An APPROVABLE verdict cannot stand if any CRITICAL safety deficiency remains unresolved.
  * **Plain Language in the Executive Summary:** The Executive Summary must be comprehensible to a non-statistician member of the public. Statistical jargon in the executive summary will be flagged as a drafting deficiency.
  * **Labeling is Protective, Not Promotional:** All language in the Labeling Revision Requests section must be written to protect the patient, not to preserve the sponsor's commercial claims. Any sponsor language that overstates efficacy or understates risk must be specifically identified and replaced with data-grounded, neutral language.
