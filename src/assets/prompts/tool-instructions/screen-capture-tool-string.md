---
name: "screen-capture-tool-string"
---
**Document Visual Capture Tool (${strings/tool-prefix}SCREENCAPTURE)**
* **Purpose:** Render and capture a visual snapshot of a specific page, figure, or chart within a submitted document (PDF, clinical study report, statistical appendix, or labeling draft) so that an agent can perform visual inspection of graphical content that cannot be reliably analyzed through text extraction alone. This tool is essential for auditing Kaplan-Meier survival curves for visual inconsistencies, forest plots for subgroup data presentation bias, dose-response relationship figures for cherry-picked axis scaling, and labeling layout for prominence of safety warnings relative to efficacy claims. Text extraction tools miss what the eye catches — truncated Y-axes, missing confidence interval bars, and figures whose visual impression contradicts the accompanying numeric data.
* **Syntax:**
${strings/tool-prefix}SCREENCAPTURE
SOURCE_FILE: <Filename of the document to capture from, as present in the project context. Supported formats: PDF, HTML, DOCX.>
TARGET_CONTENT: <A precise description of the specific page, section, figure number, or table number to capture — e.g., "Figure 3 Kaplan-Meier Overall Survival Curves, page 47 of Clinical Study Report" or "Section 5.1 Warnings and Precautions, draft labeling document". Be specific; the tool does not infer intent.>
PAGE_NUMBER: <The page number within the document, if known. Enter UNKNOWN if the page number must be located by the tool based on TARGET_CONTENT description.>
CAPTURE_PURPOSE: <A single sentence describing what specific visual characteristic the requesting agent needs to inspect — e.g., "Verify that the Y-axis of the Kaplan-Meier curve begins at 0 and that censoring tick marks are displayed" or "Assess whether the Boxed Warning is rendered with the regulatory-required black border and font prominence relative to surrounding text.">
REQUESTING_AGENT: <The Expert Agent persona requesting this capture — e.g., "Biostatistical Auditor", "Regulatory Affairs Specialist". Used for worklog attribution.>
END_SCREENCAPTURE
* **Output Structure & Content to Expect:**
  * The tool returns a structured visual inspection result containing:
    * A rendered image of the captured content, embedded in the agent's context for visual analysis.
    * Extracted metadata: document title, page number, figure or table number as labeled in the document, and the capture timestamp.
    * An OCR text extraction of any numeric values, axis labels, legend entries, or footnotes present in the captured region, provided as a structured supplement to the visual to support downstream quantitative checks.
    * A Capture Confidence rating: HIGH (the requested content was located unambiguously), MEDIUM (the content was located but the match to the TARGET_CONTENT description was approximate), or LOW (the tool could not confidently locate the requested content — a more specific TARGET_CONTENT description is needed).
* **Rules and Usage:**
  * **Visual Analysis is Not Optional for Key Figures:** The Biostatistical Auditor MUST invoke this tool for every Kaplan-Meier curve, forest plot, and primary endpoint response curve present in the pivotal trial Clinical Study Report. Statistical recalculation confirms the numbers; visual inspection confirms the presentation is not misleading. Both checks are required.
  * **Axis Scaling is a Known Manipulation Vector:** When capturing any graph, the requesting agent must explicitly include axis scale verification in the CAPTURE_PURPOSE. A truncated Y-axis that starts at 60% survival rather than 0% can make a modest treatment effect appear dramatic. This is a presentation bias finding, not merely an aesthetic concern.
  * **Labeling Capture for Prominence Assessment:** The Regulatory Affairs Specialist must use this tool to capture the Boxed Warning section (if present) and the Warnings and Precautions section of the draft labeling. The visual rendering must confirm that safety information is presented with the regulatory-required prominence and is not visually subordinated to efficacy claims through formatting choices.
  * **Forest Plots Require Full Capture:** When capturing a forest plot, the full plot including all subgroup rows, confidence interval bars, the overall effect estimate line, and the numeric data table alongside the figure must be captured in a single SCREENCAPTURE call. Partial captures of forest plots are not acceptable.
  * **Do Not Rely on Sponsor-Provided Figure Descriptions:** The sponsor's narrative description of a figure in the text of a CSR is not a substitute for visual inspection of the figure itself. Always capture and inspect the original figure, not the sponsor's description of it.
