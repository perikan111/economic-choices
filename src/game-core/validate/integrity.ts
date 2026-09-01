import type { Condition, Effect, Line, Next, Scenario } from "../types/scenario";

function duplicateErrors(ids: string[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  ids.forEach((id) => {
    if (seen.has(id)) errors.push(`${path}: ID "${id}" が重複しています。`);
    seen.add(id);
  });
}

export function validateIntegrity(scenario: Scenario, errors: string[], warnings: string[]): void {
  const sceneIds = new Set(scenario.scenes.map((scene) => scene.id));
  const endingIds = new Set(scenario.endings.map((ending) => ending.id));
  const parameterIds = new Set(scenario.parameters.map((parameter) => parameter.id));
  const characterIds = new Set(scenario.characters.map((character) => character.id));
  const flagIds = new Set(Object.keys(scenario.initialState.flags));

  duplicateErrors(scenario.scenes.map((scene) => scene.id), "scenes", errors);
  duplicateErrors(scenario.endings.map((ending) => ending.id), "endings", errors);
  duplicateErrors(scenario.parameters.map((parameter) => parameter.id), "parameters", errors);
  duplicateErrors(scenario.characters.map((character) => character.id), "characters", errors);

  if (!sceneIds.has(scenario.initialState.startScene)) {
    errors.push(`initialState.startScene: 未定義のシーン "${scenario.initialState.startScene}" を参照しています。`);
  }
  for (const id of parameterIds) {
    if (!(id in scenario.initialState.params)) errors.push(`initialState.params.${id}: 初期値がありません。`);
  }
  for (const id of Object.keys(scenario.initialState.params)) {
    if (!parameterIds.has(id)) errors.push(`initialState.params.${id}: 未定義のパラメータです。`);
  }
  scenario.parameters.forEach((parameter) => {
    const value = scenario.initialState.params[parameter.id];
    if (value === undefined) return;
    if (parameter.min !== undefined && value < parameter.min) {
      errors.push(`initialState.params.${parameter.id}: 初期値 ${value} が最小値 ${parameter.min} を下回っています。`);
    }
    if (parameter.max !== undefined && value > parameter.max) {
      errors.push(`initialState.params.${parameter.id}: 初期値 ${value} が最大値 ${parameter.max} を上回っています。`);
    }
  });

  const walkCondition = (condition: Condition, path: string): void => {
    if ("param" in condition && !parameterIds.has(condition.param)) {
      errors.push(`${path}.param: 未定義のパラメータ "${condition.param}" を参照しています。`);
    } else if ("flag" in condition && !flagIds.has(condition.flag)) {
      errors.push(`${path}.flag: 未定義のフラグ "${condition.flag}" を参照しています。`);
    } else if ("visited" in condition && !sceneIds.has(condition.visited)) {
      errors.push(`${path}.visited: 未定義のシーン "${condition.visited}" を参照しています。`);
    } else if ("all" in condition) {
      condition.all.forEach((item, index) => walkCondition(item, `${path}.all[${index}]`));
    } else if ("any" in condition) {
      condition.any.forEach((item, index) => walkCondition(item, `${path}.any[${index}]`));
    } else if ("not" in condition) {
      walkCondition(condition.not, `${path}.not`);
    }
  };

  const walkEffects = (effects: Effect[] | undefined, path: string): void => {
    effects?.forEach((effect, index) => {
      if ("param" in effect && !parameterIds.has(effect.param)) {
        errors.push(`${path}[${index}].param: 未定義のパラメータ "${effect.param}" を参照しています。`);
      } else if ("flag" in effect && !flagIds.has(effect.flag)) {
        errors.push(`${path}[${index}].flag: 未定義のフラグ "${effect.flag}" を参照しています。`);
      }
    });
  };

  const walkLine = (line: Line, path: string): void => {
    if (!characterIds.has(line.speaker)) {
      errors.push(`${path}.speaker: 未定義の話者 "${line.speaker}" を参照しています。`);
    }
    if (line.condition) walkCondition(line.condition, `${path}.condition`);
    for (const match of line.text.matchAll(/\{\{param\.([A-Za-z0-9_-]+)\}\}/g)) {
      if (!parameterIds.has(match[1])) {
        errors.push(`${path}.text: 未定義のパラメータ "${match[1]}" を埋め込んでいます。`);
      }
    }
  };

  const walkNext = (next: Next, path: string): void => {
    if (next.type === "goto") {
      if (!sceneIds.has(next.scene)) errors.push(`${path}.scene: 未定義のシーン "${next.scene}" を参照しています。`);
    } else if (next.type === "ending") {
      if (!endingIds.has(next.ending)) errors.push(`${path}.ending: 未定義のエンディング "${next.ending}" を参照しています。`);
    } else if (next.type === "branch") {
      next.branches.forEach((branch, index) => {
        walkCondition(branch.when, `${path}.branches[${index}].when`);
        walkNext(branch.then, `${path}.branches[${index}].then`);
      });
      walkNext(next.else, `${path}.else`);
    } else if (next.type === "choices") {
      duplicateErrors(next.choices.map((choice) => choice.id), `${path}.choices`, errors);
      if (!next.choices.some((choice) => choice.condition === undefined)) {
        errors.push(`${path}.choices: 条件なしの選択肢が最低1つ必要です。`);
      }
      next.choices.forEach((choice, index) => {
        const choicePath = `${path}.choices[${index}]`;
        if (choice.condition) walkCondition(choice.condition, `${choicePath}.condition`);
        walkEffects(choice.effects, `${choicePath}.effects`);
        walkNext(choice.next, `${choicePath}.next`);
      });
    }
  };

  scenario.scenes.forEach((scene, sceneIndex) => {
    duplicateErrors(
      scene.lines.flatMap((line) => line.id === undefined ? [] : [line.id]),
      `scenes[${sceneIndex}].lines`,
      errors,
    );
    scene.lines.forEach((line, lineIndex) => walkLine(line, `scenes[${sceneIndex}].lines[${lineIndex}]`));
    walkEffects(scene.onEnter, `scenes[${sceneIndex}].onEnter`);
    walkNext(scene.next, `scenes[${sceneIndex}].next`);
  });
  scenario.endings.forEach((ending, endingIndex) => {
    ending.lines.forEach((line, lineIndex) => walkLine(line, `endings[${endingIndex}].lines[${lineIndex}]`));
    if (ending.condition) walkCondition(ending.condition, `endings[${endingIndex}].condition`);
    walkEffects(ending.effects, `endings[${endingIndex}].effects`);
  });

  if (scenario.endings.at(-1)?.condition) {
    errors.push("endings: 最後のエンディングは条件なしのフォールバックにしてください。");
  }
  scenario.endings.slice(0, -1).forEach((ending, endingIndex) => {
    if (!ending.condition) {
      errors.push(
        `endings[${endingIndex}]: 条件なしのエンディングの後ろに到達不能なエンディングがあります。条件なしは最後だけにしてください。`,
      );
    }
  });

  const outgoingScenes = (next: Next): string[] => {
    if (next.type === "goto") return [next.scene];
    if (next.type === "choices") return next.choices.flatMap((choice) => outgoingScenes(choice.next));
    if (next.type === "branch") return [
      ...next.branches.flatMap((branch) => outgoingScenes(branch.then)),
      ...outgoingScenes(next.else),
    ];
    return [];
  };
  const reachable = new Set<string>();
  const queue = [scenario.initialState.startScene];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id) || !sceneIds.has(id)) continue;
    reachable.add(id);
    const scene = scenario.scenes.find((candidate) => candidate.id === id)!;
    queue.push(...outgoingScenes(scene.next));
  }
  scenario.scenes.forEach((scene) => {
    if (!reachable.has(scene.id)) warnings.push(`scenes.${scene.id}: 開始地点から到達できません。`);
  });

  const memo = new Map<string, boolean>();
  const sceneEnds = (sceneId: string, visiting: Set<string>): boolean => {
    if (memo.has(sceneId)) return memo.get(sceneId)!;
    if (visiting.has(sceneId)) return false;
    const scene = scenario.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) return false;
    const nextVisiting = new Set(visiting).add(sceneId);
    const nextEnds = (next: Next): boolean => {
      if (next.type === "ending" || next.type === "resolveEnding") return true;
      if (next.type === "goto") return sceneEnds(next.scene, nextVisiting);
      if (next.type === "choices") return next.choices.every((choice) => nextEnds(choice.next));
      return next.branches.every((branch) => nextEnds(branch.then)) && nextEnds(next.else);
    };
    const result = nextEnds(scene.next);
    memo.set(sceneId, result);
    return result;
  };
  if (sceneIds.has(scenario.initialState.startScene) && !sceneEnds(scenario.initialState.startScene, new Set())) {
    warnings.push("scenes: エンディングに到達しない経路またはループが存在する可能性があります。");
  }
}
