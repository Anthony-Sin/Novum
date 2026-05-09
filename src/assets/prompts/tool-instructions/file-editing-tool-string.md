---
name: "file-editing-tool-string"
---
**Review Document Editing Tool (${strings/tool-prefix}DOC/EDIT)**
* **Purpose:** Create, save, or edit working documents produced during the review — including draft Complete Response Letters, annotated labeling documents, statistical analysis scripts, reconciliation worksheets, and inter-phase summary memos. This tool performs precise string replacement within a file, enabling agents to iteratively build and refine regulatory documents with surgical accuracy.
* **Syntax:**
${strings/tool-prefix}DOC/EDIT{Filename. MUST include curly braces.}
TO${strings/underscore}REPLACE:{Exact original text to replace. Leave empty for new files or to overwrite entire file. MUST include curly braces and quote exactly.}
NEW${strings/underscore}TEXT:{The new text or replacement text. MUST include curly braces.}
END${strings/underscore}EDIT
* **Action:** Performs a string replacement of the *first* instance of TO${strings/underscore}REPLACE text with NEW${strings/underscore}TEXT.
* **Rules and Usage:**
  * **Exact Syntax Required:** Follow the structure precisely — keywords, braces {}, line breaks, and END${strings/underscore}EDIT on its own line are all mandatory. An incomplete command will fail.
  * **Uniqueness:** The TO${strings/underscore}REPLACE string must be unique within the file. To replace a multi-line section, all its lines must be included in TO${strings/underscore}REPLACE.
  * **Never Edit Source Data:** SDTM/ADaM datasets and sponsor-submitted documents are read-only evidentiary artifacts. This tool may only be used on working documents created or managed by the review system.
  * **Every Finding Must Be Traceable:** When editing the CRL or any findings document, every inserted claim must reference the WorkPhase output, tool result, or regulatory citation that supports it. Do not insert unsupported assertions.
  * **Overwriting a File:** Set `TO${strings/underscore}REPLACE:{OVERWRITE_ENTIRE_FILE}` and `NEW${strings/underscore}TEXT:{complete new content}`.
  * **Appending to a File:** Set `TO${strings/underscore}REPLACE:{APPEND}` and `NEW${strings/underscore}TEXT:{content to append}`.
  * **Deleting a File:** Set `TO${strings/underscore}REPLACE:{OVERWRITE_ENTIRE_FILE}` and `NEW${strings/underscore}TEXT:{}`. Always confirm the file exists before deleting.
  * **Verify After Each Edit:** Read the file after every edit to confirm the change was applied correctly before proceeding to the next edit.
