"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Código de barras CODE128 (aceita SKU ou EAN livre) renderizado em SVG. */
export function Barcode({
  value,
  height = 40,
  width = 1.6,
  fontSize = 12,
}: {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        width,
        fontSize,
        margin: 4,
        displayValue: true,
      });
    } catch {
      // valor incompatível com CODE128 (raríssimo) - deixa o svg vazio
    }
  }, [value, height, width, fontSize]);

  return <svg ref={ref} />;
}
