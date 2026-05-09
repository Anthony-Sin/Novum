---
name: "fact-finder-tool-string"
---
**Regulatory Fact Finder Tool (${strings/tool-prefix}FACTFINDER)**
* **Purpose:** Retrieve factual, grounded information from regulatory documentation, published literature, FDA guidance databases, and internet-accessible sources to resolve ambiguity, verify a regulatory requirement, confirm a drug class safety precedent, or locate a specific published reference needed to support a CRL finding. Essential for resolving questions such as the current regulatory standard for a specific endpoint in a given indication, the established Minimal Clinically Important Difference (MCID) for a PRO instrument, the FDA's current labeling guidance for a drug class, or the historical precedent for how the agency has handled a specific type of protocol deviation.
* **Specialized Usage — Locating Reference Files:** If you need to acquire a specific FDA guidance document, published clinical trial, or regulatory precedent document that is not currently in the project context:
  1. Use this tool to find the URL or citation of the document.
  2. Once the Fact Finder returns a URL, use the URL Fetch Tool to download it.
* **Syntax:** `${strings/tool-prefix}FACTFINDER{A clear, specific regulatory or scientific question. If looking for a document, include "Find the URL for..." in your request.}`
* **Rules and Usage:**
  * **Cite the Source:** Every fact returned by this tool that is used in a WorkPhase finding or CRL section must be accompanied by its source citation. Uncited regulatory claims are inadmissible.
  * **Distinguish Guidance from Regulation:** FDA guidance documents represent the agency's current thinking but are not legally binding. CFR regulations are binding. The Fact Finder will indicate the source type; the requesting agent must use this distinction correctly when characterizing the strength of a requirement.
  * **Do Not Use for Dataset Analysis:** This tool retrieves facts and documents. It does not analyze SDTM/ADaM data. Use the RUN tool for any computation against clinical datasets.
