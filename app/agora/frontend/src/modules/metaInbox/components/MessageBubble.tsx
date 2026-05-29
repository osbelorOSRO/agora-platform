import React from "react";
import type { MetaInboxMessage } from "@/types/metaInbox";
import { extractMedia, formatRelativeTs } from "../utils";
import { s } from "../styles";

interface Props {
  msg: MetaInboxMessage;
}

export const MessageBubble: React.FC<Props> = ({ msg }) => {
  const outgoing = msg.direction === "OUTGOING";
  const media = extractMedia(msg.contentJson);

  return (
    <div className={outgoing ? s.bubbleWrapOutgoing : s.bubbleWrapIncoming}>
      <div className={outgoing ? s.bubbleOutgoing : s.bubbleIncoming}>
        {media?.mediaType === "image" && (
          <img
            src={media.mediaUrl}
            alt="imagen adjunta"
            loading="lazy"
            className="max-w-[220px] rounded-md border border-border mb-1"
          />
        )}
        {media?.mediaType === "audio" && (
          <audio controls src={media.mediaUrl} className="max-w-[220px] mb-1">
            Tu navegador no soporta audio.
          </audio>
        )}
        <div>
          {msg.contentText && msg.contentText !== "[audio]" && msg.contentText !== "[imagen]"
            ? msg.contentText
            : !media
              ? "(mensaje sin texto)"
              : null}
        </div>
        <div className={outgoing ? s.bubbleTsOutgoing : s.bubbleTsIncoming}>
          {formatRelativeTs(msg.occurredAt)}
        </div>
      </div>
    </div>
  );
};
