import { Opportunity } from "./types";

export function pickNextBestAction(opps: Opportunity[]) {
  const untreated = opps.filter(o => !o.treated);
  if (!untreated.length) return null;

  const score = (o: Opportunity) => {
    const priorityWeight =
      o.priorityLabel === "Très élevée" ? 4000 :
      o.priorityLabel === "Élevée" ? 3000 :
      o.priorityLabel === "Moyenne" ? 2000 : 1000;

    return priorityWeight + Math.floor(o.valueCents / 100);
  };

  return untreated.sort((a, b) => score(b) - score(a))[0];
}
