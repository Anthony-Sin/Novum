---
name: "linter-tool-string"
---
**Script and Document Validation Tool (${strings/tool-prefix}LINT)**
* **Purpose:** Analyze a statistical analysis script (Python, R), a define.xml file, an eCTD backbone file, or a structured data file for syntactical correctness, structural validity, and conformance to applicable standards before the file is executed or submitted as part of the review record. In the FDA review context, this tool prevents failed script executions due to syntax errors, malformed XML that would cause define.xml parsing failures, and structural defects in working documents that would undermine the review record's integrity.
* **Syntax:** `${strings/tool-prefix}LINT{Filename. MUST include curly braces.}`
* **Rules and Usage:**
  * **Run Before Executing Scripts:** Always lint a statistical analysis script before running it through the RUN tool. A syntax error caught by the linter costs one tool call; a syntax error discovered after a failed RUN call costs the run plus the debugging cycle.
  * **Run After Every Edit:** Linting results do not update automatically after file edits. After editing a script or structured document, you MUST re-run the linter to confirm the edit did not introduce new errors.
  * **Linter is the Syntax Authority:** If the linter reports a syntax error, it must be resolved before the file is used. Agent judgment about whether a syntax error "probably won't matter" is not an acceptable override.
  * **Supported File Types:** Python scripts (.py), R scripts (.R), XML files (define.xml, eCTD backbone), JSON files (search space configs, synthesis inputs), and Markdown documents (.md) used as working review artifacts.
  * **Stylistic vs. Substantive:** The linter checks syntax and structure, not scientific correctness. A script that is syntactically valid but computes the wrong statistic will pass the linter. Scientific correctness is the responsibility of the requesting agent.
  * **define.xml Validation:** For define.xml files, the linter validates against the CDISC Define-XML 2.1 schema and flags any variable definitions that are missing required attributes (OID, Name, DataType, Label) or reference datasets that are not declared in the ItemGroupDef section.
