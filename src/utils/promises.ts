


export function deferred<T>() {
  let resolver: (value: T | PromiseLike<T>) => void;
  let rejecter:  (reason?: any) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });
  return { promise, resolve: resolver!, reject: rejecter! };
}

