---
name: "file-revert-tool-string"
---
**In-Session File Revert Tool (${strings/tool-prefix}REVERT_FILE)**
* **Purpose:** Restore a working file to the state it was in immediately before the current editing session began — meaning before the most recent sequence of DOC/EDIT calls in this agent's active turn. Unlike DOC/REVERT (which reverts to the project start state), this tool reverts only the changes made in the current editing attempt, allowing an agent to undo a failed or corrupted edit sequence and try again without losing all prior work from earlier in the project.
* **Syntax:** `${strings/tool-prefix}REVERT_FILE`
* **Rules and Usage:**
  * **Use When Edits Made Things Worse:** Invoke this tool when your edits have introduced errors, contradictions, or structural damage to the document and you wish to try a different approach from the pre-edit baseline.
  * **Use Before Returning Failure:** If you are convinced you cannot successfully complete the required edit, invoke this tool to undo your changes before returning a failure response to the Orchestrator. Never leave a document in a partially edited, corrupted state.
  * **Scope is the Current Session Only:** This tool will NOT revert changes made in prior WorkPhases or prior editing sessions. It only undoes changes applied in the current active turn.
  * **Always Re-Read After Reverting:** After invoking this tool, you MUST read the file before making any further edits. Never assume what the file contains after a revert — confirm it.
  * **Source Data is Never Reverted:** This tool cannot be applied to sponsor-submitted datasets or documents. It operates exclusively on working files managed by the review system.
