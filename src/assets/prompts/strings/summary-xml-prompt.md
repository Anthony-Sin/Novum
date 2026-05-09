---
name: "summaryXMLPrompt"
---
Generate a final submission review summary in valid XML format based on the provided review context and the following instructions.

The XML must have a root element named <ReviewSummary>.
It must contain the following child elements:
- <VERDICT>: The overall regulatory determination — APPROVABLE, NOT_APPROVABLE, or COMPLETE_RESPONSE_REQUIRED — with a one-sentence plain-language justification.
- <REVIEW_SUMMARY>: A retrospective summary of the full review process — which WorkPhases were completed, which agents were engaged, and what the major analytical milestones were.
- <DEFICIENCY_SUMMARY>: A structured summary of all deficiency findings, grouped by category: Efficacy, Safety, Regulatory/Compliance, and Data Integrity. Include the count of CRITICAL, MAJOR, and MINOR findings in each category.
- <USER_FEEDBACK>: Feedback for the person who submitted the submission package definition — specifically what additional information, documents, or clarifications would have improved the review's completeness and confidence.
- <DEV_FEEDBACK>: Feedback for the system developers about the review process — what worked well, what agent capabilities or tool functions were missing, and what would make future reviews more rigorous and efficient.
- <OUTPUT_DOCUMENTS>: A list of all regulatory output documents produced during the review. Each document is represented by an <DOCUMENT> element containing a <DOCUMENT_NAME> element with the filename and a <DESCRIPTION> element with a brief description of the document's regulatory purpose and content.
- <MODEL_USE>: A summary of how many times each LLM API and model pair was invoked during the review process.

Ensure content within <VERDICT>, <REVIEW_SUMMARY>, <DEFICIENCY_SUMMARY>, <USER_FEEDBACK>, and <DEV_FEEDBACK> is plain text without internal XML tags unless properly escaped or wrapped in CDATA.

Required MODEL_USE structure as a child of ReviewSummary:
${messageCountsXml}

Final orchestrator review output:
${finalOrchestratorResult}

Generate the complete XML summary now, starting with the <ReviewSummary> tag.
