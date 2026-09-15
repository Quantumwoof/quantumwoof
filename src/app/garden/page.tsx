import { redirect } from "next/navigation";

/** Thin alias so /garden does not 404 — home is the garden. */
export default function GardenAliasPage() {
  redirect("/");
}
