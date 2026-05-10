---
name: "data-reconcile-tool-string"
---
**Dataset Integrity Tool (${strings/tool-prefix}RECONCILE)**
* **Purpose:** Verify the integrity, internal consistency, and reporting accuracy of raw data files and summary statistics submitted alongside or referenced by a published paper. This tool is the primary instrument of the Dataset Integrity Expert agent and is used to detect data manipulation, inconsistent derivations, selectively excluded data points, and discrepancies between the raw data and the reported results. It treats every data discrepancy as a potential integrity finding until a documented author explanation resolves it.
* **Syntax:**
${strings/tool-prefix}RECONCILE
PRIMARY_DATASET_FILE: <Filename of the raw data file, supplementary data table, or figure source data to be interrogated>
REFERENCE_DOCUMENT_FILE: <Filename of the methods section, supplementary methods, or data dictionary that documents the dataset's structure and any derivation rules>
ANALYSIS_PLAN_FILE: <Filename of the preregistration record or statistical analysis plan that governs how this dataset's derived variables should be calculated>
RECONCILIATION_TARGETS:
A JSON array of specific reconciliation checks to perform. Supported check types include: 'SUBJECT_COUNT_MATCH' (dataset N vs. methods-stated enrollment), 'RANDOMIZATION_INTEGRITY' (group assignment consistency across reported figures and tables), 'DATE_LOGIC' (event dates preceding study start, visit dates outside study window), 'DERIVED_VARIABLE_AUDIT' (spot-check calculated variables against preregistered derivation rules), 'DROPOUT_TRACKING' (disposition records for every enrolled subject), 'PROTOCOL_DEVIATION_COMPLETENESS' (all recorded deviations are classified and their impact on primary analysis is documented), 'MISSING_DATA_PATTERN' (MCAR / MAR / MNAR assessment for primary endpoint variable).
AUTHOR_DATA_NARRATIVE: <A summary or filename reference to the authors' data availability statement, methods section, or any supplementary note describing their data collection and cleaning process>
END_RECONCILE
* **Output Structure and Content to Expect:**
  * The tool returns a structured data reconciliation report containing:
    * A Subject Accountability Table tracing every enrolled subject from recruitment through each analysis population flag, with unexplained exclusions highlighted.
    * Results for each reconciliation check listed in RECONCILIATION_TARGETS, with a PASS / FAIL / REQUIRES_CLARIFICATION verdict.
    * A Data Anomaly Log listing all records that contain logical impossibilities or internal contradictions.
    * A Missing Data Impact Assessment estimating the potential effect on the primary endpoint result if missing data had been imputed under a worst-case assumption (tipping-point analysis).
    * A Protocol Deviation Impact Summary assessing whether the authors' sensitivity analyses adequately addressed the impact of recorded deviations.
    * An overall Dataset Integrity Rating: RELIABLE (no integrity concerns identified), QUESTIONABLE (anomalies found requiring author clarification), or COMPROMISED (anomalies found that materially undermine confidence in the primary analysis results).
* **Rules and Usage:**
  * **Preregistration is the Contract:** The analysis rules registered before data collection are the authoritative specification for every derived variable and analysis population. Any deviation from the preregistered plan that is not explicitly reported as a deviation is a potential integrity finding.
  * **Exclusions Must Be Justified:** Any subject excluded from the primary analysis who was enrolled in the study must have a documented reason consistent with the preregistered exclusion criteria. Post-hoc exclusions without preregistered justification are presumptive integrity violations.
  * **Author Imputation Must Be Defensible:** If the authors used a missing data imputation method, the tool will assess whether the missing-at-random assumption is plausible given the dropout patterns, and will flag it as a concern if dropout was informative.
