import { redirect } from "next/navigation";

// The risk report is now part of the result on the "Check a file" page.
export default function RiskPage() {
  redirect("/verify");
}
