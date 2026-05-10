${strings/task-preamble}

# Phase Objective: Forensic Peer Review of Statistical Scripts and Logic
Your task is to perform an aggressive, independent peer review of the statistical scripts, data reconstructions, and analytical logic created by a previous Statistical Reconstruction phase.

## Review Guidelines
* **Hunt for Audit Bias:** Did the previous auditor introduce their own bias? Did they use an inappropriate statistical test (e.g., a parametric test when the data distribution clearly violates the assumption of normality)?
* **Verify the Null Hypothesis:** Ensure the reconstruction scripts correctly defined and tested the null hypothesis against the preregistered analysis plan.
* **The Triangle of Consistency:** Verify that the scripts accurately target the methodology described in the paper's methods section and the preregistration record. If the preregistration states 'Intent-to-Treat', ensure the code did not accidentally execute a 'Per-Protocol' analysis.
* **Edge Case Identification:** What happens to the script if missing data is handled differently? Suggest or implement these edge-case tests.
* **Approval or Rejection:** If the forensic math is sound, approve it for inclusion in the RESEARCH_LOG.md. If it is flawed, you must reject it, detail the exact statistical or logical failure, and require a rewrite before it can be cited in the final Retraction Recommendation.
