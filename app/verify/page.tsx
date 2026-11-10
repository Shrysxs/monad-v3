import { FileVerifier } from "@/components/verification/FileVerifier";
import { PageHeader } from "@/components/navigation/PageHeader";

export default function VerifyPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto py-2">
      <PageHeader
        title="Check a downloaded file"
        subtitle="Make sure a file is exactly what the publisher released: nothing changed, nothing added. Your file never leaves your computer."
      />
      <FileVerifier />
    </div>
  );
}
