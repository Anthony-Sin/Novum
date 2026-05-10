---
name: "safety-signal-tool-string"
---
**Result Anomaly Detection Tool (${strings/tool-prefix}SAFETYSCAN)**
* **Purpose:** Systematically scan reported data tables, figure source data, and supplementary files to detect hidden inconsistencies, impossible statistical values, duplicated data across figure panels, and N count discrepancies between the methods and results sections. This tool operationalizes the Anomaly Signal Analyst's core mandate: to assume that every internal inconsistency in the data is potentially evidence of manipulation until the forensic evidence proves otherwise.
* **Syntax:**
${strings/tool-prefix}SAFETYSCAN
PAPER_TITLE: <Full title of the paper under investigation>
PRIMARY_DATA_FILE: <Filename of the main data table, supplementary file, or figure source data present in the project context>
SUPPLEMENTARY_FILE: <Filename of the supplementary data or raw data file, if available. Enter NONE if not provided.>
FIGURE_FILE: <Filename of the figure image files to be inspected for duplication or manipulation, if available. Enter NONE if not provided.>
AUTHOR_NARRATIVE: <A direct quotation or filename reference to the authors' methods or results section characterization of the overall data quality>
SPECIAL_INTEREST_ANOMALIES: <A comma-separated list of specific anomaly types of particular concern given the study design, e.g., 'Duplicate figure panels, Impossible means given reported range, N count discrepancies between methods and results, Discontinuous distributions, Too-perfect digit endings'>
END_SAFETYSCAN
* **Output Structure and Content to Expect:**
  * The tool returns a structured anomaly report containing:
    * A list of all detected internal inconsistencies between reported text, tables, and figures, with severity ratings.
    * A dedicated section for any figure panels flagged for potential duplication, manipulation, or impossible features.
    * Detection results for each item listed in SPECIAL_INTEREST_ANOMALIES.
    * A Hidden Inconsistency Index: a list of data features that appear anomalous but were not discussed or acknowledged in the paper's limitations section.
    * An overall Anomaly Signal Severity Rating: GREEN (no unexpected anomalies), YELLOW (anomalies requiring author explanation or editorial inquiry), or RED (anomalies that strongly suggest data fabrication or figure manipulation and support a Retraction Recommendation).
* **Rules and Usage:**
  * **Adversarial Prior:** The default assumption is that authors minimize data quality concerns. Every internal inconsistency must be individually assessed regardless of whether the authors discussed it.
  * **Impossible Values Require Individual Documentation:** Every reported mean, standard deviation, or test statistic that is mathematically impossible given the stated sample size or data range must be individually documented. A single impossible value is sufficient to trigger a CRITICAL finding.
  * **N Counts Must be Consistent:** Subject counts in the methods section, results tables, figures, and supplementary data must be internally consistent. Any discrepancy in N counts across sections must be flagged as a potential data integrity concern.
  * **Figure Duplication is Not Acceptable:** Any figure panel that appears identical or near-identical to another panel in the same paper or in prior publications by the same authors must be flagged as CRITICAL regardless of whether the authors claim it was intentional.
