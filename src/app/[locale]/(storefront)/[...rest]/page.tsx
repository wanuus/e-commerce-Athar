import { notFound } from "next/navigation";

/** Any unknown URL under a language prefix shows the friendly 404 inside the store layout. */
export default function CatchAll() {
  notFound();
}
