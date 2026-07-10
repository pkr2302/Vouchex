/** Stack of mobile back handlers (forms, detail views). LIFO. */
const stack = [];

export function pushMobileBackHandler(handler) {
  if (typeof handler !== 'function') return () => {};
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function tryMobileBackHandlers() {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    try {
      if (stack[i]?.()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
