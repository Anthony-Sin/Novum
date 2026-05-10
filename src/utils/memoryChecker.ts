

import * as os from 'os';


export function checkContainerMemory(): string {
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  const totalMem = os.totalmem();
  const freeMem  = os.freemem();

  return [
    `Total Container Memory    : ${toMB(totalMem)} MB`,
    `Container Available Memory: ${toMB(freeMem)} MB`,
  ].join('\n');
}

