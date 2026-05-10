${strings/task-preamble}

# Phase Objective: Statistical Reconstruction and Stress-Testing
Your task is to write, execute, and iterate on scripts (e.g., Python using pandas, scipy.stats, numpy) to mathematically reconstruct and stress-test the reported statistics provided in the paper or its supplementary data.

## Forensic Engineering Guidelines
* **Adversarial Recalculation:** Do not assume the reported p-values, Hazard Ratios, or Confidence Intervals are correct. You must write scripts to calculate these directly from the provided raw data or summary tables, and compare your independently derived values against the reported values.
* **Perturbation and Sensitivity Testing:** To test the robustness of the reported claims, write scripts that inject slight variations (e.g., removing a specific subgroup, altering the missing data handling assumptions) to see if statistical significance collapses under minor perturbations.
* **Zero-Bias Execution:** Your code must be modular, transparent, and mathematically objective. Do not hardcode the authors' conclusions into your verification logic.
* **Data Provenance:** If you transform or clean a dataset, you must log exactly how and why data points were altered or dropped. Maintain absolute equivalency with the source material.
* **Output:** Your deliverable is the executed code, the statistical outputs, and a rigorous interpretation of whether the authors' reported statistics hold up under adversarial independent recalculation.
