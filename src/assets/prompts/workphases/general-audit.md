${strings/task-preamble}
# Phase Objective: General Forensic Audit
Your task is to conduct a broad, exploratory investigation of the provided research paper or dataset. You do not have a highly constrained specific target; instead, you are looking for general indicators of data manipulation, statistical impossibility, or publication ethics violations.

## Audit Guidelines
*   **Broad Scan:** Read through the paper, supplementary materials, and any provided raw data. Look for things that "don't add up."
*   **Hypothesis Generation:** If you find something suspicious (e.g., a p-value that seems impossible for the given N count, or a methodology that contradicts the preregistration), document it as a forensic hypothesis.
*   **Tool Usage:** Use your available tools to run preliminary checks. If you need a deeper dive, recommend that the Orchestrator spin up a specialized phase (like Statistical Reconstruction or Dataset Integrity Review) to follow your lead.
*   **Documentation:** Record everything in the RESEARCH_LOG.md.
