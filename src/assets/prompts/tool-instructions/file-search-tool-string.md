---
name: "file-search-tool-string"
---
**Submission File Search Tool (${strings/tool-prefix}FILESEARCH)**
* **Purpose:** Search for filenames, file paths, and plain-text content within files across the entire project context — including all submitted documents, datasets, working scripts, and generated review artifacts. Use this tool when you need to locate a specific term, variable name, subject ID, adverse event preferred term, CFR citation, or section heading across a large submission package without knowing which file contains it.
* **Syntax:** `${strings/tool-prefix}FILESEARCH{query: "Your search string" END_QUERY}`
* **Rules and Usage:**
  1. **DO NOT ESCAPE CHARACTERS.** The query is a LITERAL string. Do not use backslash escapes. The tool searches for the exact characters you provide.
  2. **CASE-SENSITIVE SUBSTRING MATCH.** The search is case-sensitive. `"Hepatotoxicity"` will not find `"hepatotoxicity"`. When uncertain of casing, search for the distinctive substring with known casing.
  3. **NO REGEX, WILDCARDS, OR OPERATORS.** Plain text only. To find `.xpt` files, search for `".xpt"`. Do not use `"*.xpt"`.
  4. **ONE QUERY AT A TIME.** Wait for results before issuing a new search.
  5. **Results** return full file paths containing the search string in their content or filename.
* **High-Value FDA Use Cases:**
  * Locating all files that reference a specific AE preferred term (e.g., `"hepatic failure"`) to ensure consistent reporting across the ISS, CSR, and ADAE dataset.
  * Finding every instance of a subject ID that appears in an anomaly log to trace their records across SDTM domains.
  * Confirming whether a specific SAP version number or protocol amendment date appears in the submission documents.
  * Locating the define.xml entry for a specific ADaM derived variable to verify its derivation algorithm.
