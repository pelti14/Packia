import { getPlans } from "@/lib/plans";
import { DemoApp } from "./demo-app";

export default async function DemoPage() {
  const plans = await getPlans();
  return <DemoApp plans={plans} />;
}
