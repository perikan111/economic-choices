"use client";

import { useCallback, useMemo, useReducer } from "react";
import {
  advance as advanceGame,
  choose as chooseGame,
  createInitialState,
  getView,
  restart as restartGame,
  type GameState,
  type Scenario,
} from "@/game-core";

type Action =
  | { type: "advance" }
  | { type: "choose"; id: string }
  | { type: "restart" }
  | { type: "replace"; state: GameState };

export function useGameSession(scenario: Scenario) {
  const reducer = useCallback((state: GameState, action: Action): GameState => {
    switch (action.type) {
      case "advance":
        return advanceGame(scenario, state);
      case "choose":
        return chooseGame(scenario, state, action.id);
      case "restart":
        return restartGame(scenario);
      case "replace":
        return action.state;
    }
  }, [scenario]);

  const [state, dispatch] = useReducer(reducer, scenario, createInitialState);
  const view = useMemo(() => getView(scenario, state), [scenario, state]);

  return {
    state,
    view,
    advance: useCallback(() => dispatch({ type: "advance" }), []),
    choose: useCallback((id: string) => dispatch({ type: "choose", id }), []),
    restart: useCallback(() => dispatch({ type: "restart" }), []),
    replace: useCallback((nextState: GameState) => dispatch({ type: "replace", state: nextState }), []),
  };
}
