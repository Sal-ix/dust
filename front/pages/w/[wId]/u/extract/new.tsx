import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import React from "react";

import { ExtractEventSchemaForm } from "@app/components/use/EventSchemaForm";
import { Authenticator, getSession, getUserFromSession } from "@app/lib/auth";
import { UserType, WorkspaceType } from "@app/types/user";

const { GA_TRACKING_ID = "" } = process.env;
export const getServerSideProps: GetServerSideProps<{
  user: UserType | null;
  owner: WorkspaceType;
  readOnly: boolean;
  gaTrackingId: string;
}> = async (context) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserFromSession(session);
  const auth = await Authenticator.fromSession(
    session,
    context.params?.wId as string
  );
  const owner = auth.workspace();
  if (!owner || !auth.isBuilder()) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user,
      owner,
      readOnly: !auth.isBuilder(),
      gaTrackingId: GA_TRACKING_ID,
    },
  };
};

export default function AppExtractEventsCreate({
  user,
  owner,
  readOnly,
  gaTrackingId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ExtractEventSchemaForm
      user={user}
      owner={owner}
      readOnly={readOnly}
      gaTrackingId={gaTrackingId}
    />
  );
}