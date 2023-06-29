import { getTemporalClient } from "@app/post_upsert_hooks/temporal/lib";
import { newUpsertSignal } from "@app/post_upsert_hooks/temporal/signals";
import { runPostUpsertHooksWorkflow } from "@app/post_upsert_hooks/temporal/workflows";

export async function launchRunPostUpsertHooksWorkflow(
  dataSourceName: string,
  workspaceId: string,
  documentId: string
) {
  const client = await getTemporalClient();

  await client.workflow.signalWithStart(runPostUpsertHooksWorkflow, {
    args: [dataSourceName, workspaceId, documentId],
    taskQueue: "post-upsert-hooks-queue",
    workflowId: `workflow-run-post-upsert-hooks-${workspaceId}-${dataSourceName}-${documentId}`,
    signal: newUpsertSignal,
    signalArgs: undefined,
  });
}