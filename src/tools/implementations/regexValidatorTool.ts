

import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';
import { removeBacktickFences } from '../../utils/markdownUtils.js';
import { MultiAgentTool } from '../multiAgentTool.js';


interface TestCase {
  input: string;
  expected: any;
  type: 'validate' | 'extract' | 'replace' | 'findAll' | 'split';
  description?: string;
  group?: number;
  replacement?: string;
  engine?: 'javascript' | 'python' | 'java' | 'kotlin' | 'go';
  pythonMatchType?: 'search' | 'match' | 'fullmatch';
}




function stripRegexDelimiters(regexString: string): string {
  const startDelimiter = "{SoRegEx}";
  const endDelimiter = "{EoRegEx}";
  if (typeof regexString === 'string' && regexString.startsWith(startDelimiter) && regexString.endsWith(endDelimiter)) {
    return regexString.substring(startDelimiter.length, regexString.length - endDelimiter.length).trim();
  }
  return regexString;
}


async function getRegexExplanation(regExString: string, flags: string, context: MultiAgentToolContext): Promise<string> {
    const cleanRegex = stripRegexDelimiters(regExString);
    if (!cleanRegex) {
      return "No regular expression was provided to explain.";
    }
    try {
      const prompt = `Please provide a brief, one-paragraph explanation in plain English for the following regular expression. Describe its purpose, what it matches, and what any special characters or groups do. Do not include the RegEx itself in your response, only the explanation.\n\nRegular Expression: /${cleanRegex}/${flags || ''}`;
      
      const response = await context.multiAgentGeminiClient.sendOneShotMessage(prompt, {});
      const explanation = response?.text?.trim() || "";

      return removeBacktickFences(explanation) || "An explanation could not be generated.";
    } catch (e) {
      console.error("Error generating RegEx explanation:", e);
      return "An error occurred while generating the explanation.";
    }
}



function regexValidator(regExString: string, flags = '', testCases: TestCase[] = []) {
  const finalResults = {
    validatedRegex: null as string | null,
    isRegexValid: true,
    regexError: null as string | null,
    summary: {
      total: testCases.length,
      passed: 0,
      failed: 0,
    },
    testResults: [] as any[],
  };

  let regex: RegExp;
  try {
    if (!regExString) { throw new Error("Regular expression string cannot be empty."); }
    const cleanRegExString = stripRegexDelimiters(regExString);
    finalResults.validatedRegex = `/${cleanRegExString}/${flags || ''}`;
    regex = new RegExp(cleanRegExString, flags);
  } catch (e: any) {
    finalResults.isRegexValid = false;
    finalResults.regexError = e.message;
    return finalResults;
  }

  if (!Array.isArray(testCases)) {
    finalResults.isRegexValid = false;
    finalResults.regexError = "The 'testCases' parameter must be an array.";
    return finalResults;
  }

  for (const testCase of testCases) {
    const { input, expected, type, description = '', group = 0, replacement } = testCase;
    const caseResult = { description, type, input, expected, actual: null as any, passed: false, error: null as string | null };

    try {
      let actual: any;
      let passed = false;
      switch (type) {
        case 'validate':
          actual = regex.test(input);
          passed = (actual === expected);
          break;
        case 'extract':
          const matches = regex.exec(input);
          actual = (matches && matches[group] !== undefined) ? matches[group] : null;
          passed = (actual === expected);
          break;
        case 'replace':
          if (typeof replacement !== 'string') throw new Error("Test case of type 'replace' must have a 'replacement' string property.");
          actual = input.replace(regex, replacement);
          passed = (actual === expected);
          break;
        case 'findAll':
          if (!regex.global) {
            throw new Error("Test case of type 'findAll' requires the global 'g' flag.");
          }
          
          actual = Array.from(input.matchAll(regex), match => [...match]);
          
          
          passed = Array.isArray(expected) &&
                   Array.isArray(actual) &&
                   actual.length === expected.length &&
                   actual.every((matchArray, i) =>
                     Array.isArray(expected[i]) &&
                     matchArray.length === expected[i].length &&
                     matchArray.every((val: any, j: number) => val === expected[i][j])
                  );
          break;
        case 'split':
          actual = input.split(regex);
          passed = Array.isArray(expected) && actual.length === expected.length && actual.every((val: any, index: number) => val === expected[index]);
          break;
        default:
          throw new Error(`Unknown test case type: '${type}'`);
      }
      caseResult.actual = actual;
      caseResult.passed = passed;
    } catch (e: any) {
      caseResult.error = e.message;
      caseResult.passed = false;
    }

    if (caseResult.passed) {
      finalResults.summary.passed++;
    } else {
      finalResults.summary.failed++;
    }
    finalResults.testResults.push(caseResult);
  }
  return finalResults;
}


export const regexValidatorTool: MultiAgentTool = {
  displayName: "RegEx Validator",
  name: 'REGEX/VALIDATE{',

  
  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const payloadString = `{${invocation.trim().slice(0, -1)}}`;
    let payload: any;

    try {
      payload = JSON.parse(payloadString);
    } catch (e: any) {
      return {
        success: false,
        error: `Invalid syntax: The content inside ${this.name}...} is not valid JSON. Error: ${e.message}`,
      };
    }

    const issues: string[] = [];

    
    if (!payload.regExString || typeof payload.regExString !== 'string') {
      issues.push("The JSON payload is missing the required 'regExString' field, or its value is not a string.");
    } else {
        const startDelimiter = "{SoRegEx}";
        const endDelimiter = "{EoRegEx}";
        if (!payload.regExString.startsWith(startDelimiter)) issues.push("The 'regExString' is missing the required '{SoRegEx}' prefix.");
        if (!payload.regExString.endsWith(endDelimiter)) issues.push("The 'regExString' is missing the required '{EoRegEx}' suffix.");
        
        try {
            new RegExp(stripRegexDelimiters(payload.regExString), payload.flags || '');
        } catch (e: any) {
            issues.push(`The provided 'regExString' has a syntax error: ${e.message}`);
        }
    }

    
    if (!Array.isArray(payload.testCases)) {
      issues.push("The JSON payload is missing the required 'testCases' field, or its value is not an array.");
    }

    if (issues.length > 0) {
      return {
        success: false,
        error: `Invalid parameters for ${this.displayName} tool:\n- ${issues.join('\n- ')}`,
      };
    }

    return {
      success: true,
      params: payload,
    };
  },

  
  async execute(params: Record<string, any>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const { regExString, flags, testCases } = params;

    const validationResult = regexValidator(regExString, flags, testCases);

    let finalResultString = '';

    
    if (validationResult.isRegexValid && validationResult.summary.failed === 0) {
        const explanation = await getRegexExplanation(regExString, flags, context);
        finalResultString += `**Validation Successful**\n\n`;
        finalResultString += `**Explanation:** ${explanation}\n\n`;
        finalResultString += `**Final Regex:** ${validationResult.validatedRegex}\n\n`;
    } else if (!validationResult.isRegexValid) {
        finalResultString += `**Validation Failed: Invalid Regex**\n\n`;
        finalResultString += `The regular expression provided has a syntax error: ${validationResult.regexError}\n\n`;
    } else {
        finalResultString += `**Validation Failed: ${validationResult.summary.failed} of ${validationResult.summary.total} test cases failed.**\n\n`;
    }

    finalResultString += '**Detailed Test Results:**\n';
    finalResultString += '```json\n' + JSON.stringify(validationResult, null, 2) + '\n```';

    return { result: finalResultString };
  },
};

