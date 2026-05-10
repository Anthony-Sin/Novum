
import { randomUUID } from 'crypto';
import { InfrastructureContext } from '../momoa_core/types.js';

export class ConcreteInfrastructureContext implements InfrastructureContext {
  getToolNames(): string[] {
    // Expose specific integrity-checking tools to the orchestrator
    return ['VerifyDOI', 'ImageManipulationDetector', 'StatSleuth', 'CheckPlagiarismDB'];
  }

  async getToolResultPrefix(): Promise<string> {
    return '---INTEGRITY TOOL RESULT START---';
  }

  async getToolResultSuffix(): Promise<string> {
    return '---INTEGRITY TOOL RESULT END---';
  }

  async getAssetString(name: string): Promise<string> {
    // Placeholder. In production, this pulls known fraudulent paper identifiers.
    console.warn(`Asset '${name}' not found. Returning empty string.`);
    return '';
  }

  getSessionId(): string {
    return randomUUID().toString();
  }
}
