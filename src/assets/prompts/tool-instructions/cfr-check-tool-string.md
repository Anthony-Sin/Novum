---
name: "cfr-check-tool-string"
---
**CFR Title 21 Compliance Audit Tool (${strings/tool-prefix}CFRCHECK)**
* **Purpose:** Audit a submission document, clinical trial protocol, or data package against the applicable sections of the Code of Federal Regulations Title 21 (CFR Title 21), FDA guidance documents, and ICH guidelines. This tool is the primary instrument of the Regulatory Affairs Specialist agent and is used to identify procedural, documentation, and substantive compliance deficiencies that constitute independent grounds for a Complete Response Letter, separate from any efficacy or safety findings.
* **Syntax:**
${strings/tool-prefix}CFRCHECK
DOCUMENT_TYPE: <IND | NDA | BLA | PROTOCOL_AMENDMENT | INFORMED_CONSENT | LABELING_DRAFT | REMS_PROPOSAL | IB>
DOCUMENT_FILE: <Filename of the document to be audited, as present in the project context>
PRIMARY_REGULATIONS:
A JSON array of the specific CFR sections and ICH guidelines that are most directly applicable. Example: ["21 CFR 312.23", "21 CFR 314.50", "ICH E9(R1)", "ICH E6(R2)", "21 CFR 50.25"]. The tool will also scan against its full regulatory knowledge base, but will prioritize these sections in its output.
SPONSOR_CERTIFICATIONS: <A summary or filename reference of any specific regulatory certifications or assurances the sponsor has made in the submission cover letter or Form FDA 356h>
KNOWN_ISSUES: <A comma-separated list of compliance concerns already identified by other agents in prior WorkPhases, to avoid duplicate reporting and to verify if the document addresses them>
END_CFRCHECK
* **Output Structure & Content to Expect:**
  * The tool returns a structured compliance audit report containing:
    * A Section-by-Section Compliance Matrix mapping each primary regulation to specific document sections and rating each as COMPLIANT, DEFICIENT, or NOT_ADDRESSED.
    * A numbered Deficiency List where each deficiency includes: the specific CFR citation, the nature of the deficiency, the document location where it was found or is absent, and a recommended action (e.g., "Sponsor must provide..." or "Label must be revised to include...").
    * A completeness check against the required CTD (Common Technical Document) module structure, flagging any modules or sections that are absent, abbreviated without justification, or cross-referenced to a document not present in the submission.
    * An Informed Consent Assessment (if applicable) evaluating whether consent documents meet 21 CFR 50.25 requirements for disclosure of foreseeable risks, benefits, alternatives, and voluntary participation.
    * An overall Regulatory Compliance Rating: COMPLETE (submission is procedurally complete), INCOMPLETE (one or more required elements are absent), or DEFICIENT (substantive regulatory violations that independently preclude approval).
* **Rules and Usage:**
  * **Regulation Text is the Authority:** Interpretations of regulatory requirements must cite the specific CFR section or ICH guideline verbatim. Regulatory opinion without citation is inadmissible.
  * **GCP Compliance is Non-Negotiable:** Any finding suggesting that the trial was not conducted in accordance with ICH E6(R2) Good Clinical Practice must be rated CRITICAL and automatically elevates the submission's overall compliance rating to DEFICIENT, regardless of other findings.
  * **Protocol Amendments Under Scrutiny:** Any protocol amendment submitted after randomization began must be examined for whether it required a new IND safety report (21 CFR 312.32) and whether it was submitted to and approved by the IRB prior to implementation (21 CFR 312.66). Amendments that changed endpoints, enrollment criteria, or dose levels post-unblinding are presumptively integrity violations until the sponsor demonstrates otherwise.
  * **Labeling Standards:** Draft labeling must comply with 21 CFR 201.56 and 201.57 (Physician Labeling Rule). Efficacy claims in the Indications and Usage section must be directly supported by the primary endpoint data from the pivotal trial(s). Any claim that is broader than what the data supports must be specifically cited as a labeling deficiency.
  * **Pediatric Requirements:** The tool will automatically check whether the submission addresses the Pediatric Research Equity Act (PREA) requirements under 21 CFR 314.55, and flag if a pediatric study waiver or deferral was not included where required.
