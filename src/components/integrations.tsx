"use client";

import { useActionState } from "react";
import { regenerateFeedAction, revokeFeedAction, unlinkDiscordAction } from "@/app/actions/integrations";
import { idle } from "@/app/actions/form-state";
import { FormMessage, SubmitButton } from "./form";

export function DiscordPanel({ username, configured }: { username: string | null; configured: boolean }) {
  const [state, unlink] = useActionState(unlinkDiscordAction, idle);
  return (
    <div className="flex flex-col gap-2">
      <FormMessage state={state} />
      {username ? (
        <form action={unlink} className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Linked as <strong>{username}</strong>. Other members see this on your profile.
          </span>
          <SubmitButton variant="secondary" size="sm">
            Unlink
          </SubmitButton>
        </form>
      ) : configured ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Show your Discord username on your profile.</span>
          {/* Full navigation: the route redirects to Discord. */}
          <a href="/api/discord/connect" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg">
            Link Discord
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted">Discord linking hasn&apos;t been configured by the site administrator.</p>
      )}
    </div>
  );
}

export function FeedPanel({ active }: { active: boolean }) {
  const [genState, generate] = useActionState(regenerateFeedAction, idle);
  const [revState, revoke] = useActionState(revokeFeedAction, idle);
  const url = genState.code === "FEED_URL" ? genState.message : null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Subscribe to your games&apos; and teams&apos; schedules from Google Calendar, Outlook or Apple Calendar. The link is private: anyone with it can
        see your calendar.
      </p>
      {url && (
        <div className="flex flex-col gap-1">
          <label htmlFor="feed-url" className="text-sm font-medium">
            Your calendar link (copy it now; it won&apos;t be shown again)
          </label>
          <input id="feed-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs" />
        </div>
      )}
      {revState.status === "success" && !url && <FormMessage state={revState} />}
      <div className="flex flex-wrap gap-2">
        <form action={generate}>
          <SubmitButton variant={active ? "secondary" : "primary"} size="sm">
            {active ? "Create a new link" : "Create calendar link"}
          </SubmitButton>
        </form>
        {active && (
          <form action={revoke}>
            <SubmitButton variant="danger" size="sm">
              Turn off
            </SubmitButton>
          </form>
        )}
      </div>
      {active && !url && <p className="text-xs text-muted">A link is active. Creating a new one stops the old one working.</p>}
    </div>
  );
}
