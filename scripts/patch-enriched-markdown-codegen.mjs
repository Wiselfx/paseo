/**
 * Temporary local workaround for react-native-enriched-markdown.
 *
 * Upstream 652173994 added inline-code `fontScale` to the codegen source spec and native code
 * but not to the checked-in generated `Props.h` files. The package sets
 * `codegenConfig.includesGeneratedCode: true`, so consumers compile those checked-in files.
 * This script adds the field after the normal patch-package patches run.
 *
 * WHEN TO DELETE
 * This workaround is redundant when the installed package or the upstream patch already provides
 * `Float fontScale{0.0};` in both generated Code structs in both generated `Props.h` files.
 * `npm run check:patches` exits non-zero and the postinstall check prints a warning in that case.
 *
 * HOW TO DELETE
 * 1. Remove `checkEnrichedMarkdownCodegen` and `applyEnrichedMarkdownCodegenPatch` from
 *    `scripts/postinstall-patches.mjs`.
 * 2. Delete this file and `scripts/patch-enriched-markdown-codegen.test.mjs`.
 * 3. Remove the `check:patches` script from package.json and its CI step.
 * 4. Remove the temporary-patch note from `docs/development.md`.
 * 5. Run a clean `npm install`, then rerun the iOS unsigned build.
 *
 * Keep this file isolated from unrelated package patches so it can be deleted as one unit.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isMainModule } from "./is-main-module.mjs";

export const PACKAGE_RELATIVE_PATH = path.join(
  "packages",
  "app",
  "node_modules",
  "react-native-enriched-markdown",
);

export const GENERATED_PROPS_FILES = [
  path.join("ios", "generated", "ReactCodegen", "EnrichedMarkdownTextSpec", "Props.h"),
  path.join(
    "android",
    "generated",
    "jni",
    "react",
    "renderer",
    "components",
    "EnrichedMarkdownTextSpec",
    "Props.h",
  ),
];

const CODE_STRUCT_NAMES = [
  "EnrichedMarkdownMarkdownStyleCodeStruct",
  "EnrichedMarkdownTextMarkdownStyleCodeStruct",
];

const FONT_SIZE_FIELD = "  Float fontSize{0.0};";
const FONT_SCALE_FIELD = "  Float fontScale{0.0};";
const MARKER = "PASEO-LOCAL: inline-code fontScale workaround";
const MARKER_LINE = `  // ${MARKER}. See scripts/patch-enriched-markdown-codegen.mjs.`;

const FONT_SIZE_DYNAMIC = '    result["fontSize"] = fontSize;';
const FONT_SCALE_DYNAMIC = '    result["fontScale"] = fontScale;';

const FONT_SIZE_FROM_RAW_VALUE = [
  '  auto tmp_fontSize = map.find("fontSize");',
  "  if (tmp_fontSize != map.end()) {",
  "    fromRawValue(context, tmp_fontSize->second, result.fontSize);",
  "  }",
].join("\n");

const FONT_SCALE_FROM_RAW_VALUE = [
  '  auto tmp_fontScale = map.find("fontScale");',
  "  if (tmp_fontScale != map.end()) {",
  "    fromRawValue(context, tmp_fontScale->second, result.fontScale);",
  "  }",
].join("\n");

const REDUNDANT_MESSAGE = [
  "[paseo] react-native-enriched-markdown already provides generated-codegen inline fontScale.",
  "The temporary workaround in scripts/patch-enriched-markdown-codegen.mjs is redundant.",
  "",
  "Remove it:",
  "  1. Remove the check/apply calls from scripts/postinstall-patches.mjs.",
  "  2. Delete scripts/patch-enriched-markdown-codegen.mjs and its test.",
  "  3. Remove the check:patches script from package.json and its CI step.",
  "  4. Remove the temporary-patch note from docs/development.md.",
  "",
  "Then run a clean `npm install` and rerun the iOS unsigned build.",
].join("\n");

function findStructBlock(source, structName, filePath) {
  const start = source.indexOf(`struct ${structName} {`);
  if (start === -1) {
    throw new Error(`${filePath}: missing generated struct ${structName}`);
  }
  const nextStruct = source.indexOf("\nstruct ", start + 1);
  const end = nextStruct === -1 ? source.length : nextStruct;
  return { start, end, block: source.slice(start, end) };
}

function inspectFile(packageDir, relativePath) {
  const filePath = path.join(packageDir, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`[paseo] missing generated codegen file: ${filePath}`);
  }
  const source = readFileSync(filePath, "utf8");
  return {
    filePath,
    relativePath,
    structs: CODE_STRUCT_NAMES.map((name) => {
      const { block } = findStructBlock(source, name, filePath);
      return {
        name,
        hasField: block.includes(FONT_SCALE_FIELD),
        hasMarker: block.includes(MARKER),
      };
    }),
  };
}

/**
 * Classifies the generated codegen files without modifying them.
 *
 * `needed`      - neither our workaround nor upstream provides the field.
 * `applied`     - our workaround is present and marked.
 * `redundant`   - upstream or the base package already provides the field without our marker.
 * `inconsistent`- only part of the workaround is present; fail rather than guess.
 * `missing-package` - this checkout does not install the app dependency (e.g. server-only CI).
 */
export function inspectEnrichedMarkdownCodegen(root = process.cwd()) {
  const packageDir = path.join(root, PACKAGE_RELATIVE_PATH);
  if (!existsSync(packageDir)) {
    return { status: "missing-package", packageDir, files: [] };
  }

  const files = GENERATED_PROPS_FILES.map((relativePath) => inspectFile(packageDir, relativePath));
  const structs = files.flatMap((file) => file.structs);
  const allFields = structs.every((struct) => struct.hasField);
  const anyFields = structs.some((struct) => struct.hasField);
  const allMarkers = structs.every((struct) => struct.hasMarker);
  const anyMarkers = structs.some((struct) => struct.hasMarker);

  let status;
  if (allFields && allMarkers) {
    status = "applied";
  } else if (allFields && !anyMarkers) {
    status = "redundant";
  } else if (!anyFields && !anyMarkers) {
    status = "needed";
  } else {
    status = "inconsistent";
  }

  return { status, packageDir, files, structs };
}

function replaceOnce(source, needle, replacement, description) {
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(
      `[paseo] cannot patch enriched-markdown codegen: expected one ${description}, found ${count}`,
    );
  }
  return source.replace(needle, replacement);
}

function addWorkaroundToStruct(block, structName) {
  let patched = replaceOnce(
    block,
    `${FONT_SIZE_FIELD}\n`,
    `${FONT_SIZE_FIELD}\n${MARKER_LINE}\n${FONT_SCALE_FIELD}\n`,
    `${structName} fontSize field`,
  );
  patched = replaceOnce(
    patched,
    `${FONT_SIZE_DYNAMIC}\n`,
    `${FONT_SIZE_DYNAMIC}\n${FONT_SCALE_DYNAMIC}\n`,
    `${structName} font-size serialization`,
  );
  patched = replaceOnce(
    patched,
    `${FONT_SIZE_FROM_RAW_VALUE}\n`,
    `${FONT_SIZE_FROM_RAW_VALUE}\n${FONT_SCALE_FROM_RAW_VALUE}\n`,
    `${structName} font-size parsing`,
  );
  return patched;
}

function inconsistentMessage(state) {
  const details = state.structs
    .map((struct) => `${struct.name}: field=${struct.hasField} marker=${struct.hasMarker}`)
    .join("; ");
  return `[paseo] unexpected enriched-markdown codegen state (${details}). Restore node_modules with a clean npm install, then inspect scripts/patch-enriched-markdown-codegen.mjs.`;
}

/**
 * Applies the workaround only when it is needed. Returns one of the inspect statuses.
 * A `redundant` state is reported through `warn` and left untouched so it can be deleted.
 */
export function applyEnrichedMarkdownCodegenPatch({
  root = process.cwd(),
  warn = console.warn,
} = {}) {
  const before = inspectEnrichedMarkdownCodegen(root);

  if (before.status === "missing-package") {
    return before.status;
  }
  if (before.status === "inconsistent") {
    throw new Error(inconsistentMessage(before));
  }
  if (before.status === "redundant") {
    warn(REDUNDANT_MESSAGE);
    return before.status;
  }
  if (before.status === "applied") {
    return before.status;
  }

  const writes = [];
  for (const file of before.files) {
    let source = readFileSync(file.filePath, "utf8");
    for (const structName of CODE_STRUCT_NAMES) {
      const { start, end, block } = findStructBlock(source, structName, file.filePath);
      const patched = addWorkaroundToStruct(block, structName);
      source = source.slice(0, start) + patched + source.slice(end);
    }
    writes.push({ filePath: file.filePath, source });
  }

  for (const { filePath, source } of writes) {
    writeFileSync(filePath, source);
  }

  const after = inspectEnrichedMarkdownCodegen(root);
  if (after.status !== "applied") {
    throw new Error(
      `[paseo] failed to apply enriched-markdown codegen fontScale workaround (${after.status})`,
    );
  }
  return "applied";
}

/**
 * Startup check used by postinstall. Warns when the workaround has become redundant and fails
 * on inconsistent generated code. Callers that need a hard failure can pass `strict`.
 */
export function checkEnrichedMarkdownCodegen({
  root = process.cwd(),
  strict = false,
  warn = console.warn,
} = {}) {
  const state = inspectEnrichedMarkdownCodegen(root);

  if (state.status === "inconsistent") {
    throw new Error(inconsistentMessage(state));
  }
  if (state.status === "redundant") {
    warn(REDUNDANT_MESSAGE);
    if (strict) {
      throw new Error("Temporary enriched-markdown codegen fontScale patch is redundant");
    }
  }
  return state.status;
}

function runCli() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      "Usage: node scripts/patch-enriched-markdown-codegen.mjs [--check]\n\n" +
        "Without --check, applies the temporary generated-codegen fix when needed.\n" +
        "With --check, exits non-zero when the workaround is redundant or missing.",
    );
    return;
  }

  const checkOnly = process.argv.includes("--check");
  try {
    if (checkOnly) {
      const status = checkEnrichedMarkdownCodegen();
      if (status === "missing-package") {
        console.log(
          "[paseo] react-native-enriched-markdown is not installed; skipping patch check",
        );
      } else if (status === "needed") {
        console.error(
          "[paseo] react-native-enriched-markdown codegen workaround is not applied. Run npm install.",
        );
        process.exitCode = 1;
      } else if (status === "redundant") {
        process.exitCode = 1;
      } else if (status === "applied") {
        console.log("[paseo] temporary enriched-markdown codegen workaround is still required");
      }
      return;
    }

    const status = applyEnrichedMarkdownCodegenPatch();
    if (status === "applied") {
      console.log("[paseo] applied temporary enriched-markdown codegen fontScale workaround");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) {
  runCli();
}
