import {
  Button,
  ChevronUpDownIcon,
  PageHeader,
  SectionHeader,
} from "@dust-tt/sparkle";
import { Listbox } from "@headlessui/react";
import { UsersIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/20/solid";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import React, { useCallback, useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import AppLayout from "@app/components/sparkle/AppLayout";
import { subNavigationAdmin } from "@app/components/sparkle/navigation";
import { Authenticator, getSession, getUserFromSession } from "@app/lib/auth";
import { useMembers, useWorkspaceInvitations } from "@app/lib/swr";
import { classNames, isEmailValid } from "@app/lib/utils";
import { UserType, WorkspaceType } from "@app/types/user";

const { GA_TRACKING_ID = "", URL = "" } = process.env;

export const getServerSideProps: GetServerSideProps<{
  user: UserType | null;
  owner: WorkspaceType;
  gaTrackingId: string;
  url: string;
}> = async (context) => {
  const session = await getSession(context.req, context.res);
  const user = await getUserFromSession(session);
  const auth = await Authenticator.fromSession(
    session,
    context.params?.wId as string
  );

  const owner = auth.workspace();
  if (!owner || !auth.isAdmin()) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user,
      owner,
      gaTrackingId: GA_TRACKING_ID,
      url: URL,
    },
  };
};

export default function WorkspaceAdmin({
  user,
  owner,
  gaTrackingId,
  url,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { mutate } = useSWRConfig();

  const [disable, setDisabled] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [allowedDomain, setAllowedDomain] = useState(owner.allowedDomain);
  const [allowedDomainError, setAllowedDomainError] = useState("");

  const inviteLink =
    owner.allowedDomain !== null ? `${url}/w/${owner.sId}/join` : null;

  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { members, isMembersLoading } = useMembers(owner);
  const { invitations, isInvitationsLoading } = useWorkspaceInvitations(owner);

  const formValidation = useCallback(() => {
    let valid = true;
    if (allowedDomain === null) {
      setAllowedDomainError("");
    } else {
      // eslint-disable-next-line no-useless-escape
      if (!allowedDomain.match(/^[a-z0-9\.\-]+$/)) {
        setAllowedDomainError("Allowed domain must be a valid domain name.");
        valid = false;
      } else {
        setAllowedDomainError("");
      }
    }

    return valid;
  }, [allowedDomain, owner.allowedDomain, owner.name]);

  useEffect(() => {
    setDisabled(!formValidation());
  }, [allowedDomain, formValidation]);

  const handleUpdateWorkspace = async () => {
    setUpdating(true);
    const res = await fetch(`/api/w/${owner.sId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowedDomain: allowedDomain,
      }),
    });
    if (!res.ok) {
      window.alert("Failed to update workspace.");
      setUpdating(false);
    } else {
      // We perform a full refresh so that the Workspace name updates and we get a fresh owner
      // object so that the formValidation logic keeps working.
      window.location.reload();
    }
  };

  const handleSendInvitation = async () => {
    setIsSending(true);
    const res = await fetch(`/api/w/${owner.sId}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inviteEmail,
      }),
    });
    if (!res.ok) {
      window.alert("Failed to invite new member to workspace.");
    } else {
      await mutate(`/api/w/${owner.sId}/invitations`);
    }
    setIsSending(false);
    setInviteEmail("");
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    const res = await fetch(`/api/w/${owner.sId}/invitations/${invitationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "revoked",
      }),
    });
    if (!res.ok) {
      window.alert("Failed to revoke member's invitation.");
    } else {
      await mutate(`/api/w/${owner.sId}/invitations`);
    }
  };

  const handleMemberRoleChange = async (member: UserType, role: string) => {
    const res = await fetch(`/api/w/${owner.sId}/members/${member.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
      }),
    });
    if (!res.ok) {
      window.alert("Failed to update membership.");
    } else {
      await mutate(`/api/w/${owner.sId}/members`);
    }
  };

  return (
    <AppLayout
      user={user}
      owner={owner}
      gaTrackingId={gaTrackingId}
      topNavigationCurrent="settings"
      subNavigation={subNavigationAdmin({ owner, current: "members" })}
    >
      <PageHeader
        title="Member Management"
        icon={UsersIcon}
        description="Invite and remove members, manage their rights."
      />

      <SectionHeader
        title="Invitation Link"
        description="Allow any person with the right email domain name (@company.com) to signup and join your workspace."
      />

      <div className="flex flex-col">
        <div className="space-y-8 pt-8">
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <div className="flex justify-between">
                <label
                  htmlFor="appName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Whitelisted e-mail domain
                </label>
                <div className="text-sm font-normal text-gray-400">
                  optional
                </div>
              </div>
            </div>
            <div className="sm:col-span-3">
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="alowedDomain"
                  id="allowedDomain"
                  className={classNames(
                    "block w-full min-w-0 flex-1 rounded-md text-sm",
                    allowedDomainError
                      ? "border-gray-300 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-action-500 focus:ring-action-500"
                  )}
                  value={allowedDomain || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 0) {
                      setAllowedDomain(e.target.value);
                    } else {
                      setAllowedDomain(null);
                    }
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Allow any user with an e-mail from the specified domain to join
                this workspace.
              </p>
              {inviteLink ? (
                <div className="mt-2">
                  <div className="flex justify-between">
                    <span className="block text-sm font-medium text-gray-700">
                      Invite link:{" "}
                      <a className="ml-1 text-action-600" href={inviteLink}>
                        {inviteLink}
                      </a>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex max-w-full flex-row">
            <div className="flex flex-1"></div>
            <div className="flex">
              <Button
                variant="secondary"
                disabled={disable || updating}
                onClick={handleUpdateWorkspace}
                label={updating ? "Updating..." : "Update"}
              />
            </div>
          </div>
        </div>

        <SectionHeader
          title="Members"
          description="Manage active members and invitations to your workspace."
        />
        <div className="mt-6 space-y-4 pb-8">
          <div className="grid grid-cols-1 grid-cols-6 gap-x-4">
            <div className="col-span-6">
              <label
                htmlFor="appName"
                className="block text-sm font-medium text-gray-700"
              >
                Invite by e-mail
              </label>
            </div>
            <div className="col-span-4">
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="inviteEmail"
                  id="inviteEmail"
                  className={classNames(
                    "block w-full min-w-0 flex-1 rounded-md text-sm",
                    allowedDomainError
                      ? "border-gray-300 border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-action-500 focus:ring-action-500"
                  )}
                  value={inviteEmail || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 0) {
                      setInviteEmail(e.target.value.trim());
                    } else {
                      setInviteEmail("");
                    }
                  }}
                />
              </div>
            </div>
            <div className="col-span-2">
              <div className="mt-1 flex flex-row">
                <div className="flex flex-1"></div>
                <div className="mt-0.5 flex">
                  <Button
                    variant="secondary"
                    disabled={
                      !inviteEmail || !isEmailValid(inviteEmail) || isSending
                    }
                    onClick={handleSendInvitation}
                    label={isSending ? "Sending" : "Send"}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-5">
            <div className="sm:col-span-5">
              <div className="block text-sm font-medium text-gray-800">
                {invitations.length} Invitation
                {invitations.length !== 1 && "s"} and {members.length} Member
                {members.length !== 1 && "s"}:
                {isMembersLoading || isInvitationsLoading ? (
                  <span className="ml-2 text-xs text-gray-400">loading...</span>
                ) : null}
              </div>
              <ul className="ml-2 mt-4 space-y-2">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="mt-2 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="">
                        <div className="text-sm font-medium text-gray-500">
                          {invitation.inviteEmail}
                        </div>
                        <div className="flex-cols flex text-sm italic text-gray-400">
                          pending
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      <Button
                        variant="tertiary"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        label="Revoke"
                        size="xs"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <ul className="ml-2 mt-6 space-y-2">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="mt-2 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="">
                        <div className="text-sm font-medium text-gray-700">
                          {member.name}{" "}
                          {member.id === user?.id ? (
                            <span className="ml-1 rounded-sm bg-gray-200 px-1 py-0.5 text-xs font-bold text-gray-900">
                              you
                            </span>
                          ) : null}
                        </div>
                        {member.provider === "google" ? (
                          <div className="flex-cols flex text-sm text-gray-500">
                            <div className="mr-1 mt-0.5 flex h-4 w-4 flex-initial">
                              <img src="/static/google_white_32x32.png"></img>
                            </div>
                            <div className="flex flex-1">{member.email}</div>
                          </div>
                        ) : null}
                        {member.provider === "github" ? (
                          <div className="flex-cols flex text-sm text-gray-500">
                            <div className="mr-1 mt-0.5 flex h-4 w-4 flex-initial">
                              <img src="/static/github_black_32x32.png"></img>
                            </div>
                            <div className="flex flex-1">{member.username}</div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="w-28 flex-shrink-0 text-sm text-gray-500">
                      {member.id !== user?.id && (
                        <Listbox
                          value={member.workspaces[0].role}
                          onChange={async (role) => {
                            await handleMemberRoleChange(member, role);
                          }}
                        >
                          {() => (
                            <>
                              <div className="relative">
                                <Listbox.Button className="relative w-full cursor-default cursor-pointer rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-sm leading-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-1">
                                  <span className="block truncate">
                                    {member.workspaces[0].role === "none"
                                      ? "revoked"
                                      : member.workspaces[0].role}
                                  </span>
                                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronUpDownIcon
                                      className="h-5 w-5 text-gray-400"
                                      aria-hidden="true"
                                    />
                                  </span>
                                </Listbox.Button>

                                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-sm ring-1 ring-black ring-opacity-5 focus:outline-none">
                                  {["admin", "builder", "user", "revoked"].map(
                                    (role) => (
                                      <Listbox.Option
                                        key={role}
                                        className={({ active }) =>
                                          classNames(
                                            active
                                              ? "cursor-pointer font-semibold"
                                              : "",
                                            "text-gray-900",
                                            "relative cursor-default select-none py-1 pl-3 pr-9"
                                          )
                                        }
                                        value={role}
                                      >
                                        {({ selected }) => (
                                          <>
                                            <span
                                              className={classNames(
                                                selected ? "font-semibold" : "",
                                                "block truncate"
                                              )}
                                            >
                                              {role}
                                            </span>

                                            {selected ? (
                                              <span
                                                className={classNames(
                                                  "text-action-600",
                                                  "absolute inset-y-0 right-0 flex items-center pr-4"
                                                )}
                                              >
                                                <CheckIcon
                                                  className="h-4 w-4"
                                                  aria-hidden="true"
                                                />
                                              </span>
                                            ) : null}
                                          </>
                                        )}
                                      </Listbox.Option>
                                    )
                                  )}
                                </Listbox.Options>
                              </div>
                            </>
                          )}
                        </Listbox>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
