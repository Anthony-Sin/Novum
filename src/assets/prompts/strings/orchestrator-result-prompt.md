---
name: "orchestrator-result-prompt"
---
Now that the full submission review is complete and all WorkPhases have returned their findings, it is time to produce the final structured regulatory output. Review the Complete Response Letter or Approval Recommendation produced by the CRL Drafting WorkPhase carefully, along with the Evidence Synthesis document and the Validation Report that confirmed it. Think carefully about the initial submission under review, the overall verdict reached, and any specific formatting or structural requirements stated in the project definition.

You MUST now return the final regulatory determination as plain text using only limited markdown. This is the formal output that represents the delivery of the advisory committee's finding. Reference all key output documents by name — including the Complete Response Letter, the Statistical Audit Report, the Safety Signal Report, the Dataset Integrity Report, the Compliance Audit Report, and the Benefit-Risk Report — but MUST NOT include the full contents of any document in this response.

Ensure the final output captures: the overall verdict (APPROVABLE / NOT_APPROVABLE / COMPLETE_RESPONSE_REQUIRED), the count of CRITICAL and MAJOR deficiency findings, and the names of the documents produced during the review.

For reference, the following documents were created or significantly updated during this review:
${EditedFiles}
