---
name: "doc-revert-tool-string"
---
**Submission Document Revert Tool (${strings/tool-prefix}DOC/REVERT)**
* **Purpose:** Revert a specific working file — such as a draft Complete Response Letter, an annotated labeling document, or a working statistical script — to its original state as it existed at the start of the current review project. This tool is used when an agent's edits to a working document have produced an incorrect, contradictory, or corrupted state and the agent needs to return to a clean baseline before attempting again.
* **Syntax:** `${strings/tool-prefix}DOC/REVERT{Filename. MUST include curly braces.}`
* **Rules and Usage:**
  * **One File at a Time:** Request only one file per invocation. Wait for confirmation before reverting another file.
  * **Modified Files:** If the file was modified during the current review session, reverting it resets it to its original content as of project start.
  * **Created Files:** If the file was created during the current review session (it did not exist at project start), reverting it will delete the file entirely.
  * **Worklog Audit Trail:** Reverting a file does not erase the worklog record of what changes were attempted. All prior edit attempts remain in the worklog for Overseer review. The revert itself is logged as a corrective action.
  * **Do Not Revert Source Data:** SDTM and ADaM dataset files (.xpt, .sas7bdat) submitted by the sponsor must never be reverted or modified. These are read-only evidentiary artifacts. Only working files created or edited by the review system may be reverted.
  * **If a Unified Diff block is present** in your chat history it will automatically update after this tool is successfully used.
