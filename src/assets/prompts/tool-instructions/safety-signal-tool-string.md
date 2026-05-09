---
name: "safety-signal-tool-string"
---
**Pharmacovigilance Signal Detection Tool (${strings/tool-prefix}SAFETYSCAN)**
* **Purpose:** Systematically scan adverse event datasets, SAE narratives, laboratory safety data, and discontinuation logs to detect hidden, suppressed, or inadequately characterized safety signals. This tool operationalizes the Pharmacovigilance Analyst's core mandate: to assume that every serious adverse event in the treatment arm is potentially drug-related until the data proves otherwise. It counteracts the sponsor's inherent incentive to attribute SAEs to disease progression or patient baseline risk factors rather than the investigational product.
* **Syntax:**
${strings/tool-prefix}SAFETYSCAN
SUBMISSION_DRUG: <INN or investigational compound name>
AE_DATASET_FILE: <Filename of the ADAE or SDTM AE domain dataset present in the project context>
SAE_NARRATIVE_FILE: <Filename of the SAE narrative appendix, if available. Enter NONE if not provided.>
LAB_DATASET_FILE: <Filename of the ADLB or LB domain dataset, if available. Enter NONE if not provided.>
SPONSOR_SAFETY_NARRATIVE: <A direct quotation or filename reference to the sponsor's integrated safety summary characterization of the overall safety profile>
SPECIAL_INTEREST_EVENTS: <A comma-separated list of AE preferred terms or organ system classes of particular concern given the drug's mechanism of action, e.g., "Hepatotoxicity, QT prolongation, Suicidality, Thromboembolic events, Opportunistic infections">
COMPARISON_ARM: <Placebo | Active Comparator | Open-Label — the control arm being compared against>
END_SAFETYSCAN
* **Output Structure & Content to Expect:**
  * The tool returns a structured pharmacovigilance report containing:
    * Incidence rate tables for all Treatment-Emergent Adverse Events (TEAEs) by system organ class and preferred term, with treatment vs. control arm comparison and relative risk calculations.
    * A dedicated table for all Serious Adverse Events (SAEs), deaths, discontinuations due to AEs, and dose reductions, with causality assessment challenged against the sponsor's narrative.
    * Signal detection results for each item listed in SPECIAL_INTEREST_EVENTS, including time-to-onset analysis and dose-response relationship assessment where data permits.
    * A Hidden Signal Index: a list of AE preferred terms that appear at numerically higher rates in the treatment arm but were not highlighted or discussed in the sponsor's safety narrative, ranked by potential clinical significance.
    * A Laboratory Safety Shift Table identifying patients who transitioned from normal to abnormal (Grade 1–4) in key safety labs (ALT, AST, creatinine, hemoglobin, neutrophils, platelets, QTcF) during the treatment period.
    * An overall Safety Signal Severity Rating: GREEN (no unexpected signals), YELLOW (signals requiring label discussion or REMS consideration), or RED (signals that may preclude approval or require a full clinical hold).
* **Rules and Usage:**
  * **Adversarial Prior:** The default assumption is that the sponsor has minimized safety findings. Every AE preferred term appearing at a rate ≥1% higher in the treatment arm than the control arm must be individually assessed, regardless of whether the sponsor discussed it.
  * **Deaths Require Individual Narratives:** Every death in either arm must be individually accounted for. If the SAE narrative file is NONE and deaths are present in the AE dataset, this must be flagged as a CRITICAL data gap requiring a Complete Response.
  * **Causality is Not the Sponsor's to Assign Unilaterally:** Any SAE where the investigator assessed causality as "Not Related" must be independently reviewed. An "unrelated" assessment that was not reviewed by a blinded independent adjudication committee carries reduced evidentiary weight.
  * **Missing Data is a Safety Signal:** Patients who discontinued early must be followed for AEs through the protocol-specified follow-up period. If early discontinuers are missing from the safety dataset, this constitutes a data integrity finding and must be escalated to the Clinical Data Reconciliation Expert.
  * **Long-Latency Events:** For drug classes known to carry long-latency risks (e.g., secondary malignancies, progressive multifocal leukoencephalopathy, delayed cardiac events), the tool will flag whether study follow-up duration was adequate to detect these signals and whether the sponsor's safety conclusions are premature given the observation window.
