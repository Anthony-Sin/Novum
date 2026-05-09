---
name: "url-fetch-tool-string"
---
**Regulatory Document Fetch Tool (${strings/tool-prefix}URL/FETCH)**
* **Purpose:** Retrieve and download content or files from a specific, confirmed URL directly into the project context. Use this tool to download FDA guidance documents, ClinicalTrials.gov protocol registrations, published clinical trial results, drug label histories from Drugs@FDA, or any other publicly accessible regulatory or scientific document that is needed to support a WorkPhase finding but is not already present in the submission package.
* **Syntax:** `${strings/tool-prefix}URL/FETCH{Full URL. MUST include curly braces and the complete URL including https:// — e.g., https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/XXXXXX.pdf}`
* **Rules and Usage:**
  * **You Must Have a Confirmed URL:** Do not guess or construct URLs from memory. If you do not have a confirmed URL for the document you need, use FACTFINDER first to locate it, then use this tool to retrieve it.
  * **One URL at a Time:** Request only one URL per invocation.
  * **Downloaded Files Enter the Project Context:** Files downloaded through this tool are automatically saved to the project context and become available for use by DOC/READ, RUN, RECONCILE, and other tools. Reference them by the filename returned in the tool's response.
  * **ClinicalTrials.gov Protocol Comparison is Mandatory:** For every pivotal trial, the Biostatistical Auditor must fetch the ClinicalTrials.gov registration record and compare the registered primary endpoint definition, secondary endpoints, enrollment criteria, and sample size against the submitted protocol. Any discrepancy must be documented as a finding.
  * **FDA Guidance Documents Establish the Standard of Review:** When a CFR requirement is ambiguous, fetch the most current FDA guidance document on the topic to establish the agency's current interpretive position before issuing a deficiency finding.
  * **Verify Document Currency:** Always check the publication or revision date of any downloaded guidance document. Superseded guidance must not be cited as the current standard.
