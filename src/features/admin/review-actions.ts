"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { audit, back, requireStaff } from "./guard";
import { str } from "./form";

export async function approveReview(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = str(fd, "reviewId");
  await prisma.review.update({ where: { id }, data: { approved: true } });
  await audit(actor, "review.approve", "Review", id);
  revalidatePath("/", "layout");
  return back("/admin/reviews", "ok", "saved");
}

export async function deleteReview(fd: FormData): Promise<void> {
  const actor = await requireStaff();
  const id = str(fd, "reviewId");
  await prisma.review.delete({ where: { id } });
  await audit(actor, "review.delete", "Review", id);
  revalidatePath("/", "layout");
  return back("/admin/reviews", "ok", "deleted");
}
