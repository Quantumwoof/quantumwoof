import { describe, expect, test } from "bun:test";
import {
  READY_TOPIC_COUNT,
  SNIFFER_THRESHOLD,
  countOpenWoofed,
  readyTopics,
  schoolTopics,
} from "./woofSchool";

describe("Woof School topic counts", () => {
  test("denominator is the open topics, not the sniff-later stubs", () => {
    expect(READY_TOPIC_COUNT).toBe(readyTopics().length);
    expect(READY_TOPIC_COUNT).toBeLessThan(schoolTopics.length);
    expect(READY_TOPIC_COUNT).toBe(9);
  });

  test("certificate needs every open topic: reads 9 of 9", () => {
    expect(SNIFFER_THRESHOLD).toBe(READY_TOPIC_COUNT);
  });

  test("countOpenWoofed ignores stubs, unknown slugs and duplicates", () => {
    const open = readyTopics().map((t) => t.slug);
    const later = schoolTopics.filter((t) => t.status === "later").map((t) => t.slug);
    expect(countOpenWoofed(open)).toBe(READY_TOPIC_COUNT);
    expect(countOpenWoofed([...open, ...later, "nope", open[0]!])).toBe(READY_TOPIC_COUNT);
    expect(countOpenWoofed([])).toBe(0);
  });
});
