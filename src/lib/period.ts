export interface Period {
  de: Date;
  ate: Date;
  deStr: string;
  ateStr: string;
  label: string;
  dias: number;
}

/** Resolve o período a partir dos query params (?de=&ate=), padrão = mês atual. */
export function resolvePeriod(sp: { de?: string; ate?: string; preset?: string }): Period {
  const now = new Date();
  let de: Date;
  let ate: Date;

  if (sp.preset === "hoje") {
    de = startOfDay(now);
    ate = endOfDay(now);
  } else if (sp.preset === "7d") {
    de = startOfDay(addDays(now, -6));
    ate = endOfDay(now);
  } else if (sp.preset === "30d") {
    de = startOfDay(addDays(now, -29));
    ate = endOfDay(now);
  } else if (sp.preset === "ano") {
    de = new Date(now.getFullYear(), 0, 1);
    ate = endOfDay(new Date(now.getFullYear(), 11, 31));
  } else if (sp.de || sp.ate) {
    de = sp.de ? startOfDay(new Date(sp.de + "T00:00:00")) : new Date(now.getFullYear(), now.getMonth(), 1);
    ate = sp.ate ? endOfDay(new Date(sp.ate + "T00:00:00")) : endOfDay(now);
  } else {
    de = new Date(now.getFullYear(), now.getMonth(), 1);
    ate = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  const deStr = de.toISOString().slice(0, 10);
  const ateStr = ate.toISOString().slice(0, 10);
  const dias = Math.max(1, Math.round((ate.getTime() - de.getTime()) / 864e5));
  return {
    de,
    ate,
    deStr,
    ateStr,
    dias,
    label: `${de.toLocaleDateString("pt-BR")} a ${ate.toLocaleDateString("pt-BR")}`,
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
