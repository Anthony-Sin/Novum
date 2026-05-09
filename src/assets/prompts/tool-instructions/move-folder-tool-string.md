---
name: "move-folder-tool-string"
---
**Review File Relocation Tool (${strings/tool-prefix}MOVE_FILE_OR_FOLDER)**
* **Purpose:** Move or rename a file or entire directory within the review project's working file structure. Use this tool when reorganizing the review workspace — for example, moving a completed WorkPhase output into an archived findings folder, renaming a draft CRL to its final versioned filename, or restructuring the working directory to reflect the CTD module organization.
* **Syntax:** `${strings/tool-prefix}MOVE_FILE_OR_FOLDER{SOURCE: /path/to/source DESTINATION: /path/to/destination}`
* **Rules and Usage:**
  * **Source Must Exist:** Confirm the source file or directory exists before invoking. Use FILESEARCH or DOC/READ to verify.
  * **Destination Must Not Exist:** The destination path must not already exist. This tool cannot merge directories.
  * **Sponsor Data is Read-Only:** Never move, rename, or relocate SDTM/ADaM datasets or sponsor-submitted source documents. Only working files and generated review artifacts may be relocated.
  * **Update All References:** After moving a file, search the worklog and all active working documents for references to the old path and update them. A CRL or findings document that references a file at its old path will produce a broken citation.
  * **Single Operation:** One move per invocation.
  * **Versioning Convention:** When renaming a draft document to a new version (e.g., `CRL_draft_v1.md` to `CRL_draft_v2.md`), retain the prior version at its original path rather than overwriting. The review record must preserve all prior draft versions for Overseer auditability.
