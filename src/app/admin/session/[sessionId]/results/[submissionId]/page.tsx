import { notFound } from "next/navigation";
import { ProjectReport } from "@/components/admin/ProjectReport";
import { mockProjectReports } from "@/lib/mock-data";

interface Props {
  params: Promise<{ sessionId: string; submissionId: string }>;
}

export default async function ProjectReportPage({ params }: Props) {
  const { submissionId } = await params;
  const report = mockProjectReports[submissionId];

  if (!report) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ProjectReport report={report} />
    </div>
  );
}
