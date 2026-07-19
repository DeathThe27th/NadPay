import { describe, expect, it } from "vitest";
import { getAddress, parseEther } from "viem";
import { csvTotal, parseRecipientsCsv, SAMPLE_CSV } from "./csv";

const A = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const B = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

describe("parseRecipientsCsv", () => {
  it("parses plain address,amount rows", () => {
    const { rows, errors } = parseRecipientsCsv(`${A},1.5\n${B},2`);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { address: A, amount: "1.5" },
      { address: B, amount: "2" },
    ]);
  });

  it("skips an optional header row", () => {
    const { rows, errors } = parseRecipientsCsv(`address,amount\n${A},1`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("parses the shipped sample file", () => {
    const { rows, errors } = parseRecipientsCsv(SAMPLE_CSV);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
  });

  it("accepts semicolon and tab separators and quoted cells", () => {
    const { rows, errors } = parseRecipientsCsv(`"${A}";1\n${B}\t2`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it("ignores blank lines and windows newlines", () => {
    const { rows, errors } = parseRecipientsCsv(`\r\n${A},1\r\n\r\n${B},2\r\n`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  it("does not treat header-like lines after the first as headers", () => {
    const { rows, errors } = parseRecipientsCsv(
      `address,amount\nnot-an-address,2\n${A},1`,
    );
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      'Line 2: "not-an-address" is not a valid wallet address',
    ]);
  });

  it("reports invalid addresses with line numbers", () => {
    const { rows, errors } = parseRecipientsCsv(`${A},1\nnot-an-address,2`);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      'Line 2: "not-an-address" is not a valid wallet address',
    ]);
  });

  it("reports zero, negative, and malformed amounts", () => {
    const { errors } = parseRecipientsCsv(`${A},0\n${B},abc`);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("greater than 0");
    expect(errors[1]).toContain("not a valid MON amount");
  });

  it("reports duplicate addresses case-insensitively", () => {
    const { rows, errors } = parseRecipientsCsv(`${A},1\n${getAddress(A)},2`);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("duplicate address");
  });

  it("reports rows with missing columns", () => {
    const { errors } = parseRecipientsCsv(`${A}`);
    expect(errors[0]).toContain("expected two columns");
  });

  it("flags an empty or header-only input", () => {
    expect(parseRecipientsCsv("").errors).toHaveLength(1);
    expect(parseRecipientsCsv("address,amount\n").errors).toHaveLength(1);
  });
});

describe("csvTotal", () => {
  it("sums amounts in wei", () => {
    expect(
      csvTotal([
        { address: A, amount: "1.5" },
        { address: B, amount: "0.5" },
      ]),
    ).toBe(parseEther("2"));
  });
});
