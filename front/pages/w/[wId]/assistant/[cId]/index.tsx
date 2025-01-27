import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import Conversation from "@app/components/assistant/conversation/Conversation";
import { ConversationTitle } from "@app/components/assistant/conversation/ConversationTitle";
import { GenerationContextProvider } from "@app/components/assistant/conversation/GenerationContextProvider";
import { FixedAssistantInputBar } from "@app/components/assistant/conversation/InputBar";
import { AssistantSidebarMenu } from "@app/components/assistant/conversation/SidebarMenu";
import AppLayout from "@app/components/sparkle/AppLayout";
import { Authenticator, getSession, getUserFromSession } from "@app/lib/auth";
import { useConversation } from "@app/lib/swr";
import { AgentMention, MentionType } from "@app/types/assistant/conversation";
import { UserType, WorkspaceType } from "@app/types/user";

const { URL = "", GA_TRACKING_ID = "" } = process.env;

export const getServerSideProps: GetServerSideProps<{
  user: UserType;
  owner: WorkspaceType;
  gaTrackingId: string;
  baseUrl: string;
  conversationId: string;
}> = async (context) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserFromSession(session);
  const auth = await Authenticator.fromSession(
    session,
    context.params?.wId as string
  );

  const owner = auth.workspace();
  if (!owner || !auth.isUser() || !user) {
    return {
      redirect: {
        destination: `/w/${context.query.wId}/join?cId=${context.query.cId}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      user,
      owner,
      baseUrl: URL,
      gaTrackingId: GA_TRACKING_ID,
      conversationId: context.params?.cId as string,
    },
  };
};

export default function AssistantConversation({
  user,
  owner,
  gaTrackingId,
  baseUrl,
  conversationId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [stickyMentions, setStickyMentions] = useState<AgentMention[]>([]);

  useEffect(() => {
    function handleNewConvoShortcut(event: KeyboardEvent) {
      // Check for Command on Mac or Ctrl on others
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key === "/") {
        void router.push(`/w/${owner.sId}/assistant/new`);
      }
    }

    window.addEventListener("keydown", handleNewConvoShortcut);
    return () => {
      window.removeEventListener("keydown", handleNewConvoShortcut);
    };
  }, [owner.sId, router]);

  const { conversation } = useConversation({
    conversationId,
    workspaceId: owner.sId,
  });

  const handleSubmit = async (input: string, mentions: MentionType[]) => {
    // Create a new user message.
    const mRes = await fetch(
      `/api/w/${owner.sId}/assistant/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: input,
          context: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            profilePictureUrl: user.image,
          },
          mentions,
        }),
      }
    );

    if (!mRes.ok) {
      const data = await mRes.json();
      window.alert(`Error creating message: ${data.error.message}`);
      return;
    }
  };

  const handdleDeleteConversation = async () => {
    const res = await fetch(
      `/api/w/${owner.sId}/assistant/conversations/${conversationId}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      const data = await res.json();
      window.alert(`Error deleting conversation: ${data.error.message}`);
      return;
    }

    await router.push(`/w/${owner.sId}/assistant/new`);
  };

  return (
    <GenerationContextProvider>
      <AppLayout
        user={user}
        owner={owner}
        isWideMode={true}
        pageTitle={
          conversation?.title
            ? `Dust - ${conversation?.title}`
            : `Dust - New Conversation`
        }
        gaTrackingId={gaTrackingId}
        topNavigationCurrent="assistant"
        titleChildren={
          conversation && (
            <ConversationTitle
              owner={owner}
              conversation={conversation}
              shareLink={`${baseUrl}/w/${owner.sId}/assistant/${conversationId}`}
              onDelete={() => {
                void handdleDeleteConversation();
              }}
            />
          )
        }
        navChildren={
          <AssistantSidebarMenu owner={owner} triggerInputAnimation={null} />
        }
      >
        <Conversation
          owner={owner}
          user={user}
          conversationId={conversationId}
          onStickyMentionsChange={setStickyMentions}
        />
        <div className="hidden h-48 lg:block" />
        <FixedAssistantInputBar
          owner={owner}
          onSubmit={handleSubmit}
          stickyMentions={stickyMentions}
          conversationId={conversationId}
        />
      </AppLayout>
    </GenerationContextProvider>
  );
}
