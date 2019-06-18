export const clientSide =
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement &&
  process.env.NODE_ENV !== 'testing';
