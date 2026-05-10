
import { randomUUID } from 'crypto';
import { InfrastructureContext } from '../novum_core/types.js';

export class ConcreteInfrastructureContext implements InfrastructureContext {
  getToolNames(): string[] {
    
    return ['VerifyDOI', 'ImageManipulationDetector', 'StatSleuth', 'CheckPlagiarismDB'];
  }

  async getToolResultPrefix(): Promise<string> {
    return '---INTEGRITY TOOL RESULT START---';
  }

  async getToolResultSuffix(): Promise<string> {
    return '---INTEGRITY TOOL RESULT END---';
  }

  async getAssetString(name: string): Promise<string> {
    
    console.warn(`Asset '${name}' not found. Returning empty string.`);
    return '';
  }

  getSessionId(): string {
    return randomUUID().toString();
  }
}

