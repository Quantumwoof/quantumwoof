// Allow importing server-only modules under bun:test
import { mock } from "bun:test";
mock.module("server-only", () => ({}));
