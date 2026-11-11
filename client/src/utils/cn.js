/** Join class names, skipping falsy values. */
export const cn = (...classes) =>
  classes.flat(Infinity).filter(Boolean).join(" ");
