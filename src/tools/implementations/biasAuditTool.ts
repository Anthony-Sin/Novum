

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';
import { DEFAULT_GEMINI_PRO_MODEL } from '../../config/models.js';
import { removeBacktickFences, getDocumentsAndContent } from '../../utils/markdownUtils.js';

const BIASAUDIT_SYSTEM_PROMPT = `You are the Scientific Integrity Overseer — an architecturally independent auditor
of a research fraud detection system. Your job is to review the investigation worklog and assess
whether the forensic agents are maintaining strict Zero-Bias Observation.

AUTHOR CONFIRMATION BIAS INDICATORS to detect:
1. Accepting reported p-values without independent recalculation (STATAUDIT not invoked)
2. Framing WorkPhase objectives as "verify the authors' claims" rather than "stress-test" them
3. Dismissing impossible values as "likely data entry errors" without forensic investigation
4. Premature closure — issuing a verdict before all mandatory audit phases are complete
5. Overweighting the authors' narrative characterization of their own data
6. Failing to run SAFETYSCAN before Research Impact Assessment
7. Accepting preregistration claims without fetching the actual registry record (FACTFINDER not invoked)

BIAS RISK SCORING (score each dimension 0-10, 10 = extreme bias):
- Selective Skepticism (applying more scrutiny to integrity findings than to author claims)
- Premature Closure Risk (closing phases before all checks are done)
- Missing Adversarial Checks (mandatory tools not invoked)
- Framing Bias (tasks framed to confirm rather than challenge)
- Overweighting Author Narrative (treating author assertions as ground truth)

SIGNAL DEFINITIONS:
- CONTINUE: Investigation is rigorous and adversarially framed. All mandatory checks running.
- GUIDE: Slipping into passive acceptance. Provide specific corrective actions.
- RESTART: Entire audit compromised by confirmation bias. Evidence accepted without verification.
- ABANDON: Raw data completely inaccessible AND insufficient summary statistics for any independent verification.

REQUIRED OUTPUT: Valid JSON only, no prose outside JSON:
{
  "assessment": "brief description of bias state",
  "bias_scores": {
    "selective_skepticism": 0,
    "premature_closure_risk": 0,
    "missing_adversarial_checks": 0,
    "framing_bias": 0,
    "overweighting_author_narrative": 0
  },
  "overall_bias_risk": "LOW|MODERATE|HIGH|CRITICAL",
  "action": "CONTINUE|GUIDE|RESTART|ABANDON",
  "guidance": "specific corrective actions if GUIDE or RESTART, empty string otherwise",
  "reasoning": "detailed explanation of the assessment"
}`;

export const biasAuditTool: MultiAgentTool = {
  displayName: "Overseer Bias Auditor",
  name: 'BIASAUDIT',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`BIASAUDIT invoked — reviewing investigation for confirmation bias`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Overseer running bias audit on investigation worklog...`,
    }));

    try {
      let auditTarget = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);
      if (fileMarkerIndex !== -1) {
        auditTarget = question.substring(0, fileMarkerIndex).trim();
        const jsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(jsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      const worklogContent = await getDocumentsAndContent(requestedFiles.map(f => ({ FILENAME: f, DESCRIPTION: '' })), context);

      const overseerLog = context.overseer ? (context.overseer as any).getLog?.() ?? '' : '';

      const fullPrompt = `${BIASAUDIT_SYSTEM_PROMPT}

## Audit Request Context
${auditTarget}

## Investigation Worklog (from Overseer)
${overseerLog}

## Available Investigation Documents
${worklogContent}

## Investigative Specification
${context.projectSpecification ?? '--No Specification Provided--'}

Perform the full bias audit now. Review the entire worklog above.
Identify every instance of confirmation bias, passive acceptance, or missing adversarial check.
Output ONLY the JSON object — no prose, no markdown fences.`;

      const response = await context.multiAgentGeminiClient.sendOneShotMessage(
        fullPrompt,
        { model: DEFAULT_GEMINI_PRO_MODEL, enableThinking: true }
      );

      let rawResult = response?.text || '';
      rawResult = removeBacktickFences(rawResult).trim();

      
      let parsedResult: any = null;
      try {
        
        parsedResult = JSON.parse(rawResult);
      } catch (_) {
        
        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsedResult = JSON.parse(jsonMatch[0]); } catch (_) {}
        }
      }

      if (!parsedResult) {
        
        parsedResult = {
          assessment: "BIASAUDIT could not parse a structured response from the LLM.",
          bias_scores: { selective_skepticism: 5, premature_closure_risk: 5, missing_adversarial_checks: 5, framing_bias: 5, overweighting_author_narrative: 5 },
          overall_bias_risk: "MODERATE",
          action: "GUIDE",
          guidance: "Run STATAUDIT on all primary endpoints before proceeding. Verify all preregistration claims via FACTFINDER.",
          reasoning: rawResult
        };
      }

      
      if (context.overseer && parsedResult.action) {
        const action = parsedResult.action as string;
        const guidance = parsedResult.guidance as string;
        if (action === 'RESTART') {
          context.overseer?.forceRestart?.(guidance, 'BIASAUDIT triggered RESTART due to critical confirmation bias');
        } else if (action === 'GUIDE') {
          await updateLog(`BIASAUDIT GUIDE signal: ${guidance}`);
        } else if (action === 'ABANDON') {
          await updateLog(`BIASAUDIT ABANDON signal: ${guidance}`);
        }
      }

      const formattedResult = `## BIASAUDIT — Overseer Integrity Assessment

**Action Signal:** ${parsedResult.action}
**Bias Risk Level:** ${parsedResult.overall_bias_risk}

**Assessment:** ${parsedResult.assessment}

**Bias Scores (0-10, 10=extreme bias):**
- Selective Skepticism: ${parsedResult.bias_scores?.selective_skepticism ?? 'N/A'}
- Premature Closure Risk: ${parsedResult.bias_scores?.premature_closure_risk ?? 'N/A'}
- Missing Adversarial Checks: ${parsedResult.bias_scores?.missing_adversarial_checks ?? 'N/A'}
- Framing Bias: ${parsedResult.bias_scores?.framing_bias ?? 'N/A'}
- Overweighting Author Narrative: ${parsedResult.bias_scores?.overweighting_author_narrative ?? 'N/A'}

**Guidance:** ${parsedResult.guidance || 'None required — investigation is proceeding with adequate rigor.'}

**Reasoning:** ${parsedResult.reasoning}

\`\`\`json
${JSON.stringify(parsedResult, null, 2)}
\`\`\``;

      context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: `BIASAUDIT complete. Signal: ${parsedResult.action} | Risk: ${parsedResult.overall_bias_risk}`
      }));

      return { result: formattedResult };
    } catch (error) {
      const errResult = `BIASAUDIT error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return {
      success: false,
      error: `BIASAUDIT requires a worklog review request and optionally RELEVANT_FILES pointing to the RESEARCH_LOG.md.`
    };
  }
};



