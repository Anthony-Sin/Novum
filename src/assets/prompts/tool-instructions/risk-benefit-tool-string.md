---
name: "risk-benefit-tool-string"
---
**Research Impact Assessment Tool (${strings/tool-prefix}RISKBENEFIT)**
* **Purpose:** Conduct a structured assessment of the downstream harm caused by a paper with integrity violations. This tool quantifies the real-world consequences of fraudulent or manipulated research, including citations built on the fake paper, clinical practice changes influenced by the paper's conclusions, wasted follow-on funding, and erosion of public trust. It is the primary instrument of the Research Community Advocate agent and is designed to ensure that the severity of the integrity violation is contextualized against the harm it has caused to downstream researchers, clinicians, and the public.
* **Syntax:**
${strings/tool-prefix}RISKBENEFIT
PAPER_TITLE: <Full title of the paper under investigation>
RESEARCH_DOMAIN: <A description of the research field, the specific scientific question addressed, and the potential clinical or policy relevance of the paper's claimed findings>
CITATION_COUNT: <The paper's current citation count, or UNKNOWN if not available>
CITING_PAPER_SAMPLE: <A description or filename reference to a sample of papers that have cited this paper and built upon its conclusions, if available>
CLAIMED_FINDING_SUMMARY: <A plain-language summary of what the paper claimed to demonstrate, including the specific conclusion that downstream researchers or clinicians would have acted upon>
INTEGRITY_FINDINGS_SUMMARY: <A plain-language summary of the forensic findings from prior WorkPhases, describing what the investigation has shown about the paper's actual evidentiary status>
FOLLOW_ON_FUNDING_ESTIMATE: <An estimate of grants or follow-on research funding that was awarded based on this paper's findings, or UNKNOWN if not available>
END_RISKBENEFIT
* **Output Structure and Content to Expect:**
  * The tool returns a structured impact report containing:
    * A Citation Impact Table: the number of papers citing this work, an estimate of how many directly built on the contested finding, and an estimate of how many of those conclusions may need to be re-evaluated.
    * A Clinical or Policy Impact Assessment: whether the paper's claimed finding influenced clinical guidelines, regulatory decisions, or public policy, with citations to any such influence.
    * A Wasted Resources Estimate: an estimate of follow-on research funding, researcher time, and infrastructure investment that was directed based on this paper's false or unreliable conclusions.
    * A Scientific Record Contamination Score: a qualitative rating (LOW / MODERATE / HIGH / SEVERE) of the degree to which this paper has contaminated the scientific literature in its domain.
    * An overall Research Impact Determination: MINIMAL (the paper had limited influence and its retraction would cause minimal disruption), SIGNIFICANT (the paper influenced a meaningful body of follow-on work requiring reappraisal), or SEVERE (the paper is foundational to a major research program or clinical practice and its retraction would require widespread reassessment).
* **Rules and Usage:**
  * **Harm is Not Mitigated by Intent:** The downstream harm caused by a fabricated or manipulated paper is not diminished by whether the authors intended to deceive. The impact assessment must quantify the actual harm to the scientific record regardless of intent.
  * **Citation Count is Not Impact:** A paper with 500 citations may have caused less harm than one with 50 citations if the 50-citation paper directly influenced a clinical guideline or a major funding program. The tool assesses qualitative influence, not just citation quantity.
  * **Retraction Delay Amplifies Harm:** The longer a paper with integrity violations remains in the literature without an expression of concern or retraction, the greater the compounded downstream harm. The impact assessment must note the current time since publication and estimate the additional harm caused by any delay in the retraction process.
