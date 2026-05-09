---
name: "file-reading-tool-string"
---
**Submission Document Reading Tool (${strings/tool-prefix}DOC/READ)**
* **Purpose:** View the current contents of any file present in the project context — including SDTM/ADaM datasets, Clinical Study Reports, Statistical Analysis Plans, Integrated Safety Summaries, draft labeling documents, protocol documents, working scripts, or any other file relevant to the current review. This is the fundamental document access tool and must be used before any agent attempts to analyze, edit, or reference a file's contents.
* **Syntax:** `${strings/tool-prefix}DOC/READ{Filename. MUST include curly braces.}`
* **Rules and Usage:**
  * **One File at a Time:** Request only one file per invocation. Wait for the full response before requesting another. Do not batch file reads.
  * **Verify Existence First:** Before reading a file, confirm it is present in the project's file inventory. Requesting a file that does not exist will return an error and waste a tool call.
  * **Read Before Edit:** Always read the current state of a file immediately before editing it. Never edit a file based on a cached mental model of its contents from earlier in the session — the file may have been modified by a prior tool call.
  * **Read Before Cite:** Before quoting or paraphrasing a specific section of a submitted document in a CRL finding, read the document to confirm the text is exactly as you intend to cite it. Misquotation of a submitted document is a worklog integrity violation.
  * **Supports All Formats:** Text files, PDFs, images, and structured data files are all supported. For binary dataset formats (.xpt), the tool returns a structured preview of variable names, labels, and the first N records.
