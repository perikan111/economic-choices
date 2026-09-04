import { describe, expect, test } from "vitest";
import { type Next, type Scenario, validateScenario } from "@/game-core";
import { engineScenario } from "../fixtures/engineScenario";

function cloneFixture(): Scenario {
  return JSON.parse(JSON.stringify(engineScenario)) as Scenario;
}

function expectInvalid(scenario: unknown, messagePart: string): void {
  const result = validateScenario(scenario);
  expect(result.ok).toBe(false);
  expect(result.errors.some((error) => error.includes(messagePart)), result.errors.join("\n")).toBe(true);
}

function rootChoices(scenario: Scenario): Extract<Next, { type: "choices" }> {
  const next = scenario.scenes.find((scene) => scene.id === "decision")?.next;
  if (next?.type !== "choices") throw new Error("fixtureのroot choicesが見つかりません。");
  return next;
}

function nestedBranch(scenario: Scenario): Extract<Next, { type: "branch" }> {
  const next = rootChoices(scenario).choices.find((choice) => choice.id === "nested-start")?.next;
  if (next?.type !== "branch") throw new Error("fixtureのnested branchが見つかりません。");
  return next;
}

describe("scenario integrity validator", () => {
  test("roleのないengine fixtureも有効", () => {
    expect(validateScenario(engineScenario)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  test("存在しないgoto先を拒否する", () => {
    const scenario = cloneFixture();
    scenario.scenes[0].next = { type: "goto", scene: "missing-scene" };
    expectInvalid(scenario, "未定義のシーン");
  });

  test("未定義parameter参照を拒否する", () => {
    const scenario = cloneFixture();
    rootChoices(scenario).choices[0].condition = { param: "missing-param", op: ">", value: 0 };
    expectInvalid(scenario, "未定義のパラメータ");
  });

  test("未定義flag参照を拒否する", () => {
    const scenario = cloneFixture();
    nestedBranch(scenario).branches[0].when = { flag: "missing-flag" };
    expectInvalid(scenario, "未定義のフラグ");
  });

  test("ID重複を拒否する", () => {
    const scenario = cloneFixture();
    scenario.scenes[1].id = scenario.scenes[0].id;
    expectInvalid(scenario, "ID \"intro\" が重複");
  });

  test("branchのelse欠落を拒否する", () => {
    const scenario = cloneFixture();
    delete (nestedBranch(scenario) as { else?: Next }).else;
    expectInvalid(scenario, ".else: 必須");
  });

  test("choicesに無条件選択肢がない場合を拒否する", () => {
    const scenario = cloneFixture();
    rootChoices(scenario).choices.forEach((choice) => {
      choice.condition = { param: "score", op: ">=", value: 0 };
    });
    expectInvalid(scenario, "条件なしの選択肢が最低1つ必要");
  });

  test("最後のendingにconditionがある場合を拒否する", () => {
    const scenario = cloneFixture();
    scenario.endings.at(-1)!.condition = { flag: "unlocked" };
    expectInvalid(scenario, "最後のエンディングは条件なし");
  });

  test("同一scene内のline ID重複を拒否する", () => {
    const scenario = cloneFixture();
    scenario.scenes[0].lines[1].id = scenario.scenes[0].lines[0].id;
    expectInvalid(scenario, "scenes[0].lines: ID \"intro-1\" が重複");
  });

  test("characterの未定義defaultExpressionを拒否する", () => {
    const scenario = cloneFixture();
    scenario.characters[0].defaultExpression = "missing";
    scenario.characters[0].expressions = { neutral: "fixture/neutral.png" };
    expectInvalid(scenario, "defaultExpression");
  });

  test("lineの未定義expressionを拒否する", () => {
    const scenario = cloneFixture();
    scenario.scenes[0].lines[0].expression = "missing";
    expectInvalid(scenario, ".expression");
  });

  test("途中の無条件endingによる後続endingの遮蔽を拒否する", () => {
    const scenario = cloneFixture();
    scenario.endings.splice(1, 0, {
      id: "shadowing-ending",
      title: "遮蔽する終了",
      lines: [{ id: "shadowing-1", speaker: "narrator", text: "ここで終了します。" }],
    });
    expectInvalid(scenario, "条件なしのエンディングの後ろに到達不能");
  });

  test.each([
    ["最小値", -1, "最小値 0 を下回って"],
    ["最大値", 21, "最大値 20 を上回って"],
  ])("initialStateが%sを外れる場合を拒否する", (_label, value, messagePart) => {
    const scenario = cloneFixture();
    scenario.initialState.params.score = value;
    expectInvalid(scenario, messagePart);
  });
});
