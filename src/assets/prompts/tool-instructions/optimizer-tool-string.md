---
name: "optimizer-tool-string"
---
**Statistical Model Optimization Tool (${strings/tool-prefix}OPTIMIZE)**
* **Purpose:** A high-performance search engine for identifying optimal parameters in statistical models, sensitivity analyses, and pharmacokinetic/pharmacodynamic (PK/PD) modeling tasks. Supports Grid Search (exhaustive), Random Search (Bayesian-proxy exploration), and Monte Carlo Stress Testing (robustness verification). In the FDA review context, this tool is used by the Biostatistical Auditor for tipping-point analyses (finding the minimum amount of missing data imputed as failures that would flip the primary endpoint result), by the Pharmacovigilance Analyst for signal threshold optimization in disproportionality analyses, and by the Clinical Data Reconciliation Expert for identifying the parameter boundaries under which a protocol deviation would materially change the efficacy result.
* **Syntax:**
`${strings/tool-prefix}OPTIMIZE{evaluator_script, [dependencies...], search_space_json, goal?, budget?, trials?}OPTIMIZE`
* **Search Strategies:**
  1. **Grid Search:** Provide lists of specific values. Runs every combination. Use for small, well-defined parameter spaces.
  2. **Random Search:** Provide range objects and a positive `budget`. Samples `budget` random configurations. Use for high-dimensional sensitivity analyses.
     * Range syntax: `{"param": {"min": 0, "max": 1, "type": "float"}}`
  3. **Monte Carlo Stress Testing:** Set `trials` > 1. Runs each configuration N times with a different `RANDOM_SEED` each time. Returns Mean and StdDev. Use to verify that a tipping-point finding is robust and not an artifact of a single imputation draw.
* **The Evaluator Contract:** Your script must print the metric to stdout using: `[OPTIMIZER_METRIC]: <number>`
* **Arguments:** `evaluator_script`, `[dependencies]`, `search_space_json`, `goal` (min/max), `budget` (for random search), `trials` (for stress testing).
* **FDA-Specific Use Cases:**
  * **Tipping-Point Analysis:** `${strings/tool-prefix}OPTIMIZE{tipping_point.py, [adeff.xpt, adsl.xpt], {"pct_missing_as_failure": {"min": 0, "max": 100, "type": "int"}}, "max", 50}OPTIMIZE` — Find the maximum percentage of missing outcomes that can be imputed as failures before the primary endpoint p-value exceeds 0.05.
  * **Sensitivity Analysis:** Grid-search across multiple imputation methods and missing data assumptions to assess robustness of the primary result.
  * **Signal Threshold Calibration:** Optimize the Reporting Odds Ratio (ROR) threshold in a disproportionality analysis to balance sensitivity and specificity for a specific AE preferred term.
* **Rules and Usage:**
  * **List All Dependencies Explicitly:** The tool runs in an isolated directory. Every dataset file your script opens must be listed in the dependencies argument.
  * **Use `sys.executable` for Subprocesses:** Never hardcode `"python3"` in subprocess calls. Always use `sys.executable`.
  * **Tipping-Point Results Must Be Included in the CRL:** Any tipping-point analysis performed on the primary endpoint must be reported in the Efficacy Deficiency section of the CRL, whether the result is favorable or unfavorable to the sponsor.
