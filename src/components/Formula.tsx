import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function Formula({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false }),
    [tex, block],
  );
  if (block) {
    return <div className="formula-block" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className="formula-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
