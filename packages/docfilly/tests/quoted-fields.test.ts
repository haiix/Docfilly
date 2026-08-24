import { describe, expect, it } from "vitest";
import {
  decodeField,
  encodeField,
  findFirstOutsideQuotes,
  splitOutsideQuotes,
} from "../src/quoted-fields";

describe("quoted field syntax", () => {
  it.each([
    ["name = value", "=", { ok: true, value: 5 }],
    ['name | "label = detail" = value', "=", { ok: true, value: 24 }],
    ['name = "escaped ""="" value"', "=", { ok: true, value: 5 }],
    ["name without delimiter", "=", { ok: true, value: -1 }],
    ['name = "unclosed', "=", { ok: false }],
  ])("finds delimiters outside quotes in %j", (value, delimiter, expected) => {
    expect(findFirstOutsideQuotes(value, delimiter)).toEqual(expected);
  });

  it("retains only the first delimiter while validating the complete value", () => {
    const value = `name ${"=".repeat(20_000)} value`;

    expect(findFirstOutsideQuotes(value, "=")).toEqual({ ok: true, value: 5 });
    expect(findFirstOutsideQuotes(`${value}"unclosed`, "=")).toEqual({ ok: false });
  });

  it.each([
    ["one,two", { ok: true, value: ["one", "two"] }],
    ['"one,two",three', { ok: true, value: ['"one,two"', "three"] }],
    ['"one,""two""",three', { ok: true, value: ['"one,""two"""', "three"] }],
    ['one,"unclosed', { ok: false }],
  ])("splits only at delimiters outside quotes in %j", (value, expected) => {
    expect(splitOutsideQuotes(value, ",")).toEqual(expected);
  });

  it.each([
    [" plain ", { ok: true, value: "plain" }],
    [' " spaced " ', { ok: true, value: " spaced " }],
    ['"a ""quoted"" value"', { ok: true, value: 'a "quoted" value' }],
    ['"closed" trailing', { ok: false }],
    ['unquoted "quote"', { ok: false }],
    ['"unclosed', { ok: false }],
  ])("decodes and validates %j", (value, expected) => {
    expect(decodeField(value)).toEqual(expected);
  });

  it.each([
    ["plain", ',|="', false, "plain"],
    [" leading", ',|="', false, '" leading"'],
    ["a,b|c=d", ',|="', false, '"a,b|c=d"'],
    ['a "quote"', ',|="', false, '"a ""quote"""'],
    ["control-like", ',|="', true, '"control-like"'],
  ])("encodes %j using delimiter set %j", (value, delimiters, forceQuotes, expected) => {
    expect(encodeField(value, delimiters, forceQuotes)).toBe(expected);
    expect(decodeField(expected)).toEqual({ ok: true, value });
  });
});
