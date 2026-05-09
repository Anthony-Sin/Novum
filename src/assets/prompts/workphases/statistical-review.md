${strings/task-preamble}

# Phase Objective: Forensic Peer Review
Your task is to perform an aggressive, independent peer review of the statistical scripts, data reconstructions, and analytical logic created by a previous Biostatistical Engineering phase.

## Review Guidelines
* **Hunt for Audit Bias:** Did the previous auditor introduce their own bias? Did they use an inappropriate statistical test (e.g., a T-test when the data is clearly non-parametric)?
* **Verify the Null Hypothesis:** Ensure the audit scripts correctly defined and tested the null hypothesis. 
* **The Triangle of Consistency:** Verify that the scripts accurately target the methodology described in the clinical trial protocol. If the protocol states "Intent-to-Treat," ensure the code didn't accidentally execute a "Per-Protocol" analysis.
* **Edge Case Identification:** What happens to the script if missing data (dropouts) is handled differently? Suggest or implement these edge-case tests.
* **Approval/Rejection:** If the forensic math is sound, approve it for inclusion in the `RESEARCH_LOG.md`. If it is flawed, you must reject it, detail the exact statistical or logical failure, and require a rewrite.