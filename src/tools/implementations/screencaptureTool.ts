

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../momoa_core/types.js';
import { DEFAULT_GEMINI_PRO_MODEL, DEFAULT_GEMINI_LITE_MODEL } from '../../config/models.js';
import { removeBacktickFences } from '../../utils/markdownUtils.js';
import { getAssetString, replaceRuntimePlaceholders } from '../../services/promptManager.js';
import { Part } from '@google/genai';

const SCREENCAPTURE_SYSTEM_PROMPT = `You are a Figure Integrity Forensic Analyst — a specialist in detecting
image manipulation, figure duplication, and visual data fabrication in scientific publications.

YOUR MANDATE — examine every provided image with extreme forensic scrutiny:

1. WITHIN-PAPER DUPLICATION: Are any panels identical or near-identical to other panels
   in the same paper, despite claiming to represent different experimental conditions?
   Even partial overlaps (clone-stamping) must be flagged.

2. SPLICING ARTIFACTS: In western blot and gel images:
   - Straight-line boundaries not consistent with natural exposure gradients
   - Color or texture discontinuities that suggest panels have been cut and joined
   - Background that changes abruptly between lanes
   - Bands with pixel-level identical backgrounds

3. CLONE-STAMPING: In microscopy and cell images:
   - Repeated cell clusters or structures appearing in different positions
   - Identical noise patterns in different regions of the image
   - Symmetric artifacts that could not occur naturally

4. BRIGHTNESS/CONTRAST MANIPULATION:
   - Uniform background where natural variation would be expected
   - Suspiciously clean negative spaces
   - Saturated signals that obscure quantification

5. FLOW CYTOMETRY / SCATTER PLOTS:
   - Cloned data populations (identical dot patterns in different quadrants)
   - Gate boundaries that appear to have been manually adjusted post-hoc

OUTPUT FORMAT — Figure Integrity Report:
- Per-image assessment with: image filename/label, manipulation type suspected,
  specific visual evidence (describe pixel location, color pattern, structural anomaly),
  severity (CRITICAL/MAJOR/MINOR/CLEAN)
- Overall Figure Integrity Rating: PASS / CONCERN / CRITICAL_VIOLATION
- Recommended follow-up actions (e.g., request original unprocessed image files)

FORENSIC PRINCIPLE: Figure duplication is NEVER acceptable regardless of stated intent.
Any panel that appears identical or near-identical to another panel is a CRITICAL finding.`;

export const screencaptureTool: MultiAgentTool = {
  displayName: "Figure Integrity Tool",
  name: 'SCREENCAPTURE',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`SCREENCAPTURE invoked — performing visual figure integrity analysis`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Performing visual forensic analysis of paper figures...`,
    }));

    try {
      let scanRequest = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);
      if (fileMarkerIndex !== -1) {
        scanRequest = question.substring(0, fileMarkerIndex).trim();
        const jsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(jsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      // Collect all image files from both requested files and the binary map
      const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'bmp']);
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        webp: 'image/webp', tiff: 'image/tiff', tif: 'image/tiff',
        gif: 'image/gif', bmp: 'image/bmp'
      };

      const parts: Part[] = [];
      const imagesAttached: string[] = [];

      // Add initial context image if present
      if (context.initialImage && context.initialImageMimeType) {
        parts.push({ inlineData: { mimeType: context.initialImageMimeType, data: context.initialImage } });
        imagesAttached.push('[initial upload]');
      }

      // Attach explicitly requested image files
      for (const filename of requestedFiles) {
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        if (context.binaryFileMap.has(filename) && imageExts.has(ext)) {
          const mimeType = mimeMap[ext];
          const base64Data = context.binaryFileMap.get(filename);
          if (mimeType && base64Data) {
            parts.push({ text: `[Image file: ${filename}]` });
            parts.push({ inlineData: { mimeType, data: base64Data } });
            imagesAttached.push(filename);
            await updateLog(`Attached for visual analysis: ${filename}`);
          }
        }
      }

      // If no specific files requested, scan ALL binary image files in context
      if (imagesAttached.length === 0 || requestedFiles.length === 0) {
        for (const [filename, base64Data] of context.binaryFileMap.entries()) {
          const ext = filename.split('.').pop()?.toLowerCase() ?? '';
          if (imageExts.has(ext) && !imagesAttached.includes(filename)) {
            const mimeType = mimeMap[ext];
            if (mimeType && base64Data) {
              parts.push({ text: `[Image file: ${filename}]` });
              parts.push({ inlineData: { mimeType, data: base64Data } });
              imagesAttached.push(filename);
              await updateLog(`Auto-attached for visual scan: ${filename}`);
            }
          }
        }
      }

      if (imagesAttached.length === 0) {
        return {
          result: `SCREENCAPTURE: No image files found in project context. Please ensure figure files (PNG, JPG, TIFF, etc.) are uploaded and listed in RELEVANT_FILES.`
        };
      }

      const fullPrompt = `${SCREENCAPTURE_SYSTEM_PROMPT}

## Figure Integrity Inspection Request
${scanRequest}

## Images Submitted for Analysis
${imagesAttached.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Investigative Context
${context.projectSpecification ?? '--No Specification Provided--'}

Examine ALL ${imagesAttached.length} attached image(s) with full forensic scrutiny now.
For EACH image, provide a specific per-image assessment.
Then provide the overall Figure Integrity Rating and recommended follow-up actions.`;

      parts.push({ text: fullPrompt });

      const response = await context.multiAgentGeminiClient.sendOneShotMessage(
        parts, { model: DEFAULT_GEMINI_PRO_MODEL, enableThinking: true }
      );

      let report = response?.text || '';
      report = removeBacktickFences(report).trim();

      if (!report) {
        const candidate = response.candidates?.[0];
        report = candidate?.content?.parts?.map((p: any) => p.text).join('\n').trim() || '';
      }

      if (!report) {
        return { result: '[SCREENCAPTURE: No figure integrity report could be generated]' };
      }

      const result = `## SCREENCAPTURE — Figure Integrity Report\n\n**Images Analyzed:** ${imagesAttached.join(', ')}\n\n${report}`;

      const summaryPrompt = await replaceRuntimePlaceholders(
        await getAssetString("summarize-progress-start"),
        { LastOrchestratorResponse: result }
      );
      let summary = '';
      try {
        summary = (await context.multiAgentGeminiClient.sendOneShotMessage(
          summaryPrompt, { model: DEFAULT_GEMINI_LITE_MODEL, signal: context.signal }
        ))?.text || '';
      } catch (_) {}

      context.sendMessage(JSON.stringify({ status: "PROGRESS_UPDATES", completed_status_message: summary }));
      return { result };
    } catch (error) {
      const errResult = `SCREENCAPTURE error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return {
      success: false,
      error: `SCREENCAPTURE requires a description of what to inspect and optionally RELEVANT_FILES listing image filenames to analyze.`
    };
  }
};

