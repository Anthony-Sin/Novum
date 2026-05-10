

import { TranscriptManagerConfig, 
    FormattedTranscriptEntry, 
    FormattedTranscriptPart, USER_ROLE } from "../momoa_core/types.js";

/**
 * Interface for a single entry in the investigation audit trail.
 */
interface TranscriptEntry {
    speaker: string;
    content: string | any[];
    originalContent: string | any[];
    documentId?: string;
    replacementIfSuperseded?: string;
    isSuperseded: boolean; 
    ephemeral?: boolean; 
}

export interface AddEntryOptions {
    documentId?: string; // Often Maps to a DOI or Preprint ID
    replacementIfSuperseded?: string;
    ephemeral?: boolean;
}

/**
 * @class TranscriptManager
 * @description Manages an Audit Trail of a paper's verification process.
 * If a paper section is identified as fraudulent or retracted during analysis,
 * older versions of that text can be automatically superseded with validated data.
 */
export class TranscriptManager {
    private transcript: TranscriptEntry[] = [];
    private readonly config: TranscriptManagerConfig;

    constructor(
        config: TranscriptManagerConfig,
    ) {
        this.config = config;
    }

    /**
     * Initializes the Audit Trail with the target paper's text and optional 
     * figures (images) for manipulation analysis (e.g. western blot tampering).
     */
     addImage(imagePrompt?: string, image?: string, imageMimeType?: string): void {
        const parts: FormattedTranscriptPart[] = [];

        // 1. Add Image First for Forensics
        if (image && imageMimeType) {
            parts.push({
                inlineData: {
                    mimeType: imageMimeType, 
                    data: image,
                }
            });
        }

        // 2. Add Prompt/Context Second
        if (imagePrompt) {
            parts.push({ text: imagePrompt });
        } else if (parts.length === 0) {
            parts.push({ text: '' }); 
        }

        this.addEntry(USER_ROLE, parts, {}, false);
    }

    /**
     * Adds a new entry to the Investigation Log.
     * If a verified replication dataset replaces an old paper claim,
     * this automatically marks the old claim as superseded.
     */
    addEntry(
        speaker: string,
        content: string | any[],
        options: AddEntryOptions = {},
        flipLast: boolean = false,
    ): void {
        if (typeof speaker !== 'string' || speaker.trim() === '') {
            console.warn('Warning: Role identifier is empty.');
        }
        if (typeof content !== 'string' && !Array.isArray(content)) {
            console.warn('Warning: Paper content is not a string or array.');
        }

        const { documentId, replacementIfSuperseded, ephemeral } = options;

        if (documentId && typeof documentId === 'string' && documentId.trim() !== '') {
             const exactDuplicate = this.transcript.find(entry => 
                entry.documentId === documentId && 
                !entry.isSuperseded && 
                entry.speaker === speaker &&
                JSON.stringify(entry.content) === JSON.stringify(content)
             );

             if (exactDuplicate) return;
        }

        const newEntry: TranscriptEntry = {
            speaker: speaker,
            content: content,
            originalContent: content,
            isSuperseded: false,
            ...(ephemeral !== undefined && { ephemeral }),
        };

        if (documentId && typeof documentId === 'string' && documentId.trim() !== '') {
            newEntry.documentId = documentId;

            if (typeof replacementIfSuperseded === 'string') {
                newEntry.replacementIfSuperseded = replacementIfSuperseded;
            }

            // Supersede older versions of the manuscript or retracted data
            this.transcript.forEach(entry => {
                const toolReplace = (entry.documentId && entry.documentId.includes(":") && entry.documentId.split(":", 1)[0] == newEntry.documentId && !entry.isSuperseded);

                if (toolReplace || (entry.documentId === newEntry.documentId && !entry.isSuperseded)) {
                    entry.isSuperseded = true;
                    if (typeof entry.replacementIfSuperseded === 'string') {
                        entry.content = entry.replacementIfSuperseded;
                    }
                }
            });
        }

        if (flipLast) {
            const modelRoleForPendingCheck = "model";
            const userRoleForPendingCheck = "user";
            let pendingBlockStartIndex = -1;

            if (this.transcript.length > 0) {
                if (this.transcript[this.transcript.length - 1].speaker !== modelRoleForPendingCheck) {
                    let countOfPendingEntries = 0;
                    for (let i = this.transcript.length - 1; i >= 0; i--) {
                        if (this.transcript[i].speaker === userRoleForPendingCheck) {
                            countOfPendingEntries++;
                        } else {
                            break;
                        }
                    }

                    if (countOfPendingEntries > 0) {
                        pendingBlockStartIndex = this.transcript.length - countOfPendingEntries;
                    }
                }
            }

            if (pendingBlockStartIndex !== -1) {
                this.transcript.splice(pendingBlockStartIndex, 0, newEntry);
            } else {
                this.transcript.push(newEntry);
            }
        } else { 
            this.transcript.push(newEntry);
        }
    }

    insertLineAtTop(identifier: string, lineToInsert: string): void {
        if (typeof identifier !== 'string' || identifier.trim() === '') return;
        if (typeof lineToInsert !== 'string') return;

        this.transcript.forEach(entry => {
            if (entry.documentId === identifier && !entry.isSuperseded) {
                if (typeof entry.content === 'string') {
                    entry.content = `${lineToInsert}\n${entry.content}`;
                }
            }
        });
    }

    replaceEntry(identifier: string, newValue: string): void {
        if (!identifier) return;

        for (let i = 0; i < this.transcript.length; i++) {
            const entry = this.transcript[i];
            if (entry.documentId === identifier) {
                entry.content = newValue;
            }
        }
    }

    supersedeEntry(identifier: string): void {
        if (typeof identifier !== 'string' || identifier.trim() === '') return;

        this.transcript.forEach(entry => {
            if (entry.documentId === identifier && !entry.isSuperseded) {
                entry.isSuperseded = true;
                if (typeof entry.replacementIfSuperseded === 'string') {
                    entry.content = entry.replacementIfSuperseded;
                }
            }
        });
    }

     getTranscript(lastSpeakerRequired?: string, excludeEphemeral: boolean = false): FormattedTranscriptEntry[] {
        if (!this.transcript) return [];

        const consolidatedTranscript: FormattedTranscriptEntry[] = this.transcript
        .filter(entry => !excludeEphemeral || !entry.ephemeral)
        .reduce((accumulator: FormattedTranscriptEntry[], currentEntry: TranscriptEntry) => {
            const speaker = currentEntry.speaker;
            const content = currentEntry.content;
            const isCurrentEphemeral = !!currentEntry.ephemeral;

            const lastEntry = accumulator.length > 0 ? accumulator[accumulator.length - 1] : null;

            if (lastEntry && lastEntry.role === speaker) {
                if (typeof content === 'string') {
                    const lastPartIndex = lastEntry.parts.length - 1;
                    if (lastPartIndex >= 0 && 'text' in lastEntry.parts[lastPartIndex]) {
                         lastEntry.parts[lastPartIndex].text += "\n" + content;
                    } else {
                         lastEntry.parts.push({ text: content });
                    }
                } else if (Array.isArray(content)) {
                    lastEntry.parts.push(...content);
                }

                if (lastEntry.ephemeral && !isCurrentEphemeral) {
                    delete lastEntry.ephemeral;
                }
            } else {
                let parts: any[] = [];
                
                if (typeof content === 'string') {
                    parts = [{ text: content }];
                } else if (Array.isArray(content)) {
                     parts = [...content];
                }

                const newEntry: FormattedTranscriptEntry = {
                    role: speaker,
                    parts: parts
                };
                if (isCurrentEphemeral) newEntry.ephemeral = true;
                accumulator.push(newEntry);
            }
            return accumulator;
        }, []);

        if (consolidatedTranscript.length === 0) return [];
        if (!lastSpeakerRequired) return consolidatedTranscript;

        let lastIndexOfRequiredSpeaker = -1;
        for (let i = consolidatedTranscript.length - 1; i >= 0; i--) {
            if (consolidatedTranscript[i].role === lastSpeakerRequired) {
                lastIndexOfRequiredSpeaker = i;
                break;
            }
        }

        if (lastIndexOfRequiredSpeaker !== -1) {
            return consolidatedTranscript.slice(0, lastIndexOfRequiredSpeaker + 1);
        } else {
            return [];
        }
    }

    clearTranscript(): void {
        this.transcript = [];
    }

    replaceLastEntryContent(newContent: string): void {
        if (this.transcript.length === 0) return;
        if (typeof newContent !== 'string') return;

        const lastEntry = this.transcript[this.transcript.length - 1];
        lastEntry.content = newContent;
        lastEntry.originalContent = newContent; 
    }

    getPendingPrompt(): string | null {
        if (!this.transcript || this.transcript.length === 0) return null;

        const lastEntry = this.transcript[this.transcript.length - 1];
        if (lastEntry.speaker === "model") return null;

        const pendingUserContents: string[] = [];
        for (let i = this.transcript.length - 1; i >= 0; i--) {
            const entry = this.transcript[i];
            if (entry.speaker === "user") {
                if (typeof entry.content === 'string') {
                     pendingUserContents.unshift(entry.content);
                }
            } else {
                break;
            }
        }

        if (pendingUserContents.length === 0) return null;
        return pendingUserContents.join("\n");
    }

    getFullTranscriptAsString() {
        if (!this.transcript || this.transcript.length == 0) return 'NO VERIFICATION LOG FOUND';      

        let chatHistoryArray = [...this.transcript];
        const formattedMessages = chatHistoryArray.map((message, _index) => {
            const role = message.speaker; 
            let text = message.content;
            
            if (Array.isArray(text)) text = JSON.stringify(text);
            return `${role}: ${text}`;
        });
      
        return formattedMessages.join("\n");        
    }

    getTranscriptAsString(trimPreamble: boolean, expertNames: string[]): string {
        if (!this.transcript || this.transcript.length == 0) return '';

        let chatHistoryArray = [...this.transcript];

        if (trimPreamble && chatHistoryArray.length > 0)
            chatHistoryArray = chatHistoryArray.slice(1);
      
        const formattedMessages = chatHistoryArray.map((message, index) => {
            let text = message.content;
            
            if (Array.isArray(text)) {
                text = text.map(part => {
                    if (part.text) return part.text;
                    else if (part.inlineData) return `[Forensic Image Attachment: ${part.inlineData.mimeType}]`; 
                    return '';
                }).join('\n');
            }
      
            let offset = 0;
            let formattedRole;
            
            if (!trimPreamble && index == 0) {
                formattedRole = "Investigator";
                offset = 1;
            } else {
                 formattedRole = expertNames[(index+offset) % expertNames.length];
            }
            
            return `${formattedRole}: ${text}`;
        });
      
        return formattedMessages.join("\n");
    }

  async cleanLLMResponse(response: string): Promise<string> {
    const stopStringsArray = (await this.config.context.getAssetString('response-stop-strings'))
        .split('\n')
        .filter(s => s.trim() !== '');
    const allToolInvocationStrings = [...this.config.context.getToolNames(), `STARTWORKPHASE`, `RETURN`, 'TOOL_CALL:FINISH'];

    const toolPrefix = await this.config.context.getAssetString('tool-prefix');
    const lines = response.split('\n');
    const cleanedLines: string[] = [];
    let toolInvocationCount = 0;

    for (const line of lines) {
      if (stopStringsArray.includes(line.trim())) break; 

      const isToolInvocation = allToolInvocationStrings.some((toolString: string) => line.startsWith(`${toolPrefix}${toolString}`));
      if (isToolInvocation) {
        toolInvocationCount++;
        if (toolInvocationCount >= 2) break;
      }

      cleanedLines.push(line);
    }

    return cleanedLines.join('\n').trimEnd();
  }
}
