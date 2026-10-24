import { notFound } from "next/navigation";
import { BinLab } from "@/components/mascot/bin-lab";

export const metadata = { title: "Bin (dev)" };

/** Bin's lab: every mood, action and outfit, for screenshots and for trying the motion by hand. Development only. */
export default function DevBinPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BinLab />;
}
