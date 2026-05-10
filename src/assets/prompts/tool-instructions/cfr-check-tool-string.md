---
name: "cfr-check-tool-string"
---
**Publication Ethics Compliance Tool (${strings/tool-prefix}CFRCHECK)**
* **Purpose:** Audit a published paper, preprint, or associated documentation against the applicable COPE (Committee on Publication Ethics) guidelines, the journal's published editorial policies, ICMJE authorship criteria, IRB and ethics board requirements, and data sharing mandates. This tool is the primary instrument of the Publication Ethics Specialist agent and is used to identify procedural, documentation, and substantive publication ethics violations that constitute independent grounds for an Expression of Concern or Retraction Recommendation, separate from any statistical or data integrity findings.
* **Syntax:**
${strings/tool-prefix}CFRCHECK
DOCUMENT_TYPE: <RESEARCH_ARTICLE | CLINICAL_TRIAL_REPORT | SYSTEMATIC_REVIEW | CASE_REPORT | LETTER | PREPRINT>
DOCUMENT_FILE: <Filename of the paper or document to be audited, as present in the project context>
PRIMARY_STANDARDS:
A JSON array of the specific COPE guidelines, ICMJE sections, and journal policies that are most directly applicable. Example: ["COPE Core Practices", "COPE Retraction Guidelines", "ICMJE Authorship Criteria", "Journal Data Sharing Policy", "IRB Requirement 21 CFR 56"]. The tool will also scan against its full publication ethics knowledge base, but will prioritize these standards in its output.
AUTHOR_DISCLOSURES: <A summary or filename reference of any specific conflict of interest declarations, funding acknowledgments, or author contribution statements in the paper>
KNOWN_ISSUES: <A comma-separated list of publication ethics concerns already identified by other agents in prior WorkPhases, to avoid duplicate reporting>
END_CFRCHECK
* **Output Structure and Content to Expect:**
  * The tool returns a structured compliance audit report containing:
    * A Section-by-Section Compliance Matrix mapping each primary standard to specific paper sections and rating each as COMPLIANT, DEFICIENT, or NOT_ADDRESSED.
    * A numbered Violation List where each violation includes: the specific COPE guideline or journal policy citation, the nature of the violation, the paper section where it was found or is absent, and a recommended action.
    * A completeness check against required reporting standards (CONSORT, PRISMA, ARRIVE, or other applicable reporting checklist), flagging any required elements that are absent or inadequately reported.
    * An Ethics Board Assessment evaluating whether the paper demonstrates adequate IRB or ethics committee approval for research involving human subjects or animals.
    * An overall Publication Ethics Compliance Rating: COMPLIANT (paper meets all applicable publication ethics standards), DEFICIENT (one or more required elements are absent or inadequate), or VIOLATED (substantive publication ethics violations that independently support an Expression of Concern or Retraction Recommendation).
* **Rules and Usage:**
  * **COPE Guidelines are the Authority:** Interpretations of publication ethics requirements must cite the specific COPE guideline or journal policy verbatim. Ethical opinion without citation is inadmissible.
  * **Preregistration Violations are Non-Negotiable:** Any clinical trial or prospective observational study that lacks a preregistration record, or whose preregistration was submitted after data collection began, must be rated as a DEFICIENT finding and flagged for the Statistical Fraud Auditor to investigate for outcome switching.
  * **Authorship Must Meet ICMJE Criteria:** Every listed author must have made contributions meeting all four ICMJE authorship criteria. Any author who cannot be shown to meet all four criteria must be flagged as a potential ghost authorship or gift authorship violation.
  * **Data Sharing Commitments Must Be Verified:** If the paper includes a data availability statement committing to share raw data, the tool will verify whether the data is actually accessible at the stated location and flag any non-compliance with that commitment.
