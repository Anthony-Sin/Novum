
import { DEFAULT_GEMINI_PRO_MODEL } from "../config/models.js";
import { GeminiClient } from "../services/geminiClient.js";
import { getAssetString, getExpertPrompt } from "../services/promptManager.js";
import { removeBacktickFences } from "../utils/markdownUtils.js";
import { OverseerFeedback, GuidanceType } from "./types.js";

const NO_DIFF_STRING = "---No diff information available---"

export class Overseer {
  private interval: number;
  private multiAgentGeminiClient: GeminiClient;
  private onFeedback: () => Promise<void>; 
  private worklog: string;
  private intervalId: NodeJS.Timeout | null;
  private isRunning: boolean;
  private isChecking: boolean;
  private feedbackHistory: OverseerFeedback[];
  private restartCount: number;
  private promptText: string;
  private pendingFeedback: OverseerFeedback | null;
  private currentDiff: string;
  private assumptions: string;

  private constructor(interval: number, preamble: string, assumptions: string, multiAgentGeminiClient: GeminiClient) {
    if (!interval) {
      throw new Error("Overseer requires an interval.");
    }
    this.interval = interval;

    
    this.worklog = "";
    this.intervalId = null;
    this.isRunning = false;
    this.isChecking = false;
    this.feedbackHistory = [];
    this.restartCount = 0;
    this.pendingFeedback = null;
    this.promptText = preamble;
    this.multiAgentGeminiClient = multiAgentGeminiClient;
    this.currentDiff = NO_DIFF_STRING;
    this.assumptions = assumptions;

    
    this.onFeedback = async () => {
      this._performReview().then(feedback => {
      if (feedback) {
        this.pendingFeedback = feedback; 
        console.log(`Overseer has generated new pending feedback.`);
      }}).catch(error => {
        console.error(`Error in Overseer's scheduled review:`, error);
      });
    };
  }

    public peekPendingFeedback(): OverseerFeedback | null {
    return this.pendingFeedback;
  }

    public commitAndClearPendingFeedback(feedback?: OverseerFeedback): OverseerFeedback | null {
    const feedbackToCommit = feedback || this.pendingFeedback;
    this.pendingFeedback = null; 

    if (feedbackToCommit) {
      this.feedbackHistory.push(feedbackToCommit);

      if (feedbackToCommit.action === 'RESTART') {
        this.restartCount++;
      }
      console.log(`Feedback for the investigation received and committed.`);
    }

    return feedbackToCommit;
  }

    public addLog(logEntry: string): void {
    const formattedLog = logEntry + "\n";
    this.worklog += formattedLog;
  }

  public getLog(): string {
    return this.worklog;
  }

    public clearWorklog(): void {
    this.currentDiff = NO_DIFF_STRING;
    this.worklog = "";
    console.log(`Worklog cleared.`);
  }

    public start(): void {
    if (this.isRunning) return;
    console.log(`Overseer started with a ${this.interval / 1000}s interval.`);
    this.isRunning = true;
    this.intervalId = setInterval(this.onFeedback, this.interval);
  }

    public stop(): void {
    if (!this.isRunning) return;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
    console.log(`Overseer stopped.`);
  }

  public forceRestart(guidance: string, reasoning: string = "Restart triggered by agent tool."): void {
    if (this.pendingFeedback) {
      console.warn("Overseer `forceRestart` overwriting existing pending feedback.");
    }
    this.pendingFeedback = {
      action: 'RESTART',
      reasoning: reasoning,
      guidance: guidance,
      type: GuidanceType.ForcedUserGuidance
    };
    console.log(`Overseer restart was forced by an agent.`);
  }

    public updateCurrentDiff(diffString: string): void {
    this.currentDiff = diffString || "---No changes detected---";
  }

    public forceGuidance(guidance: string, reasoning: string = "Guidance provided by user."): void {
    if (this.pendingFeedback) {
      console.warn("Overseer `forceGuidance` overwriting existing pending feedback.");
    }
    this.pendingFeedback = {
      action: 'GUIDE',
      reasoning: reasoning,
      guidance: guidance,
      type: GuidanceType.ForcedUserGuidance
    };
    console.log(`Overseer guidance was forced by an agent.`);
  }

    public async forceReview(): Promise<OverseerFeedback | null> {
    console.log(`Forcing an immediate Overseer review...`);
    return this._performReview();
  }

    private async _performReview(): Promise<OverseerFeedback | null> {
    if (this.isChecking) {
      console.log("Overseer check is already in progress, skipping this invocation.");
      return null;
    }
    this.isChecking = true;
    try {
      let promptSections: string[] = [this.promptText];

      if (this.feedbackHistory.length > 0) {
        const historyHeader = `
**Overseer's Memory & Current State (Based on Received Feedback):**
- **Restart Attempts So Far:** ${this.restartCount}
- **Confirmed Feedback History (Oldest to Newest):**`;

        const historyLog = this.feedbackHistory.map((fb, index) => `
${index + 1}. **Action:** \`${fb.action}\`
- **Reasoning:** "${fb.reasoning}"
- **Guidance Provided:** ${fb.guidance ? `"${fb.guidance}"` : "None"}`).join('');
        promptSections.push(historyHeader + historyLog + "\n---");
      }

      promptSections.push(`
**Project-Scope Guidance:**
The following guidance has been provided to the Project Orchestrator and each Work Phase for guidance. They constitute standard preferences and best practices as long as they don't contradict anything in the Project Requirements. If there is any contradiction, the Project Definition is correct:
${await getAssetString('base-assumptions')}
${this.assumptions}`);
      
      promptSections.push(`**Current Project Diff:**\n\`\`\`\n${this.currentDiff}\n\`\`\`\n---`);

      promptSections.push(`**Worklog to Review:**\n\`\`\`\n${this.worklog}\n\`\`\`\n\nPlease provide your feedback in JSON format ONLY, with "action" (e.g., "CONTINUE", "RESTART", "PROVIDE_GUIDANCE"), "reasoning", and "guidance" (optional) fields.`);

      const fullPrompt = promptSections.join('\n');

      const responseText = (await this.multiAgentGeminiClient.sendOneShotMessage(
              fullPrompt,
              { model: DEFAULT_GEMINI_PRO_MODEL }
            ))?.text;

      console.log(`Overseer completed its review.`);

      let feedback = undefined;
      if (responseText) { 
        let cleanResponseText = removeBacktickFences(responseText.trim());
        const jsonMatch = cleanResponseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON object found in overseer response.");
        feedback = JSON.parse(jsonMatch[0]);
      }

      if (typeof feedback?.action !== 'string' || typeof feedback?.reasoning !== 'string') {
        throw new Error('Invalid feedback format: missing action or reasoning.');
      }
      
      const overseerFeedback: OverseerFeedback = {
        ...feedback,
        type: GuidanceType.StandardOverseerGuidance
      };

      return overseerFeedback;

    } catch (error) {
      console.error(`Error during Overseer review:`, error);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  public static async createAndStart(interval: number, assumptions: string, multiAgentGeminiClient: GeminiClient): Promise<Overseer> {
    try {
      const { preamble } = await getExpertPrompt('overseer');
      const newOverseer = new Overseer(interval, preamble, assumptions, multiAgentGeminiClient);
      newOverseer.start();
      return newOverseer;
    } catch (error) {
      console.error(`Failed to load Overseer prompt: ${error}`);
      throw new Error(`Could not create Overseer: ${error}`);
    }
  }
}

