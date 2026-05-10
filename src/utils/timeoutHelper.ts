


export const withDeadline = async <T>(
  promise:    Promise<T>,
  deadlineMs: number,
  signal?:    AbortSignal
): Promise<T> => {
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) throw new Error('Hard time limit reached before tool execution.');

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Maximum investigation time limit reached during tool execution. Tool cancelled.')),
        remaining
      );
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Operation aborted.'));
      });
    }),
  ]);
};

