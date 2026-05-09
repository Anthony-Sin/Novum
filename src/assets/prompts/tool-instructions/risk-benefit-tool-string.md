---
name: "risk-benefit-tool-string"
---
**Risk-Benefit Ethics Analysis Tool (${strings/tool-prefix}RISKBENEFIT)**
* **Purpose:** Conduct a structured, patient-centered risk-benefit analysis that contextualizes the statistical and clinical findings from all prior WorkPhases into a coherent ethical determination. This tool is the primary instrument of the Patient Safety Advocate agent. It is designed to counteract the tendency for statistical significance to be conflated with clinical meaningfulness, and to ensure that the voice of the patient population — including vulnerable subgroups, patients with comorbidities, and those who received no benefit — is represented in the final regulatory determination.
* **Syntax:**
${strings/tool-prefix}RISKBENEFIT
INDICATION: <The exact proposed indication as written in the draft labeling>
PATIENT_POPULATION: <A description of the target population including disease severity, prior treatment history, available alternatives, and any vulnerable subgroups (pediatric, geriatric, renally impaired, hepatically impaired, pregnant)>
EFFICACY_FINDINGS_SUMMARY: <A plain-language summary of the primary and key secondary efficacy findings, including the recalculated effect sizes from the Biostatistical Auditor's WorkPhase output. Must reference absolute risk reduction and NNT, not just relative risk or p-values.>
SAFETY_FINDINGS_SUMMARY: <A plain-language summary of the key safety signals identified by the Pharmacovigilance Analyst's WorkPhase output, including the most serious AEs by incidence and severity, and the NNH for the most clinically significant harms.>
AVAILABLE_ALTERNATIVES: <A description of currently approved therapies for this indication, including their efficacy and safety profiles, to contextualize the investigational drug's risk-benefit ratio>
PATIENT_REPORTED_OUTCOMES: <Filename of PRO instrument data, if available, or NONE. This data represents the patient's own assessment of treatment benefit and tolerability.>
UNMET_MEDICAL_NEED_CLAIM: <The sponsor's specific claim, if any, regarding unmet medical need — e.g., "no approved therapies exist," "prior therapies failed in this population," "this population has a median OS of X months">
END_RISKBENEFIT
* **Output Structure & Content to Expect:**
  * The tool returns a structured risk-benefit report containing:
    * An Absolute Benefit Table: For every efficacy endpoint, the absolute event rate in the treatment arm vs. the control arm, the absolute risk reduction (ARR), and the Number Needed to Treat (NNT) with 95% CI.
    * An Absolute Harm Table: For every TEAE of Grade 3 or higher and every SAE, the absolute event rate in treatment vs. control, the absolute risk increase (ARI), and the Number Needed to Harm (NNH).
    * A Benefit-Harm Balance Matrix that directly compares the NNT for the primary efficacy endpoint against the NNH for the most clinically significant safety finding, with an interpretation of the clinical meaning of this ratio for an individual patient.
    * A Subgroup Equity Assessment identifying whether the risk-benefit profile is consistent across pre-specified subgroups (sex, age, race, disease severity, geographic region) or whether specific subgroups bear a disproportionate share of the harm relative to benefit.
    * A Clinical Meaningfulness Assessment evaluating whether the observed effect size (e.g., improvement in median PFS, change in MMSE score, reduction in exacerbation rate) exceeds the Minimal Clinically Important Difference (MCID) for this outcome in this population, with citation of the MCID source.
    * An overall Risk-Benefit Determination: FAVORABLE (benefits clearly outweigh risks for the proposed indication), MARGINAL (benefits and risks are closely balanced; labeling restrictions, REMS, or post-market commitments may be needed), or UNFAVORABLE (risks outweigh benefits; approval not recommended).
* **Rules and Usage:**
  * **Absolute Numbers Always:** Relative risk reductions and hazard ratios must never be the sole basis for a favorable risk-benefit determination. The tool will always recalculate and present absolute measures. A 50% relative risk reduction from a 2% baseline event rate yields an ARR of 1% and an NNT of 100 — this must be stated explicitly.
  * **The Patient Who Gets No Benefit Still Bears the Risk:** For every patient who benefits from treatment, some number of patients will experience harm without benefit. The Benefit-Harm Balance Matrix must account for this distributional reality.
  * **Unmet Need Does Not Override Safety:** A high unmet medical need may lower the acceptable risk threshold, but it does not render any safety signal acceptable. If the drug carries a risk of fatal or irreversible harm, the safety signal must be fully characterized regardless of the severity of the underlying disease.
  * **Vulnerable Populations Require Explicit Treatment:** If the proposed labeling includes use in pediatric, geriatric, or renally/hepatically impaired populations, but the pivotal trial did not enroll adequate numbers of these subgroups to support a reliable risk-benefit estimate, this is an explicit labeling deficiency that must be included in the Complete Response Letter.
  * **PRO Data is Patient Voice:** If patient-reported outcome instruments were used in the trial, their results must be incorporated into the Clinical Meaningfulness Assessment. A treatment that produces a statistically significant improvement on a physician-assessed endpoint but no improvement on a patient-reported quality-of-life instrument raises a clinically important question about what the patient actually experiences.
