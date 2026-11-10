import { VariantComparator } from "@/components/release-dna/VariantComparator";
import { PageHeader } from "@/components/navigation/PageHeader";

export default function CompareFilesPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto py-2">
      <PageHeader
        title="Compare two files"
        subtitle="Have two downloads with the same name? Find out whether they're identical, different versions, or if one is a fake."
      />
      <VariantComparator />
    </div>
  );
}
