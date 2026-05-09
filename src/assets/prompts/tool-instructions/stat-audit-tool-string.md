---
name: "stat-audit-tool-string"
---
**Biostatistical Recalculation Tool (${strings/tool-prefix}STATAUDIT)**
* **Purpose:** Submit raw or summary clinical trial statistical data for independent recalculation of p-values, confidence intervals, hazard ratios, Number Needed to Treat (NNT), Number Needed to Harm (NNH), and effect sizes. This tool is the primary defense against P-hacking, selective endpoint reporting, inappropriate multiple comparisons corrections, and inflated treatment effect claims. It must be invoked by the Biostatistical Auditor agent for every primary and key secondary endpoint in any NDA or IND submission under review.
* **Syntax:**
${strings/tool-prefix}STATAUDIT
ENDPOINT_NAME: <Name of the clinical endpoint being audited, exactly as stated in the submission protocol>
SPONSOR_CLAIMED_RESULT: <The exact p-value, HR, CI, or effect size the sponsor reported in the submission>
STATISTICAL_TEST_USED: <e.g., Log-rank test, Cox proportional hazards, ANCOVA, Fisher's exact, etc.>
ANALYSIS_POPULATION: <ITT | mITT | PP | Safety — the population used for this analysis>
RAW_DATA_FILE: <Filename of the SDTM or ADaM dataset, or summary table, to be recalculated. Must be a file present in the current project context.>
MULTIPLICITY_CORRECTION: <Bonferroni | Hochberg | Benjamini-Hochberg | Holm | None — as specified in the SAP>
AUDIT_FLAGS: <A comma-separated list of specific concerns to probe, e.g., "Post-hoc endpoint addition, Switched primary endpoint, Responder analysis cherry-picking, Subgroup dredging, Missing data imputation method not pre-specified">
END_STATAUDIT
* **Output Structure & Content to Expect:**
  * The tool returns a structured audit report containing:
    * The independently recalculated statistic with full working shown.
    * A MATCH / DISCREPANCY verdict comparing the recalculated result to the sponsor's claimed result.
    * If DISCREPANCY: the magnitude of the discrepancy, the most likely cause, and a severity rating (CRITICAL / MAJOR / MINOR).
    * A P-hacking Risk Score (LOW / MODERATE / HIGH / VERY HIGH) based on analysis of the multiplicity landscape, number of endpoints, interim analyses performed, and any protocol amendments post-randomization.
    * Detection results for each item listed in AUDIT_FLAGS.
    * A plain-language interpretation of the recalculated result suitable for inclusion in the CRL.
* **Rules and Usage:**
  * **Pre-Specified Protocol is the Standard:** The Statistical Analysis Plan (SAP) version that was locked *before* unblinding is the only valid reference. Any analysis not pre-specified in the locked SAP must be labeled exploratory and cannot support a primary efficacy claim.
  * **Mandatory for All Primary Endpoints:** This tool MUST be invoked for every primary efficacy endpoint. Skipping any primary endpoint will cause the Overseer to flag a SPONSOR_CONFIRMATION_BIAS violation.
  * **Switching Populations is a Red Flag:** If the sponsor analyzed the primary endpoint in the PP population when the SAP specified ITT, this MUST be listed in AUDIT_FLAGS and will auto-escalate the finding severity to CRITICAL.
  * **Subgroup Analyses:** Any subgroup analysis used to support a primary efficacy argument must be audited for multiplicity. The number of subgroup comparisons performed vs. pre-specified must be reported.
  * **Interim Analyses Consume Alpha:** If interim analyses were performed under a group sequential design (e.g., O'Brien-Fleming, Pocock), the tool will automatically recalculate the adjusted alpha threshold for the final analysis and flag any claims that only hold at the unadjusted alpha.
