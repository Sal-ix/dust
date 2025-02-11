import { Avatar, Button, DropdownMenu } from "@dust-tt/sparkle";
import { ReactionIcon } from "@dust-tt/sparkle";
import { Emoji, EmojiMartData } from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { ComponentType, MouseEventHandler, useEffect, useState } from "react";
import React from "react";
import { mutate } from "swr";

import { classNames } from "@app/lib/utils";
import { MessageReactionType } from "@app/types/assistant/conversation";
import { UserType, WorkspaceType } from "@app/types/user";

const MAX_MORE_REACTIONS_TO_SHOW = 9;

/**
 * Parent component for both UserMessage and AgentMessage, to ensure avatar,
 * side buttons and spacing are consistent between the two
 */
export function ConversationMessage({
  owner,
  user,
  conversationId,
  messageId,
  children,
  name,
  pictureUrl,
  buttons,
  reactions,
  avatarBusy = false,
  // avatarBackgroundColor,
  enableEmojis = true,
}: {
  owner: WorkspaceType;
  user: UserType;
  conversationId: string;
  messageId: string;
  children?: React.ReactNode;
  name: string | null;
  pictureUrl?: string | React.ReactNode | null;
  buttons?: {
    label: string;
    icon: ComponentType;
    onClick: MouseEventHandler<HTMLButtonElement>;
  }[];
  reactions: MessageReactionType[];
  avatarBusy?: boolean;
  avatarBackgroundColor?: string;
  enableEmojis: boolean;
}) {
  const [emojiData, setEmojiData] = useState<EmojiMartData | null>(null);

  useEffect(() => {
    async function loadEmojiData() {
      const mod = await import("@emoji-mart/data");
      const data: EmojiMartData = mod.default as EmojiMartData;
      setEmojiData(data);
    }

    void loadEmojiData();
  }, []);

  const handleEmoji = async ({
    emoji,
    isToRemove,
  }: {
    emoji: string;
    isToRemove: boolean;
  }) => {
    const res = await fetch(
      `/api/w/${owner.sId}/assistant/conversations/${conversationId}/messages/${messageId}/reactions`,
      {
        method: isToRemove ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reaction: emoji,
        }),
      }
    );
    if (res.ok) {
      await mutate(
        `/api/w/${owner.sId}/assistant/conversations/${conversationId}/reactions`
      );
    }
  };

  const handleEmojiClick = async (emojiCode: string) => {
    const reaction = reactions.find((r) => r.emoji === emojiCode);
    const hasReacted =
      (reaction &&
        reaction.users.find((u) => u.userId === user.id) !== undefined) ||
      false;
    await handleEmoji({
      emoji: emojiCode,
      isToRemove: hasReacted,
    });
  };

  // Extracting some of the emoji logic from the render function to make it more readable
  const reactionUp = reactions.find((r) => r.emoji === "+1");
  const hasReactedUp =
    reactionUp?.users.some((u) => u.userId === user.id) ?? false;

  const reactionDown = reactions.find((r) => r.emoji === "-1");
  const hasReactedDown =
    reactionDown?.users.some((u) => u.userId === user.id) ?? false;

  let otherReactions = reactions.filter(
    (r) => r.emoji !== "+1" && r.emoji !== "-1"
  );
  let hasMoreReactions = null;
  if (otherReactions.length > MAX_MORE_REACTIONS_TO_SHOW) {
    hasMoreReactions = otherReactions.length - MAX_MORE_REACTIONS_TO_SHOW;
    otherReactions = otherReactions.slice(0, MAX_MORE_REACTIONS_TO_SHOW);
  }

  return (
    <>
      {/* SMALL SIZE SCREEN*/}
      <div className="flex w-full gap-4 xl:hidden">
        <div className="flex w-full flex-grow flex-col gap-4">
          <div className="flex items-start gap-2">
            <div className="flex h-8 flex-grow items-center gap-2">
              <Avatar
                visual={pictureUrl}
                name={name || undefined}
                size="xs"
                busy={avatarBusy}
                // backgroundColor={avatarBackgroundColor}
              />
              <div className="flex-grow text-sm font-medium">{name}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* COPY / RETRY */}
              <div className="flex gap-1">
                {buttons && (
                  <>
                    {buttons.map((button, i) => (
                      <Button
                        key={`message-${messageId}-button-${i}`}
                        variant="tertiary"
                        size="xs"
                        label={button.label}
                        labelVisible={false}
                        icon={button.icon}
                        onClick={button.onClick}
                      />
                    ))}
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenu.Button>
                    <Button
                      variant="tertiary"
                      size="xs"
                      icon={ReactionIcon}
                      labelVisible={false}
                      label=" "
                      type="menu"
                    />
                  </DropdownMenu.Button>
                  <DropdownMenu.Items width={280} origin="topRight">
                    <Picker
                      theme="light"
                      previewPosition="none"
                      data={emojiData}
                      onEmojiSelect={async (emojiData: Emoji) => {
                        const reaction = reactions.find(
                          (r) => r.emoji === emojiData.id
                        );
                        const hasReacted =
                          (reaction &&
                            reaction.users.find((u) => u.userId === user.id) !==
                              undefined) ||
                          false;
                        await handleEmoji({
                          emoji: emojiData.id,
                          isToRemove: hasReacted,
                        });
                      }}
                    />
                  </DropdownMenu.Items>
                </DropdownMenu>
              </div>
              {/* EMOJIS */}
              {enableEmojis && (
                <div className="flex flex-wrap gap-3">
                  <ButtonEmoji
                    variant={hasReactedUp ? "selected" : "unselected"}
                    emoji="👍"
                    count={reactionUp ? reactionUp.users.length.toString() : ""}
                    onClick={async () => await handleEmojiClick("+1")}
                  />
                  <ButtonEmoji
                    variant={hasReactedDown ? "selected" : "unselected"}
                    emoji="👎"
                    count={
                      reactionDown ? reactionDown.users.length.toString() : ""
                    }
                    onClick={async () => await handleEmojiClick("-1")}
                  />
                  {otherReactions.map((reaction) => {
                    const hasReacted = reaction.users.some(
                      (u) => u.userId === user.id
                    );
                    const emoji = emojiData?.emojis[reaction.emoji];
                    const nativeEmoji = emoji?.skins[0].native;
                    if (!nativeEmoji) {
                      return null;
                    }
                    return (
                      <ButtonEmoji
                        key={reaction.emoji}
                        variant={hasReactedDown ? "selected" : "unselected"}
                        emoji={nativeEmoji}
                        count={reaction.users.length.toString()}
                        onClick={async () =>
                          await handleEmoji({
                            emoji: reaction.emoji,
                            isToRemove: hasReacted,
                          })
                        }
                      />
                    );
                  })}
                  {hasMoreReactions && (
                    <span className="text-xs">+{hasMoreReactions}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 break-words pl-8 text-base font-normal">
            {children}
          </div>
        </div>
      </div>

      {/* BIG SIZE SCREEN*/}
      <div className="flex hidden w-full gap-4 xl:flex">
        {/* COLUMN 1: AVATAR - in small size if small layout */}
        <Avatar
          visual={pictureUrl}
          name={name || undefined}
          size="md"
          busy={avatarBusy}
        />

        {/* COLUMN 2: CONTENT
         * min-w-0 prevents the content from overflowing the container
         */}
        <div className="flex min-w-0 flex-grow flex-col gap-4">
          <div className="text-sm font-medium">{name}</div>
          <div className="min-w-0 break-words text-base font-normal">
            {children}
          </div>
        </div>

        {/* COLUMN 3: BUTTONS */}
        <div className="w-16 overflow-visible">
          <div className="w-32">
            {/* COPY / RETRY */}
            {buttons && (
              <div className="mb-6 flex flex-wrap gap-1">
                {buttons.map((button, i) => (
                  <Button
                    key={`message-${messageId}-button-${i}`}
                    variant="tertiary"
                    size="xs"
                    label={button.label}
                    labelVisible={false}
                    icon={button.icon}
                    onClick={button.onClick}
                  />
                ))}
              </div>
            )}

            {/* EMOJIS */}

            {enableEmojis && (
              <div className="flex flex-wrap gap-3 pl-2">
                <ButtonEmoji
                  variant={hasReactedUp ? "selected" : "unselected"}
                  emoji="👍"
                  count={reactionUp ? reactionUp.users.length.toString() : ""}
                  onClick={async () => await handleEmojiClick("+1")}
                />
                <ButtonEmoji
                  variant={hasReactedDown ? "selected" : "unselected"}
                  emoji="👎"
                  count={
                    reactionDown ? reactionDown.users.length.toString() : ""
                  }
                  onClick={async () => await handleEmojiClick("-1")}
                />
                {otherReactions.map((reaction) => {
                  const hasReacted = reaction.users.some(
                    (u) => u.userId === user.id
                  );
                  const emoji = emojiData?.emojis[reaction.emoji];
                  const nativeEmoji = emoji?.skins[0].native;
                  if (!nativeEmoji) {
                    return null;
                  }
                  return (
                    <ButtonEmoji
                      key={reaction.emoji}
                      variant={hasReactedDown ? "selected" : "unselected"}
                      emoji={nativeEmoji}
                      count={reaction.users.length.toString()}
                      onClick={async () =>
                        await handleEmoji({
                          emoji: reaction.emoji,
                          isToRemove: hasReacted,
                        })
                      }
                    />
                  );
                })}
                {hasMoreReactions && (
                  <span className="text-xs">+{hasMoreReactions}</span>
                )}
              </div>
            )}
            {enableEmojis && (
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenu.Button>
                    <Button
                      variant="tertiary"
                      size="xs"
                      icon={ReactionIcon}
                      labelVisible={false}
                      label="Add another emoji"
                      type="menu"
                    />
                  </DropdownMenu.Button>
                  <DropdownMenu.Items width={280}>
                    <Picker
                      theme="light"
                      previewPosition="none"
                      data={emojiData}
                      onEmojiSelect={async (emojiData: Emoji) => {
                        const reaction = reactions.find(
                          (r) => r.emoji === emojiData.id
                        );
                        const hasReacted =
                          (reaction &&
                            reaction.users.find((u) => u.userId === user.id) !==
                              undefined) ||
                          false;
                        await handleEmoji({
                          emoji: emojiData.id,
                          isToRemove: hasReacted,
                        });
                      }}
                    />
                  </DropdownMenu.Items>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface ButtonEmojiProps {
  variant?: "selected" | "unselected";
  count?: string;
  emoji?: string;
  onClick?: () => void;
}

export function ButtonEmoji({
  variant,
  emoji,
  count,
  onClick,
}: ButtonEmojiProps) {
  return (
    <div
      className={classNames(
        variant ? "text-action-500" : "text-element-800",
        "flex cursor-pointer items-center gap-1.5 text-base font-medium transition-all duration-300 hover:text-action-400 active:text-action-600"
      )}
      onClick={onClick}
    >
      {emoji}
      {count && <span className="text-xs">{count}</span>}
    </div>
  );
}
