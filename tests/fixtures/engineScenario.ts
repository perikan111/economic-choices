import type { Scenario } from "@/game-core";

export const engineScenario: Scenario = {
  formatVersion: 1,
  meta: {
    id: "engine-fixture",
    title: "Game core test fixture",
    version: "1.0.0",
  },
  characters: [{ id: "narrator", name: "案内役" }],
  parameters: [
    { id: "score", label: "得点", min: 0, max: 20 },
    { id: "resource", label: "資源", min: 0, max: 10 },
    { id: "ratio", label: "比率", min: 0, max: 10, integer: false },
  ],
  initialState: {
    startScene: "intro",
    params: { score: 10, resource: 5, ratio: 1.25 },
    flags: { unlocked: false, branchTaken: false },
  },
  scenes: [
    {
      id: "intro",
      lines: [
        { id: "intro-1", speaker: "narrator", text: "テストを始めます。" },
        { id: "intro-2", speaker: "narrator", text: "次の場面へ進みます。" },
      ],
      next: { type: "goto", scene: "decision" },
    },
    {
      id: "decision",
      lines: [{ id: "decision-1", speaker: "narrator", text: "行動を選んでください。" }],
      next: {
        type: "choices",
        prompt: "最初の選択",
        choices: [
          {
            id: "hidden-choice",
            text: "隠れる選択肢",
            condition: { param: "score", op: ">", value: 100 },
            ifUnmet: "hide",
            next: { type: "ending", ending: "fallback" },
          },
          {
            id: "disabled-choice",
            text: "無効になる選択肢",
            condition: { param: "resource", op: ">=", value: 10 },
            ifUnmet: "disable",
            unmetText: "資源が10以上必要です。",
            next: { type: "ending", ending: "fallback" },
          },
          {
            id: "nested-start",
            text: "入れ子の選択へ進む",
            effects: [
              { param: "score", op: "add", value: 3 },
              { flag: "unlocked", value: true },
            ],
            next: {
              type: "branch",
              branches: [
                {
                  when: { flag: "unlocked" },
                  then: {
                    type: "choices",
                    prompt: "入れ子の選択",
                    choices: [
                      {
                        id: "nested-continue",
                        text: "続ける",
                        effects: [
                          { param: "resource", op: "add", value: 2 },
                          { flag: "branchTaken", value: true },
                        ],
                        next: { type: "goto", scene: "finale" },
                      },
                    ],
                  },
                },
              ],
              else: { type: "goto", scene: "finale" },
            },
          },
          {
            id: "skip",
            text: "そのまま進む",
            next: { type: "goto", scene: "finale" },
          },
        ],
      },
    },
    {
      id: "finale",
      lines: [{ id: "finale-1", speaker: "narrator", text: "結果を判定します。" }],
      next: { type: "resolveEnding" },
    },
  ],
  endings: [
    {
      id: "success",
      title: "成功",
      condition: { flag: "branchTaken" },
      lines: [{ id: "success-1", speaker: "narrator", text: "成功しました。" }],
    },
    {
      id: "fallback",
      title: "通常終了",
      lines: [{ id: "fallback-1", speaker: "narrator", text: "終了しました。" }],
    },
  ],
};
