import type { Condition, Effect, Next, Scenario } from "../types/scenario";

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(object: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (typeof object[key] !== "string") errors.push(`${path}.${key}: 文字列が必要です。`);
}

function optionalString(object: UnknownRecord, key: string, path: string, errors: string[]): void {
  if (object[key] !== undefined && typeof object[key] !== "string") {
    errors.push(`${path}.${key}: 文字列が必要です。`);
  }
}

function optionalStringRecord(object: UnknownRecord, key: string, path: string, errors: string[]): void {
  const value = object[key];
  if (value === undefined) return;
  if (!isRecord(value)) {
    errors.push(`${path}.${key}: 文字列を値に持つオブジェクトが必要です。`);
    return;
  }
  Object.entries(value).forEach(([entryKey, entryValue]) => {
    if (typeof entryValue !== "string") {
      errors.push(`${path}.${key}.${entryKey}: 文字列が必要です。`);
    }
  });
}

function validateCondition(value: unknown, path: string, errors: string[], depth = 0): value is Condition {
  if (depth > 64 || !isRecord(value)) {
    errors.push(`${path}: 正しい条件オブジェクトが必要です。`);
    return false;
  }
  if (typeof value.param === "string") {
    if (!["==", "!=", "<", "<=", ">", ">="].includes(String(value.op))) {
      errors.push(`${path}.op: 比較演算子が不正です。`);
    }
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      errors.push(`${path}.value: 有限の数値が必要です。`);
    }
    return true;
  }
  if (typeof value.flag === "string") {
    if (value.value !== undefined && typeof value.value !== "boolean") {
      errors.push(`${path}.value: boolean が必要です。`);
    }
    return true;
  }
  if (typeof value.visited === "string") return true;
  if (Array.isArray(value.all)) {
    value.all.forEach((item, index) => validateCondition(item, `${path}.all[${index}]`, errors, depth + 1));
    return true;
  }
  if (Array.isArray(value.any)) {
    value.any.forEach((item, index) => validateCondition(item, `${path}.any[${index}]`, errors, depth + 1));
    return true;
  }
  if (value.not !== undefined) {
    validateCondition(value.not, `${path}.not`, errors, depth + 1);
    return true;
  }
  errors.push(`${path}: param / flag / visited / all / any / not のいずれかが必要です。`);
  return false;
}

function validateEffect(value: unknown, path: string, errors: string[]): value is Effect {
  if (!isRecord(value)) {
    errors.push(`${path}: 正しい効果オブジェクトが必要です。`);
    return false;
  }
  if (typeof value.param === "string") {
    if (!["add", "mul", "set"].includes(String(value.op))) {
      errors.push(`${path}.op: 効果演算子が不正です。`);
    }
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      errors.push(`${path}.value: 有限の数値が必要です。`);
    }
    return true;
  }
  if (typeof value.flag === "string") {
    if (value.value !== undefined && typeof value.value !== "boolean") {
      errors.push(`${path}.value: boolean が必要です。`);
    }
    return true;
  }
  errors.push(`${path}: param または flag が必要です。`);
  return false;
}

function validateEffects(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${path}: 配列が必要です。`);
    return;
  }
  value.forEach((effect, index) => validateEffect(effect, `${path}[${index}]`, errors));
}

function validateLine(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: 正しい台詞オブジェクトが必要です。`);
    return;
  }
  requiredString(value, "speaker", path, errors);
  requiredString(value, "text", path, errors);
  optionalString(value, "id", path, errors);
  optionalString(value, "voiceText", path, errors);
  optionalString(value, "expression", path, errors);
  if (value.condition !== undefined) validateCondition(value.condition, `${path}.condition`, errors);
}

function validateLines(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: 配列が必要です。`);
    return;
  }
  value.forEach((line, index) => validateLine(line, `${path}[${index}]`, errors));
}

function validateNext(value: unknown, path: string, errors: string[], depth = 0): value is Next {
  if (depth > 64 || !isRecord(value) || typeof value.type !== "string") {
    errors.push(`${path}: 正しい next オブジェクトが必要です。`);
    return false;
  }
  switch (value.type) {
    case "goto":
      requiredString(value, "scene", path, errors);
      return true;
    case "choices":
      optionalString(value, "prompt", path, errors);
      if (!Array.isArray(value.choices)) {
        errors.push(`${path}.choices: 配列が必要です。`);
        return false;
      }
      value.choices.forEach((choice, index) => {
        const choicePath = `${path}.choices[${index}]`;
        if (!isRecord(choice)) {
          errors.push(`${choicePath}: 正しい選択肢オブジェクトが必要です。`);
          return;
        }
        requiredString(choice, "id", choicePath, errors);
        requiredString(choice, "text", choicePath, errors);
        optionalString(choice, "description", choicePath, errors);
        optionalString(choice, "unmetText", choicePath, errors);
        if (choice.ifUnmet !== undefined && !["hide", "disable"].includes(String(choice.ifUnmet))) {
          errors.push(`${choicePath}.ifUnmet: hide または disable が必要です。`);
        }
        if (choice.condition !== undefined) validateCondition(choice.condition, `${choicePath}.condition`, errors);
        validateEffects(choice.effects, `${choicePath}.effects`, errors);
        validateNext(choice.next, `${choicePath}.next`, errors, depth + 1);
      });
      return true;
    case "branch":
      if (!Array.isArray(value.branches)) {
        errors.push(`${path}.branches: 配列が必要です。`);
      } else {
        value.branches.forEach((branch, index) => {
          const branchPath = `${path}.branches[${index}]`;
          if (!isRecord(branch)) {
            errors.push(`${branchPath}: 正しい分岐オブジェクトが必要です。`);
            return;
          }
          validateCondition(branch.when, `${branchPath}.when`, errors);
          validateNext(branch.then, `${branchPath}.then`, errors, depth + 1);
        });
      }
      if (value.else === undefined) errors.push(`${path}.else: 必須です。`);
      else validateNext(value.else, `${path}.else`, errors, depth + 1);
      return true;
    case "ending":
      requiredString(value, "ending", path, errors);
      return true;
    case "resolveEnding":
      return true;
    default:
      errors.push(`${path}.type: 未対応の遷移種別 "${value.type}" です。`);
      return false;
  }
}

export function validateStructure(raw: unknown, errors: string[]): raw is Scenario {
  if (!isRecord(raw)) {
    errors.push("$: オブジェクトが必要です。");
    return false;
  }
  if (raw.formatVersion !== 1) errors.push("formatVersion: 1 が必要です。");

  if (!isRecord(raw.meta)) errors.push("meta: オブジェクトが必要です。");
  else {
    requiredString(raw.meta, "id", "meta", errors);
    requiredString(raw.meta, "title", "meta", errors);
    requiredString(raw.meta, "version", "meta", errors);
    optionalString(raw.meta, "locale", "meta", errors);
    optionalString(raw.meta, "author", "meta", errors);
    optionalString(raw.meta, "summary", "meta", errors);
    if (typeof raw.meta.id === "string" && !/^[a-z0-9-]+$/.test(raw.meta.id)) {
      errors.push("meta.id: [a-z0-9-]+ の形式が必要です。");
    }
  }

  if (!Array.isArray(raw.characters)) errors.push("characters: 配列が必要です。");
  else raw.characters.forEach((character, index) => {
    const path = `characters[${index}]`;
    if (!isRecord(character)) errors.push(`${path}: オブジェクトが必要です。`);
    else {
      requiredString(character, "id", path, errors);
      requiredString(character, "name", path, errors);
      optionalString(character, "role", path, errors);
      optionalString(character, "color", path, errors);
      optionalString(character, "portrait", path, errors);
      optionalString(character, "defaultExpression", path, errors);
      optionalStringRecord(character, "expressions", path, errors);
    }
  });

  if (!Array.isArray(raw.parameters)) errors.push("parameters: 配列が必要です。");
  else raw.parameters.forEach((parameter, index) => {
    const path = `parameters[${index}]`;
    if (!isRecord(parameter)) errors.push(`${path}: オブジェクトが必要です。`);
    else {
      requiredString(parameter, "id", path, errors);
      requiredString(parameter, "label", path, errors);
      for (const key of ["min", "max"] as const) {
        if (parameter[key] !== undefined && typeof parameter[key] !== "number") {
          errors.push(`${path}.${key}: 数値が必要です。`);
        }
      }
      if (parameter.integer !== undefined && typeof parameter.integer !== "boolean") {
        errors.push(`${path}.integer: boolean が必要です。`);
      }
    }
  });

  if (!isRecord(raw.initialState)) errors.push("initialState: オブジェクトが必要です。");
  else {
    requiredString(raw.initialState, "startScene", "initialState", errors);
    if (!isRecord(raw.initialState.params)) errors.push("initialState.params: オブジェクトが必要です。");
    else Object.entries(raw.initialState.params).forEach(([key, value]) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`initialState.params.${key}: 有限の数値が必要です。`);
      }
    });
    if (!isRecord(raw.initialState.flags)) errors.push("initialState.flags: オブジェクトが必要です。");
    else Object.entries(raw.initialState.flags).forEach(([key, value]) => {
      if (typeof value !== "boolean") errors.push(`initialState.flags.${key}: boolean が必要です。`);
    });
  }

  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) errors.push("scenes: 1件以上の配列が必要です。");
  else raw.scenes.forEach((scene, index) => {
    const path = `scenes[${index}]`;
    if (!isRecord(scene)) {
      errors.push(`${path}: オブジェクトが必要です。`);
      return;
    }
    requiredString(scene, "id", path, errors);
    validateLines(scene.lines, `${path}.lines`, errors);
    validateEffects(scene.onEnter, `${path}.onEnter`, errors);
    validateNext(scene.next, `${path}.next`, errors);
  });

  if (!Array.isArray(raw.endings) || raw.endings.length === 0) errors.push("endings: 1件以上の配列が必要です。");
  else raw.endings.forEach((ending, index) => {
    const path = `endings[${index}]`;
    if (!isRecord(ending)) {
      errors.push(`${path}: オブジェクトが必要です。`);
      return;
    }
    requiredString(ending, "id", path, errors);
    requiredString(ending, "title", path, errors);
    optionalString(ending, "rank", path, errors);
    optionalString(ending, "summary", path, errors);
    validateLines(ending.lines, `${path}.lines`, errors);
    validateEffects(ending.effects, `${path}.effects`, errors);
    if (ending.condition !== undefined) validateCondition(ending.condition, `${path}.condition`, errors);
  });

  return errors.length === 0;
}
