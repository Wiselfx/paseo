import { createContext, useContext } from "react";

/**
 * True inside an expanded process card. The timeline indents and spaces rows for
 * the collapsed summary it used to sit under; once they are rows of a card, that
 * indentation and the gaps between items are the card's job. Reads from a
 * provider rather than through props so a row keeps its own signature while the
 * timeline can render it either way.
 */
const ProcessCardScope = createContext(false);

export const ProcessCardScopeProvider = ProcessCardScope.Provider;

export function useInsideProcessCard(): boolean {
  return useContext(ProcessCardScope);
}

/**
 * True for a row laid out as a segment of an opened turn's body card. The body
 * frames the rows and insets them; a row inside it must not inset itself again.
 */
const TurnBodyScope = createContext(false);

export const TurnBodyScopeProvider = TurnBodyScope.Provider;

export function useInsideTurnBody(): boolean {
  return useContext(TurnBodyScope);
}
