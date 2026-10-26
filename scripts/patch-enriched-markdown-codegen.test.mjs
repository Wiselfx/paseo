import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  applyEnrichedMarkdownCodegenPatch,
  GENERATED_PROPS_FILES,
  inspectEnrichedMarkdownCodegen,
  PACKAGE_RELATIVE_PATH,
} from "./patch-enriched-markdown-codegen.mjs";

const CODE_STRUCT_NAMES = [
  "EnrichedMarkdownMarkdownStyleCodeStruct",
  "EnrichedMarkdownTextMarkdownStyleCodeStruct",
];

function codeStruct(name, { field = false, marker = false } = {}) {
  return `struct ${name} {
  std::string fontFamily{};
  Float fontSize{0.0};
${marker ? "  // PASEO-LOCAL: inline-code fontScale workaround. See scripts/patch-enriched-markdown-codegen.mjs.\n" : ""}${field ? "  Float fontScale{0.0};\n" : ""}  SharedColor color{};
  SharedColor backgroundColor{};
  SharedColor borderColor{};


#ifdef RN_SERIALIZABLE_STATE
  bool operator==(const ${name}&) const = default;

  folly::dynamic toDynamic() const {
    folly::dynamic result = folly::dynamic::object();
    result["fontFamily"] = fontFamily;
    result["fontSize"] = fontSize;
${field ? '    result["fontScale"] = fontScale;\n' : ""}    result["color"] = ::facebook::react::toDynamic(color);
    result["backgroundColor"] = ::facebook::react::toDynamic(backgroundColor);
    result["borderColor"] = ::facebook::react::toDynamic(borderColor);
    return result;
  }
#endif
};

static inline void fromRawValue(const PropsParserContext& context, const RawValue &value, ${name} &result) {
  auto map = (std::unordered_map<std::string, RawValue>)value;

  auto tmp_fontFamily = map.find("fontFamily");
  if (tmp_fontFamily != map.end()) {
    fromRawValue(context, tmp_fontFamily->second, result.fontFamily);
  }
  auto tmp_fontSize = map.find("fontSize");
  if (tmp_fontSize != map.end()) {
    fromRawValue(context, tmp_fontSize->second, result.fontSize);
  }
${field ? '  auto tmp_fontScale = map.find("fontScale");\n  if (tmp_fontScale != map.end()) {\n    fromRawValue(context, tmp_fontScale->second, result.fontScale);\n  }\n' : ""}  auto tmp_color = map.find("color");
  if (tmp_color != map.end()) {
    fromRawValue(context, tmp_color->second, result.color);
  }
}

`;
}

function createFixture({ fields = [false, false], markers = [false, false] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "enriched-markdown-codegen-"));
  const packageDir = path.join(root, PACKAGE_RELATIVE_PATH);
  const body = CODE_STRUCT_NAMES.map((name, index) =>
    codeStruct(name, { field: fields[index], marker: markers[index] }),
  ).join("");
  for (const relativePath of GENERATED_PROPS_FILES) {
    const filePath = path.join(packageDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, body);
  }
  return root;
}

function readGeneratedFiles(root) {
  return GENERATED_PROPS_FILES.map((relativePath) =>
    readFileSync(path.join(root, PACKAGE_RELATIVE_PATH, relativePath), "utf8"),
  );
}

test("applies the workaround to both structs in both generated headers", () => {
  const root = createFixture();
  try {
    assert.equal(inspectEnrichedMarkdownCodegen(root).status, "needed");
    assert.equal(applyEnrichedMarkdownCodegenPatch({ root, warn() {} }), "applied");

    const state = inspectEnrichedMarkdownCodegen(root);
    assert.equal(state.status, "applied");
    for (const source of readGeneratedFiles(root)) {
      assert.equal(source.match(/Float fontScale\{0\.0\};/g)?.length, 2);
      assert.equal(source.match(/PASEO-LOCAL: inline-code fontScale workaround/g)?.length, 2);
      assert.equal(source.match(/auto tmp_fontScale = map\.find\("fontScale"\);/g)?.length, 2);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("is a no-op once our marker is present", () => {
  const root = createFixture();
  try {
    assert.equal(applyEnrichedMarkdownCodegenPatch({ root, warn() {} }), "applied");
    const before = readGeneratedFiles(root);
    assert.equal(applyEnrichedMarkdownCodegenPatch({ root, warn() {} }), "applied");
    assert.deepEqual(readGeneratedFiles(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports redundant and leaves upstream-provided fields untouched", () => {
  const root = createFixture({ fields: [true, true] });
  try {
    const before = readGeneratedFiles(root);
    const warnings = [];
    assert.equal(inspectEnrichedMarkdownCodegen(root).status, "redundant");
    assert.equal(
      applyEnrichedMarkdownCodegenPatch({ root, warn: (message) => warnings.push(message) }),
      "redundant",
    );
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /already provides generated-codegen inline fontScale/);
    assert.deepEqual(readGeneratedFiles(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports inconsistent when only part of the workaround is present", () => {
  const root = createFixture({ fields: [true, false] });
  try {
    assert.equal(inspectEnrichedMarkdownCodegen(root).status, "inconsistent");
    assert.throws(
      () => applyEnrichedMarkdownCodegenPatch({ root, warn() {} }),
      /unexpected enriched-markdown codegen state/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("skips checkouts that do not install the app dependency", () => {
  const root = mkdtempSync(path.join(tmpdir(), "enriched-markdown-codegen-missing-"));
  try {
    assert.equal(inspectEnrichedMarkdownCodegen(root).status, "missing-package");
    assert.equal(applyEnrichedMarkdownCodegenPatch({ root, warn() {} }), "missing-package");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
