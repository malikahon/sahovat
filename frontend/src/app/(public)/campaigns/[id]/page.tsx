export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground">Campaign Detail</h1>
      <p className="mt-4 text-muted-foreground">Campaign ID: {id}</p>
    </div>
  );
}
