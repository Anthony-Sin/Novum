---
name: "editTooBigFailure"
---
Your attempt to edit the regulatory review document failed because your response did not use the correct File Editing Tool syntax. Specifically, it did not include a valid replacement text block surrounded by curly braces followed by the END_EDIT closing token. For example:
NEW${strings/underscore}TEXT:{The corrected regulatory finding text. MUST include curly braces.}
END${strings/underscore}EDIT

This failure most likely occurred because your response exceeded the maximum output token limit and was truncated before the closing syntax was emitted. This is common when editing large sections of a Complete Response Letter, a multi-endpoint Statistical Audit Report, or a dense Pharmacovigilance Signal Report.

To successfully complete the intended regulatory document edit, break your original edit into multiple smaller, sequential, logically coherent chunks:
* **Target Multi-Line Regulatory Chunks:** Each subsequent edit should cover a meaningful multi-line segment — for example, a complete deficiency entry including its CFR citation and data reference, a full adverse event table row with all columns, or a complete benefit-harm matrix row. Aim for roughly 10–20 lines per chunk, or one complete logical regulatory unit (a full numbered deficiency, a complete statistical finding block) if it is of reasonable size.
* **Avoid Overly Small Edits:** Do not default to single-line edits to avoid token limits. Make substantial multi-line progress with each chunk. Resort to very small edits only for precise citation corrections after larger blocks are in place.
* **Ensure Complete Syntax Every Time:** Every edit chunk must include the full File Editing Tool syntax — the replacement target specification, the new text specification, and the END_EDIT closing token on its own line.
* **Sequential Application:** Apply the first properly sized chunk of your intended edit now. Continue with the next logical chunk in subsequent turns until the full intended regulatory document modification is complete.

Submit the first correctly sized multi-line chunk of your original edit now.
