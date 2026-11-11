const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 1280 -> "1.3K" */
export const formatCompactNumber = (value) => compact.format(value);
