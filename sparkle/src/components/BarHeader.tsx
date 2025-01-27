import React from "react";

import {
  ArrowUpOnSquare,
  ChevronLeft,
  Trash,
  XMark,
} from "@sparkle/icons/solid";
import { classNames } from "@sparkle/lib/utils";

import { Button } from "./Button";

interface BarHeaderProps {
  title: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
}

export function BarHeader({
  title,
  leftActions,
  rightActions,
  className = "",
}: BarHeaderProps) {
  const titleClasses =
    "s-text-base s-font-bold s-truncate s-text-element-800 s-grow";
  const buttonBarClasses = "s-flex s-gap-1";

  return (
    <div
      className={classNames(
        "s-fixed s-left-0 s-right-0 s-top-0 s-z-30 s-flex s-h-16 s-flex-row s-items-center s-gap-3 s-border-b s-border-structure-300/30 s-bg-white/80 s-px-4 s-backdrop-blur",
        className
      )}
    >
      {leftActions && <div className={buttonBarClasses}>{leftActions}</div>}
      <div className={titleClasses}>{title}</div>
      {rightActions && <div className={buttonBarClasses}>{rightActions}</div>}
    </div>
  );
}

type BarHeaderButtonBarCloseProps = {
  variant: "close";
  onClose?: () => void;
};

type BarHeaderButtonBarBackProps = {
  variant: "back";
  onBack?: () => void;
};

type BarHeaderButtonBarValidateProps = {
  variant: "validate";
  onCancel?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
};

type BarHeaderButtonBarConversationProps = {
  variant: "conversation";
  onDelete?: () => void;
  onShare?: () => void;
};

export type BarHeaderButtonBarProps =
  | BarHeaderButtonBarCloseProps
  | BarHeaderButtonBarBackProps
  | BarHeaderButtonBarValidateProps
  | BarHeaderButtonBarConversationProps;

BarHeader.ButtonBar = function (props: BarHeaderButtonBarProps) {
  switch (props.variant) {
    case "back":
      return (
        <Button
          size="sm"
          icon={ChevronLeft}
          variant="tertiary"
          label="Back"
          tooltipPosition="below"
          labelVisible={false}
          onClick={props.onBack}
        />
      );
    case "close":
      return (
        <Button
          size="sm"
          icon={XMark}
          variant="tertiary"
          label="Close"
          tooltipPosition="below"
          labelVisible={false}
          onClick={props.onClose}
        />
      );
    case "validate":
      return (
        <>
          <Button
            size="sm"
            label="Cancel"
            variant="secondaryWarning"
            onClick={props.onCancel}
            disabled={!props.onCancel || props.isSaving}
          />
          <Button
            size="sm"
            label={props.isSaving ? "Saving" : "Save"}
            variant="primary"
            onClick={props.onSave}
            disabled={!props.onSave || props.isSaving}
          />
        </>
      );
    case "conversation":
      return (
        <>
          <Button
            size="sm"
            label="Delete"
            icon={Trash}
            variant="secondaryWarning"
            labelVisible={false}
            tooltipPosition="below"
            onClick={props.onDelete}
          />
          <Button
            size="sm"
            label="Share"
            icon={ArrowUpOnSquare}
            variant="secondary"
            onClick={props.onShare}
          />
        </>
      );
    default:
      return null;
  }
};
