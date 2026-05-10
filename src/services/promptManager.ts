
import path from 'path';
import { promises as fs } from 'fs';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { toKebabCase } from '../utils/markdownUtils.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


const PROMPTS_BASE_PATH = path.join(__dirname, '..', 'assets', 'prompts');

interface PromptMetadata {
  name?: string;
  temperature?: number;
  model?: string;
  tools?: string;
}

interface PromptObject {
  content: string;
  metadata: PromptMetadata;
}


const rawPrompts = new Map<string, PromptObject>();
const resolvedPrompts = new Map<string, PromptObject>();

async function loadPromptsRecursive(directory: string, relativePath: string = ''): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const currentRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      await loadPromptsRecursive(fullPath, currentRelativePath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      const { content, data } = matter(fileContent);
      const promptKey = currentRelativePath.replace(/\.md$/, '');
      const normalizedKey = promptKey.split(path.sep).join('/');
      rawPrompts.set(normalizedKey, { content, metadata: data as PromptMetadata });
    }
  }
}

function resolvePlaceholders(content: string, stack: string[] = []): string {
  return content.replace(/\$\{([a-zA-Z0-9_\-/]+)\}/g, (match, key) => {
    // 1. Check if the key is already in the current resolution path
    if (stack.includes(key)) {
      console.log(" DEBUG Circular Path:", [...stack, key].join(" -> "));
      throw new Error(`Circular dependency detected for prompt key: ${key}`);
    }

    const referencedPrompt = rawPrompts.get(key);
    if (!referencedPrompt) return match;

    // 2. Recurse with the current key added to the stack
    return resolvePlaceholders(referencedPrompt.content, [...stack, key]);
  });
}

async function initialize(): Promise<void> {
  if (resolvedPrompts.size > 0) return;
  
  await loadPromptsRecursive(PROMPTS_BASE_PATH);

  for (const [key, prompt] of rawPrompts.entries()) {
    resolvedPrompts.set(key, { ...prompt });
  }

  for (const [key, prompt] of resolvedPrompts.entries()) {
    try {
      // CHANGE THIS LINE: Remove 'new Set([key])' and use '[key]' instead
      const resolvedContent = resolvePlaceholders(prompt.content, [key]); 
      resolvedPrompts.set(key, { ...prompt, content: resolvedContent });
    } catch (error) {
      console.error(`Error resolving reviewer prompt '${key}':`, error);
      throw error;
    }
  }
}

const ready = initialize();

export async function resolvePlaceholdersFromFiles(content: string): Promise<string> {
  await ready;
  return content.replace(/\$\{([a-zA-Z0-9_\-/]+)\}/g, (match, key) => {
    const referencedPrompt = resolvedPrompts.get(key);
    return referencedPrompt ? referencedPrompt.content : match;
  });
}

export async function hasExpertPrompt(name: string): Promise<boolean> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('experts/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return true;
    }
  }
  return false;
}

export async function getExpertPrompt(name: string): Promise<{ preamble: string; temperature: number; model: string | undefined; }> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('experts/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return {
        preamble: prompt.content,
        temperature: prompt.metadata.temperature ?? 0, 
        model: prompt.metadata.model ?? undefined, 
      };
    }
  }
  throw new Error(`Data Sleuth prompt with name "${name}" not found.`);
}

export async function getWorkPhasePrompt(name: string): Promise<{ preamble: string; temperature: number; model: string | undefined; tools: string | undefined }> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('workphases/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return {
        preamble: prompt.content,
        temperature: prompt.metadata.temperature ?? 0, 
        model: prompt.metadata.model ?? undefined, 
        tools: prompt.metadata.tools ?? undefined
      };
    }
  }
  throw new Error(`Investigation phase prompt with name "${name}" not found.`);
}

export async function getToolInstructionPrompt(name: string): Promise<string> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('tool-instructions/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return prompt.content;
    }
  }
  throw new Error(`Integrity tool instruction prompt "${name}" not found.`);
}

export async function getToolPreamblePrompt(name: string): Promise<string> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('tool-preambles/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return prompt.content;
    }
  }
  throw new Error(`Integrity tool preamble "${name}" not found.`);
}

export async function getAssetString(name: string): Promise<string> {
  await ready;
  for (const [key, prompt] of resolvedPrompts.entries()) {
    if (key.startsWith('strings/') && toKebabCase(prompt.metadata.name) === toKebabCase(name)) {
      return prompt.content;
    }
  }
  throw new Error(`String asset "${name}" not found.`);
}

export async function replaceRuntimePlaceholders(prompt: string, replacements: Record<string, string>): Promise<string> {
  await ready;
  return prompt.replace(/\$\{(\w+)\}/g, (match, placeholderName) => {
    return replacements[placeholderName] !== undefined ? replacements[placeholderName] : match;
  });
}

export const _internal = {
  get rawPrompts() { return rawPrompts; },
  get resolvedPrompts() { return resolvedPrompts; },
  reset: () => {
    rawPrompts.clear();
    resolvedPrompts.clear();
  },
};

