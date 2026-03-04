#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(process.cwd(), "locales");
const SOURCE_FILE = "en.json";

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function flatten(obj, prefix = "") {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            Object.assign(acc, flatten(value, newKey));
        } else {
            acc[newKey] = value;
        }

        return acc;
    }, {});
}

function extractPlaceholders(str) {
    if (typeof str !== "string") return [];
    return [...str.matchAll(/\{(.*?)\}/g)].map(match => match[1]).sort();
}

function compareLocales(source, target, localeName) {
    const errors = [];
    const warnings = [];

    const flatSource = flatten(source);
    const flatTarget = flatten(target);

    const sourceKeys = Object.keys(flatSource);
    const targetKeys = Object.keys(flatTarget);

    // Missing keys
    for (const key of sourceKeys) {
        if (!targetKeys.includes(key)) {
            errors.push(`❌ Missing key: ${key}`);
        }
    }

    // Extra keys
    for (const key of targetKeys) {
        if (!sourceKeys.includes(key)) {
            warnings.push(`⚠️ Extra key: ${key}`);
        }
    }

    // Type + placeholder checks
    for (const key of sourceKeys) {
        if (!flatTarget[key]) continue;

        const sourceVal = flatSource[key];
        const targetVal = flatTarget[key];

        if (typeof sourceVal !== typeof targetVal) {
            errors.push(`❌ Type mismatch at: ${key}`);
            continue;
        }

        if (typeof sourceVal === "string") {
            const sourcePH = extractPlaceholders(sourceVal);
            const targetPH = extractPlaceholders(targetVal);

            if (JSON.stringify(sourcePH) !== JSON.stringify(targetPH)) {
                errors.push(
                    `❌ Placeholder mismatch at: ${key} (expected: ${sourcePH.join(", ")})`
                );
            }
        }
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log(`✅ ${localeName} is valid`);
    } else {
        console.log(`\n🔎 Issues in ${localeName}:`);
        errors.forEach(e => console.log(e));
        warnings.forEach(w => console.log(w));
    }

    return errors.length === 0;
}

function main() {
    const sourcePath = path.join(LOCALES_DIR, SOURCE_FILE);
    const source = loadJson(sourcePath);

    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith(".json") && f !== SOURCE_FILE);

    let allValid = true;

    for (const file of files) {
        const targetPath = path.join(LOCALES_DIR, file);
        const target = loadJson(targetPath);

        const valid = compareLocales(source, target, file);
        if (!valid) allValid = false;
    }

    if (!allValid) {
        console.log("\nLocale verification failed.");
        process.exit(1);
    } else {
        console.log("\nAll locales are valid!");
    }
}

main();