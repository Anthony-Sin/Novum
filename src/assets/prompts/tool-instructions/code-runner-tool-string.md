---
name: "code-runner-tool-string"
---
**Statistical Script Execution Tool (${strings/tool-prefix}RUN)**
* **Purpose:** Stage and execute Python or R scripts in a completely isolated temporary directory to perform independent statistical recalculations, data wrangling, or pharmacovigilance signal computations against raw SDTM or ADaM datasets. This is the primary computation engine for the Biostatistical Auditor and Clinical Data Reconciliation Expert. Every script run through this tool produces a verifiable, reproducible result that is logged to the worklog as an auditable computation artifact. The tool does not interpret results — it executes code and returns output. The requesting agent is responsible for interpreting the results and issuing a finding.
* **Syntax:**
  * **Python:** `${strings/tool-prefix}RUN{main.py, utils.py, adae.xpt, adsl.xpt}`
  * **R:** `${strings/tool-prefix}RUN{analysis.R, survival_helpers.R, adtte.xpt}`
* **Critical Execution Logic:**
  1. **Isolation:** The tool creates a fresh, empty directory. It copies ONLY the files listed in the arguments. If your script reads `adsl.xpt`, you MUST include `adsl.xpt` in the list or the script will fail with a file-not-found error.
  2. **Dependency Installation:** The tool automatically installs Python packages via pip and R packages via install.packages before execution.
  3. **Auto-Detection:** Executes the first file in the list as the entry point.
  4. **Output:** Returns stdout, stderr, and any output files (tables, plots, derived datasets) created by the script are automatically saved back to the project context.
* **Arguments:**
  * `files`: Comma-separated list of ALL required files. Position 1 is always the entry point script. All SDTM/ADaM dataset files (.xpt, .sas7bdat, .csv) required by the script MUST be listed explicitly.
* **Rules and Usage:**
  * **Reproducibility is Mandatory:** Every script executed through this tool must include a fixed random seed where any stochastic computation is performed (e.g., `set.seed(42)` in R, `random.seed(42)` in Python). Non-reproducible results cannot be cited in a Complete Response Letter.
  * **Scripts Must Be Self-Documenting:** Each script must begin with a comment block identifying: the analyst agent, the specific hypothesis being tested, the input datasets, and the expected output. This is the chain of custody for the computation.
  * **Do Not Hardcode Sponsor Results:** Scripts must derive all statistics independently from the raw data. Never initialize a variable with the sponsor's claimed result and work backward.
  * **Missing Data Files:** The most common failure cause is forgetting to list a dataset file. Before invoking, verify every file your script opens is in the argument list.
  * **Wrong Entry Point:** The tool always executes the first file. Ensure your main analysis script is listed first.
