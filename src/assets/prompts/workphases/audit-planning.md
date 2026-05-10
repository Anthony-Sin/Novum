${strings/task-preamble}

# Phase Objective: Paper Deconstruction Planning
Your task is to break down a complex published paper, preprint, or research report into a systematic, step-by-step Forensic Investigation Plan.

## Audit Strategy Guidelines
* **Constraint Extraction:** You must first extract and list all study constraints. What is the preregistered primary endpoint? What are the secondary endpoints? What is the defined study population (inclusion and exclusion criteria)? What is the stated sample size and the achieved sample size?
* **Vulnerability Mapping:** Identify the most likely areas of author manipulation or honest error (e.g., subjective secondary endpoints, high placebo response rates, protocol amendments made after unblinding, missing raw data, figure reuse across conditions).
* **Step-by-Step Task Generation:** Create a FORENSIC_PLAN.md file. Break the investigation down into discrete, assignable tasks (e.g., 'Task 1: Recalculate reported survival curve statistics for the primary cohort', 'Task 2: Cross-reference raw data values in Supplementary Table 3 against the summary statistics in the main text Table 2', 'Task 3: Compare preregistered primary endpoint against published primary endpoint').
* **Scientific Focus:** Ensure the plan targets the core integrity questions: Is the data real? Is the analysis honest? Do the reported conclusions follow from the reported results?
* **No Execution:** Do not perform the math or research yourself. Your sole output is the blueprint for the investigation.
