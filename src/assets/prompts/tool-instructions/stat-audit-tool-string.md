---
name: "stat-audit-tool-string"
---
**Statistical Reconstruction Tool (${strings/tool-prefix}STATAUDIT)**
* **Purpose:** Submit raw or summary research statistical data for independent recalculation of p-values, confidence intervals, effect sizes, Number Needed to Treat (NNT), and other reported statistics. This tool is the primary defense against p-hacking, selective endpoint reporting, inappropriate multiple comparisons corrections, and inflated treatment effect claims in published research. It must be invoked by the Statistical Fraud Auditor agent for every primary and key secondary endpoint in any paper under investigation.
* **Syntax:**
${strings/tool-prefix}STATAUDIT
ENDPOINT_NAME: <Name of the research endpoint being audited, exactly as stated in the paper or preregistration record>
REPORTED_RESULT: <The exact p-value, effect size, CI, or statistic the authors reported in the publication>
STATISTICAL_TEST_USED: <e.g., Log-rank test, Cox proportional hazards, ANCOVA, Fisher's exact, Mann-Whitney U, etc.>
ANALYSIS_POPULATION: <Full sample, Per-protocol, Intention-to-treat, or subgroup as stated in the methods>
RAW_DATA_FILE: <Filename of the dataset, summary table, or supplementary data file to be recalculated. Must be present in the current project context.>
MULTIPLICITY_CORRECTION: <Bonferroni, Hochberg, Benjamini-Hochberg, Holm, None — as specified in the preregistration or methods section>
AUDIT_FLAGS: <A comma-separated list of specific concerns to probe, e.g., 'Post-hoc endpoint addition, Switched primary endpoint, Responder analysis cherry-picking, Subgroup dredging, Missing data imputation method not preregistered'>
END_STATAUDIT
* **Output Structure and Content to Expect:**
  * The tool returns a structured audit report containing:
    * The independently recalculated statistic with full working shown.
    * A MATCH / DISCREPANCY verdict comparing the recalculated result to the authors' reported result.
    * If DISCREPANCY: the magnitude of the discrepancy, the most likely cause, and a severity rating (CRITICAL / MAJOR / MINOR).
    * A P-hacking Risk Score (LOW / MODERATE / HIGH / VERY HIGH) based on analysis of the multiplicity landscape, number of endpoints, and any deviations from the preregistered analysis plan.
    * Detection results for each item listed in AUDIT_FLAGS.
    * A plain-language interpretation of the recalculated result suitable for inclusion in the Expression of Concern.
* **Rules and Usage:**
  * **Preregistered Analysis Plan is the Standard:** The analysis plan registered *before* data collection is the only valid reference for distinguishing confirmatory from exploratory analyses. Any analysis not preregistered must be labeled exploratory and cannot support a primary efficacy or mechanistic claim.
  * **Mandatory for All Primary Endpoints:** This tool MUST be invoked for every primary reported endpoint. Skipping any primary endpoint will cause the Overseer to flag a confirmation bias violation.
  * **Switching Populations is a Red Flag:** If the authors analyzed the primary endpoint in a per-protocol subgroup when the preregistration specified the full sample, this MUST be listed in AUDIT_FLAGS and will auto-escalate the finding severity to CRITICAL.
  * **Subgroup Analyses:** Any subgroup analysis used to support a primary claim must be audited for multiplicity. The number of subgroup comparisons performed versus preregistered must be reported.
