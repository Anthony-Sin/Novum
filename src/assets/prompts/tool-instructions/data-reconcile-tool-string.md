---
name: "data-reconcile-tool-string"
---
**Clinical Data Reconciliation Tool (${strings/tool-prefix}RECONCILE)**
* **Purpose:** Verify the integrity, internal consistency, and regulatory compliance of SDTM and ADaM datasets submitted as part of an NDA or BLA. This tool is the primary instrument of the Clinical Data Reconciliation Expert agent and is used to detect data manipulation, inconsistent derivations, protocol deviations concealed in the data, and discrepancies between the submission datasets and the published or reported results. It treats every dataset inconsistency as a potential integrity finding until a data management explanation is provided and verified.
* **Syntax:**
${strings/tool-prefix}RECONCILE
PRIMARY_DATASET_FILE: <Filename of the SDTM or ADaM dataset to be interrogated — e.g., adae.xpt, adsl.xpt, adeff.xpt>
REFERENCE_DOCUMENT_FILE: <Filename of the Study Data Reviewer's Guide (SDRG) or Data Definition file (define.xml / define.pdf) that documents the dataset's derivation rules>
ANALYSIS_PLAN_FILE: <Filename of the locked Statistical Analysis Plan (SAP) that governs how this dataset's derived variables should be calculated>
RECONCILIATION_TARGETS:
A JSON array of specific reconciliation checks to perform. Supported check types include: "SUBJECT_COUNT_MATCH" (dataset n vs. protocol-specified enrollment), "RANDOMIZATION_INTEGRITY" (treatment arm assignment consistency across datasets), "DATE_LOGIC" (AE onset before treatment start, visit dates outside study window), "DERIVED_VARIABLE_AUDIT" (spot-check DTYPE, ABLFL, ANL01FL derivation logic against SAP rules), "DROPOUT_TRACKING" (disposition records for every randomized subject), "PROTOCOL_DEVIATION_COMPLETENESS" (all recorded PDs are classified and their impact on efficacy datasets is documented), "MISSING_DATA_PATTERN" (MCAR / MAR / MNAR assessment for primary endpoint variable).
SPONSOR_DATA_NARRATIVE: <A summary or filename reference to the sponsor's data management summary or SDRG narrative describing their data cleaning and derivation process>
END_RECONCILE
* **Output Structure & Content to Expect:**
  * The tool returns a structured data reconciliation report containing:
    * A Subject Accountability Table tracing every randomized subject from enrollment through each analysis population flag (SAFFL, ITTFL, PPROTFL), with unexplained exclusions highlighted.
    * Results for each reconciliation check listed in RECONCILIATION_TARGETS, with a PASS / FAIL / REQUIRES_CLARIFICATION verdict and the specific records or variable values that drove the verdict.
    * A Data Anomaly Log listing all records that contain logical impossibilities (e.g., adverse event onset date preceding treatment start date, lab values outside physiologically plausible ranges, visit dates outside the protocol-specified window).
    * A Missing Data Impact Assessment estimating the potential effect on the primary endpoint result if missing data had been imputed under a worst-case assumption (tipping-point analysis), compared to the sponsor's imputation method.
    * A Protocol Deviation Impact Summary categorizing each recorded major protocol deviation by its potential to bias the primary efficacy result and assessing whether the sponsor's sensitivity analyses adequately addressed this.
    * An overall Dataset Integrity Rating: RELIABLE (no integrity concerns identified), QUESTIONABLE (anomalies found that require sponsor clarification before conclusions can be drawn), or COMPROMISED (anomalies found that materially undermine confidence in the primary analysis results).
* **Rules and Usage:**
  * **Define.xml is the Contract:** The derivation rules documented in the define.xml are the authoritative specification for every derived variable. Any ADaM variable whose actual values cannot be reproduced from the SDTM source data using the define.xml algorithm is an integrity finding.
  * **Randomization is Sacred:** Any subject whose treatment arm assignment in the ADSL dataset does not match the randomization schedule document (if provided) must be immediately flagged as a CRITICAL finding and escalated to the Overseer.
  * **Protocol Deviations Cannot Be Minimized:** A pattern of protocol deviations that disproportionately affects the control arm (e.g., more control arm patients excluded from the PP population) is presumptive evidence of post-hoc manipulation of the analysis population and must be rated CRITICAL.
  * **Sponsor Imputation Must Be Defensible:** If the sponsor used Last Observation Carried Forward (LOCF) for a progressive disease endpoint, or used a multiple imputation method, the tool will assess whether the missing-at-random (MAR) assumption is plausible given the dropout patterns, and will flag it as a concern if dropout was informative (i.e., patients who dropped out were sicker than those who remained).
  * **Lock Date Verification:** The SAP lock date and the first patient unblinding date (or database lock date) must be reconcilable. Any statistical analysis described in the SAP that appears to have been designed after the unblinding date is a P-hacking red flag and must be escalated to the Biostatistical Auditor.
