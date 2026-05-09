---
name: "internet-lookup-tool-string"
---
**Regulatory Internet Lookup Tool (${strings/tool-prefix}INTERNET/LOOKUP)**
* **Purpose:** Retrieve content from a specific, known URL to access publicly available regulatory documents, FDA guidance pages, published clinical trial results, drug approval histories, and scientific literature. This tool is limited to APIs and public web resources that do not require authentication. If a fetch fails, assume the resource is access-restricted and use the FACTFINDER tool to locate an alternative source.
* **Syntax:** `${strings/tool-prefix}INTERNET/LOOKUP{Full URL, Question you want answered from that page}`
* **Particularly Useful Regulatory Sources:**
  * **FDA Drugs@FDA:** `https://www.accessdata.fda.gov/scripts/cder/daf/` — Look up prior approval actions, review documents, and labeling history for the drug or its drug class.
  * **ClinicalTrials.gov API:** `https://clinicaltrials.gov/api/query/full_studies?expr=NCTXXXXXXXX&fmt=json` — Retrieve the registered protocol for a study to compare against the submitted protocol for undisclosed amendments.
  * **FDA Guidance Documents:** `https://www.fda.gov/regulatory-information/search-fda-guidance-documents` — Locate current FDA guidance on a specific topic.
  * **PubMed API:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=SEARCHTERM&retmode=json` — Search for published literature on a drug, indication, or safety signal.
* **Rules and Usage:**
  * **You Must Have a Specific URL:** Do not guess URLs. If you do not have a confirmed URL, use FACTFINDER first to locate it, then use this tool to retrieve the content.
  * **ClinicalTrials.gov Registration is Mandatory Cross-Check:** For every pivotal trial in the submission, the Biostatistical Auditor must look up the trial's ClinicalTrials.gov registration to compare the registered primary endpoint and enrollment criteria against the submitted protocol. Any discrepancy is a potential protocol deviation or selective outcome reporting finding.
  * **One URL at a Time:** Request only one URL per invocation.
  * **Fetch Failures:** If the fetch returns an error, do not retry the same URL more than once. Note the failure in the worklog and use FACTFINDER to find an alternative source.
