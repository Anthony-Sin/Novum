---
name: "ctd-track-tool-string"
---
**CTD Module Tracking Tool (${strings/tool-prefix}CTDTRACK)**
* **Purpose:** Maintain a real-time inventory and completeness assessment of the Common Technical Document (CTD) modules submitted as part of an NDA, BLA, or IND. This tool is the primary instrument of the Submission Coordinator agent. It provides the FDA Orchestrator with a single authoritative map of what has been submitted, what is missing, what has been reviewed, and which modules are blocking downstream WorkPhases. It prevents the system from issuing an efficacy or safety determination based on an incomplete submission package.
* **Syntax:**
${strings/tool-prefix}CTDTRACK
SUBMISSION_ROOT_FILE: <Filename of the submission index or table of contents document, typically the Form FDA 356h or the eCTD backbone XML file, as present in the project context>
SUBMISSION_TYPE: <NDA | BLA | IND>
TRACK_MODE: <INVENTORY | COMPLETENESS_CHECK | DEPENDENCY_MAP>
  INVENTORY: Enumerate all submitted files, organize them by CTD module (1–5), and identify their document type and review status.
  COMPLETENESS_CHECK: Compare the submitted modules against the required content checklist for the specified submission type and flag all missing, incomplete, or improperly formatted elements.
  DEPENDENCY_MAP: Identify which submitted documents are prerequisites for each planned WorkPhase and flag any WorkPhase that is attempting to proceed without its required document inputs.
MODULES_OF_CONCERN: <A JSON array of specific CTD module numbers or document types that require priority tracking — e.g., ["2.7.3", "2.7.4", "5.3.5.1", "5.3.5.2", "Integrated Summary of Safety"]. Enter [] to track all modules equally.>
PRIOR_INVENTORY_FILE: <Filename of a prior CTDTRACK INVENTORY output if this is an updated check (e.g., after a sponsor resubmission). Enter NONE for the initial review.>
END_CTDTRACK
* **Output Structure & Content to Expect:**
  * The tool returns a structured CTD tracking report containing:
    * **Module Inventory Table** (INVENTORY mode): A hierarchical listing of all submitted documents organized by CTD module number, with document title, file format, file size, and current review status (NOT_STARTED | IN_REVIEW | COMPLETE | FLAGGED).
    * **Completeness Gap Report** (COMPLETENESS_CHECK mode): A numbered list of all required CTD elements that are absent, incomplete, or improperly formatted, each with the regulatory basis for the requirement and its impact severity (CRITICAL — blocks review | MAJOR — requires completion before approval | MINOR — administrative deficiency).
    * **WorkPhase Dependency Map** (DEPENDENCY_MAP mode): A matrix showing each planned WorkPhase agent, the specific CTD documents it requires as inputs, and a status indicator: READY (all required documents present), BLOCKED (one or more required documents missing or flagged), or AT_RISK (documents present but flagged for integrity concerns by a prior WorkPhase).
    * **Delta Report** (if PRIOR_INVENTORY_FILE is not NONE): A comparison between the prior and current inventory showing newly submitted documents, revised documents, and any documents that were present in the prior submission but are absent in the current one (a potentially serious integrity concern).
    * **Overall Submission Readiness Rating**: COMPLETE (all required modules present, no critical gaps), REVIEWABLE_WITH_GAPS (minor gaps that do not block the primary review but require resolution before approval), or INCOMPLETE (critical gaps that prevent meaningful review from beginning).
* **Rules and Usage:**
  * **First WorkPhase:** The CTDTRACK COMPLETENESS_CHECK must be the very first WorkPhase delegated by the FDA Orchestrator for every new submission. No clinical review WorkPhase (efficacy, safety, statistics) may be delegated until the Submission Coordinator has confirmed the submission is at minimum REVIEWABLE_WITH_GAPS.
  * **Missing ISS/ISE is a Hard Stop:** If the Integrated Summary of Safety (Module 2.7.4) or Integrated Summary of Efficacy (Module 2.7.3) is absent from the submission, the Submission Coordinator must issue an INCOMPLETE rating and the Orchestrator must not proceed to clinical review WorkPhases until these documents are received. These are non-negotiable prerequisites for an NDA review.
  * **Dataset Packages Must Match Claimed Analyses:** Every statistical analysis described in the Clinical Study Reports (Module 5.3.5) must have a corresponding analysis dataset (ADaM) and raw data domain (SDTM) present in Module 5. Any analysis whose supporting dataset cannot be located in the submission is presumptively unverifiable and must be flagged as a CRITICAL data gap.
  * **Amendment Tracking:** All post-original-submission amendments must be individually logged and their scope assessed. An amendment that modified the primary endpoint definition must be flagged as requiring STATAUDIT review. An amendment that changed entry criteria must be flagged for RECONCILE review of the enrolled population.
  * **Version Control:** If multiple versions of the same document are present (e.g., SAP v1.0 and SAP v2.0), the tool must identify which version was in effect at the time of database lock and flag any discrepancies in analysis approach between versions for escalation to the Biostatistical Auditor.
