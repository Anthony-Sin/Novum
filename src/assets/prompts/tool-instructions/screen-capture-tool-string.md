---
name: "screen-capture-tool-string"
---
**Figure Integrity Tool (${strings/tool-prefix}SCREENCAPTURE)**
* **Purpose:** Render and capture a visual snapshot of a specific page, figure, or image panel within a published paper (PDF, HTML, or image file) so that an agent can perform visual inspection of graphical content for duplication, manipulation, or impossible features that cannot be reliably detected through text extraction alone. This tool is essential for auditing microscopy images for spliced or duplicated bands, western blots for irregular backgrounds or copy-paste artifacts, flow cytometry plots for cloned data populations, and figure panels that appear to have been reused across different experimental conditions. Text extraction tools miss what the eye catches — duplicated gel bands, cloned cell clusters, and figures whose visual impression contradicts the accompanying numeric data.
* **Syntax:**
${strings/tool-prefix}SCREENCAPTURE
SOURCE_FILE: <Filename of the paper or image file to capture from, as present in the project context. Supported formats: PDF, HTML, PNG, JPEG, TIFF.>
TARGET_CONTENT: <A precise description of the specific page, section, figure number, or panel label to capture — e.g., 'Figure 3B Western blot for GAPDH, page 8 of main manuscript' or 'Supplementary Figure S2, panel C microscopy image'. Be specific; the tool does not infer intent.>
PAGE_NUMBER: <The page number within the document, if known. Enter UNKNOWN if the page number must be located by the tool based on TARGET_CONTENT description.>
CAPTURE_PURPOSE: <A single sentence describing what specific visual characteristic the requesting agent needs to inspect — e.g., 'Detect whether the GAPDH loading control band in Figure 3B appears identical to or spliced from Figure 1D' or 'Assess whether the cell clusters in Supplementary Figure S2C appear to have been duplicated from Supplementary Figure S2A by copy-paste manipulation.'>
REQUESTING_AGENT: <The Expert Agent persona requesting this capture — e.g., 'Dataset Integrity Expert', 'Anomaly Signal Analyst'. Used for worklog attribution.>
END_SCREENCAPTURE
* **Output Structure and Content to Expect:**
  * The tool returns a structured visual inspection result containing:
    * A rendered image of the captured content, embedded in the agent's context for visual analysis.
    * Extracted metadata: document title, page number, figure or panel number as labeled in the paper, and the capture timestamp.
    * A pixel-level similarity analysis comparing the captured panel against other panels in the same document flagged for potential duplication, returned as a structured similarity score table.
    * A Capture Confidence rating: HIGH (the requested content was located unambiguously), MEDIUM (the content was located but the match to the TARGET_CONTENT description was approximate), or LOW (the tool could not confidently locate the requested content).
* **Rules and Usage:**
  * **Visual Inspection is Mandatory for All Key Figures:** The Dataset Integrity Expert MUST invoke this tool for every western blot, gel image, microscopy image, and flow cytometry plot in any paper involving biological imagery. Statistical recalculation confirms the numbers; visual inspection confirms that the images themselves were not manipulated. Both checks are required.
  * **Figure Duplication is a CRITICAL Finding:** Any figure panel that appears identical or near-identical to another panel claimed to represent a different experimental condition must be rated CRITICAL and documented in the Dataset Integrity Report as presumptive evidence of data fabrication or manipulation.
  * **Background Irregularities are Manipulation Signals:** In western blot or gel images, any straight-line boundary, color discontinuity, or texture change in the background that is inconsistent with a natural exposure gradient must be captured and flagged as a potential splicing artifact.
  * **Do Not Rely on Author-Provided Figure Descriptions:** The authors' description of a figure in the text is not a substitute for visual inspection of the original image. Always capture and inspect the original figure, not the authors' characterization of it.
  * **Comparison Across Papers is Required:** If the same research group has published related work, the Dataset Integrity Expert must compare figures across papers for inter-paper duplication, which constitutes an even more severe integrity violation than within-paper duplication.
