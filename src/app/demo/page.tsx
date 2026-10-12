import { getPlans } from "@/lib/plans";
import { getPrintSettings } from "@/lib/labels/print";
import { DemoApp } from "./demo-app";

export default async function DemoPage() {
  const [plans, print] = await Promise.all([getPlans(), getPrintSettings()]);
  return <DemoApp plans={plans} printOnPack={print.printOnPack} />;
}
