---
name: "draft-crl-tool-string"
---
**Expression of Concern and Retraction Recommendation Drafting Tool (${strings/tool-prefix}DRAFTCRL)**
* **Purpose:** Compile all forensic findings from completed WorkPhases into a structured, standards-compliant Expression of Concern (EoC), Retraction Recommendation, or Editor Briefing Document. This tool is the primary instrument of the Forensic Science Writer agent and is invoked only after all mandatory audit WorkPhases — Statistical Reconstruction, Result Anomaly Detection, Dataset Integrity Review, Publication Ethics Compliance Review, and Research Impact Assessment — have returned completed results. The output is a formal research integrity document written in the voice of an independent forensic audit committee, not the authors. It must be adversarial, evidence-grounded, and citation-specific.
* **Syntax:**
${strings/tool-prefix}DRAFTCRL
PAPER_TITLE: <Full title of the paper under investigation>
DOI: <DOI of the paper, or UNKNOWN if not available>
AUTHORS: <Author list as published>
JOURNAL: <Journal name and publication year>
OVERALL_VERDICT: <RETRACTION_RECOMMENDED | EXPRESSION_OF_CONCERN | NO_FINDING — must match the Orchestrator's synthesized determination prior to Forensic Science Writer engagement>
WORKPHASE_OUTPUTS:
A JSON array referencing every completed WorkPhase result that must be incorporated into the document. Each entry must include: 'phase_id', 'agent_persona', 'verdict', and 'key_findings_summary'. The Forensic Science Writer will retrieve the full output of each referenced phase from the project context.
DATA_INTEGRITY_VIOLATIONS: <A JSON array of specific data integrity violations found, each with 'section' (e.g., 'Figure 3', 'Table 2', 'Supplementary Data File 1') and 'violation_description'>
POST_INVESTIGATION_REQUIREMENTS: <A JSON array of any specific actions the journal or authors should take in response to the findings, e.g., 'Provide raw data files', 'Provide figure source files', 'Provide preregistration documentation'. Enter [] if not applicable.>
END_DRAFTCRL
* **Output Structure and Content to Expect:**
  * The tool returns a complete, structured document containing the following sections:
    * **Executive Summary:** A 3–5 paragraph plain-language summary of the forensic committee's determination, suitable for submission to a journal editor, stating the overall verdict and the top three reasons for the determination.
    * **Finding Section 1 — Statistical Integrity:** Numbered list of all statistical integrity findings, each with full citation to the specific STATAUDIT finding, the preregistration deviation or post-hoc analysis change that gave rise to it, and the data the authors would need to provide to resolve it.
    * **Finding Section 2 — Data and Figure Integrity:** Numbered list of all data and figure integrity findings, each citing the specific SAFETYSCAN or RECONCILE finding and the specific figure panel, table row, or data file involved.
    * **Finding Section 3 — Publication Ethics Compliance:** Numbered list of all publication ethics violations from the CFRCHECK output, each with the specific COPE guideline or journal policy citation.
    * **Finding Section 4 — Research Impact Assessment:** A summary of the downstream harm quantification from the impact assessment phase, including citation counts, clinical practice changes, and wasted follow-on funding.
    * **Required Author or Journal Actions:** A clear statement of what the authors or journal must provide or do in response to each finding, organized by finding class.
    * **Path to Resolution:** A clear statement of what evidence, if provided and verified, could change the verdict from RETRACTION_RECOMMENDED to EXPRESSION_OF_CONCERN or NO_FINDING.
* **Rules and Usage:**
  * **Every Finding Must Be Cited:** The EoC or Retraction Recommendation is a formal document. Every finding must be traceable to a specific WorkPhase output, data file, COPE citation, or statistical recalculation. Unsupported assertions are not permitted.
  * **No New Findings:** The Forensic Science Writer may not introduce findings that were not documented in a prior WorkPhase output. If a gap is discovered during drafting, the Writer must stop, flag the gap to the Orchestrator, and request a new WorkPhase to investigate before proceeding.
  * **Verdict Consistency:** The overall verdict must be logically consistent with the individual findings. A RETRACTION_RECOMMENDED verdict cannot coexist with zero CRITICAL findings. A NO_FINDING verdict cannot stand if any CRITICAL data integrity finding remains unresolved.
