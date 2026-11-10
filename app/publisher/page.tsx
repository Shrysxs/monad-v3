import { PublisherPortal } from "@/components/publisher/PublisherPortal";
import { PageHeader } from "@/components/navigation/PageHeader";

export default function PublisherPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <PageHeader
        title="For publishers"
        subtitle="Sign your releases so people can check they're genuine, and withdraw a release if something goes wrong."
      />
      <PublisherPortal />
    </div>
  );
}
