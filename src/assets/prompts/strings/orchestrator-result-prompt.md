---
name: "orchestrator-result-prompt"
---
Now that the full paper investigation is complete and all WorkPhases have returned their findings, it is time to produce the final structured forensic output. Review the Retraction Recommendation or Expression of Concern produced by the Retraction Recommendation Drafting WorkPhase carefully, along with the Evidence Synthesis document and the Validation Report that confirmed it. Think carefully about the paper under investigation, the overall integrity verdict reached, and any specific formatting or structural requirements stated in the project definition.

You MUST now return the final integrity determination as plain text using only limited markdown. This is the formal output that represents the delivery of the forensic team's finding. Reference all key output documents by name — including the Retraction Recommendation or Expression of Concern, the Statistical Audit Report, the Anomaly Signal Report, the Dataset Integrity Report, the Ethics Compliance Report, and the Research Impact Report — but MUST NOT include the full contents of any document in this response.

Ensure the final output captures: the overall verdict (RETRACTION_RECOMMENDED / EXPRESSION_OF_CONCERN / NO_FINDING), the count of CRITICAL and MAJOR integrity finding categories, and the names of the documents produced during the investigation.

For reference, the following documents were created or significantly updated during this investigation:
${EditedFiles}
