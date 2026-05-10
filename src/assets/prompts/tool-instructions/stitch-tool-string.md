---
name: "stitch-tool-string"
---
**Cross-Source Evidence Synthesis Tool (${strings/tool-prefix}STITCH)**
*   **Purpose:** Combine disparate forensic findings from different documents (e.g., cross-referencing a finding in the RESEARCH_LOG.md with an anomaly flagged in the DATA_INTEGRITY_REPORT.md).
*   **Syntax:**
${strings/tool-prefix}STITCH
SOURCE_FILES: <Comma-separated list of working documents to synthesize>
QUERY: <The specific research integrity question you are trying to answer by synthesizing these files>
END_STITCH
