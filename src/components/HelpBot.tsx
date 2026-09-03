"use client";

/* ------------------------------------------------------------------ */
/* Fitwish Assistant — offline, rule-based help bot (no external LLM)  */
/* Answers questions about the app using the signed-in user's own data */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/client";
import { Modal } from "@/components/ui/overlays";
import { Button, Input } from "@/components/ui/core";
import { fmtDate, fmtMoney, daysUntil, MEMBERSHIP_STATE_LABEL, membershipState } from "@/lib/format";
import type { AdminDashboardDTO, TrainerOverviewDTO, UserBundle } from "@/lib/types";

type BotRole = "user" | "trainer" | "admin";

interface ChatMsg {
  id: string;
  from: "bot" | "me";
  text: string;
}

const ENDPOINT: Record<BotRole, string> = {
  user: "/api/user",
  trainer: "/api/trainer?action=overview",
  admin: "/api/admin?action=dashboard",
};

const GREETING: Record<BotRole, string> = {
  user:
    "Hi! I'm the Fitwish assistant. I can tell you your session time, membership dues, plan expiry, trainer and attendance — just ask.",
  trainer:
    "Hi! I'm the Fitwish assistant. Ask me about today's sessions, your clients, pending requests or how attendance and plans work.",
  admin:
    "Hi! I'm the Fitwish assistant. Ask me about members, pending approvals, dues, reports or payment requests.",
};

const SUGGESTIONS: Record<BotRole, string[]> = {
  user: ["My session time", "How much money is left?", "When does my plan expire?", "Who is my trainer?", "My attendance"],
  trainer: ["Today's sessions", "How many clients?", "Pending requests", "How do I mark attendance?"],
  admin: ["Total members", "Total dues", "Pending approvals", "Pending reports"],
};

/* ------------------------------------------------------------------ */
/* Answer engine                                                       */
/* ------------------------------------------------------------------ */

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

const ABOUT =
  "Fitwish is a gym management app. Members track membership, session time, workouts, diet, attendance and progress. Trainers manage their clients, plans and attendance. Admins handle memberships, approvals, payments, holidays and reports.";

function answerUser(q: string, d: UserBundle | undefined): string | null {
  if (!d) return null;
  const m = d.membership;
  const state = membershipState(m);

  if (has(q, "session", "timing", "what time", "class time")) {
    return d.sessionTime
      ? `Your session time is ${d.sessionTime}${d.trainer ? ` with ${d.trainer.name}` : ""}.`
      : "No session time is set yet. Your trainer sets it once you're connected — you can request a trainer from the Trainers page.";
  }
  if (has(q, "money", "due", "pending amount", "balance", "left", "pay", "fee", "bill")) {
    if (!m) return "You don't have an active membership yet. The gym admin will set one up for you.";
    return m.dueAmount > 0
      ? `You have ${fmtMoney(m.dueAmount)} left to pay. Paid so far: ${fmtMoney(m.paidAmount)} of ${fmtMoney(m.totalAmount)} (${m.plan} plan). You can raise a payment request from Settings.`
      : `You're fully paid — nothing pending. Total ${fmtMoney(m.totalAmount)} on the ${m.plan} plan.`;
  }
  if (has(q, "expire", "expiry", "valid", "renew", "end date", "plan", "membership")) {
    if (!m) return "No membership is active on your account yet. The gym admin creates it for you.";
    const days = daysUntil(m.expiryDate);
    return `Your ${m.plan} membership is ${MEMBERSHIP_STATE_LABEL[state]}. It started ${fmtDate(m.startDate)} and ends ${fmtDate(m.expiryDate)} (${days >= 0 ? `${days} day(s) left` : `expired ${Math.abs(days)} day(s) ago`}).`;
  }
  if (has(q, "trainer", "coach")) {
    return d.trainer
      ? `Your trainer is ${d.trainer.name}${d.trainer.availability ? ` — available ${d.trainer.availability}` : ""}. You can see their profile on the Trainers page.`
      : "No trainer is assigned yet. Open the Trainers page and send a connect request to a trainer you like.";
  }
  if (has(q, "attendance", "present", "absent")) {
    return "Your attendance is marked by your trainer. Open Profile → Attendance to see your day-by-day record and percentage.";
  }
  if (has(q, "workout", "exercise", "training plan")) {
    return "Your workout plan is on the Workout tab. Tap Start to run the guided player — it tracks sets, reps and rest for you.";
  }
  if (has(q, "diet", "meal", "food", "nutrition")) {
    return "Your diet plan is on the Diet tab, split into breakfast, lunch, snacks and dinner with calories and protein.";
  }
  if (has(q, "progress", "weight", "bmi", "photo")) {
    return "Log weight, BMI, measurements and progress photos on the Progress page. Charts update automatically.";
  }
  if (has(q, "notification", "message", "alert")) {
    return `You have ${d.unreadNotifications} unread notification(s). Open the Notifications page to read them.`;
  }
  if (has(q, "holiday", "closed", "open today")) {
    return d.todayHoliday
      ? `The gym is closed today for ${d.todayHoliday.name}${d.todayHoliday.reason ? ` (${d.todayHoliday.reason})` : ""}.`
      : "No holiday today — the gym is open as usual.";
  }
  if (has(q, "calculator", "calorie", "protein", "water")) {
    return "The Calculators page has BMI, BMR, daily calories, protein and water targets. Results are saved to your history.";
  }
  if (has(q, "report", "problem", "complaint", "support", "contact")) {
    return "Go to Settings → Help & support → Report a problem. The gym admin sees it and replies.";
  }
  if (has(q, "profile", "photo", "name", "phone", "edit")) {
    return "Edit your name, phone, height, photo and emergency contact from Profile → Edit profile.";
  }
  return null;
}

function answerTrainer(q: string, d: TrainerOverviewDTO | undefined): string | null {
  if (!d) return null;

  if (has(q, "today", "session", "schedule", "timing")) {
    if (!d.schedule.length) return "No sessions scheduled — you have no clients with a session time set yet.";
    const lines = d.schedule
      .slice(0, 6)
      .map((s) => `• ${s.name} — ${s.sessionTime ?? "no time set"}`)
      .join("\n");
    return `You have ${d.todaySessionCount} session(s) today:\n${lines}`;
  }
  if (has(q, "client", "member", "how many")) {
    return `You have ${d.clientCount} client(s), ${d.activeClientCount} with an active membership.`;
  }
  if (has(q, "request", "pending", "connect")) {
    return d.pendingRequests.length
      ? `${d.pendingRequests.length} pending connect request(s): ${d.pendingRequests.slice(0, 5).map((r) => r.userName).join(", ")}. Accept or reject them on the Requests page.`
      : "No pending connect requests right now.";
  }
  if (has(q, "attendance", "mark", "present", "absent")) {
    return "Open the Attendance page, pick the date and mark each client present or absent. Past days are on Attendance → History.";
  }
  if (has(q, "workout", "plan", "exercise")) {
    return "Open Clients → pick a client → Workout plan, then add exercises with sets, reps, weight and rest.";
  }
  if (has(q, "diet", "meal", "nutrition")) {
    return "Open Clients → pick a client → Diet plan to add meals, items, calories and protein.";
  }
  if (has(q, "session time", "set time", "change time")) {
    return "Set a client's session time from their client page — it instantly shows on the member's home screen.";
  }
  if (has(q, "profile", "availability", "bio", "edit")) {
    return "Update your qualification, experience, availability, bio and photo on the Profile page.";
  }
  if (has(q, "task", "todo")) {
    return `You have ${d.pendingTasks} pending task(s) waiting on you.`;
  }
  return null;
}

function answerAdmin(q: string, d: AdminDashboardDTO | undefined): string | null {
  if (!d) return null;

  if (has(q, "member", "user", "how many", "total")) {
    return `${d.totalUsers} member(s) in total, ${d.activeMemberships} with an active membership. ${d.pendingMemberApprovals} member approval(s) pending.`;
  }
  if (has(q, "due", "money", "revenue", "payment", "collect", "pay")) {
    return `Outstanding dues across all members: ${fmtMoney(d.totalDue)}. ${d.pendingPayments} payment request(s) waiting to be marked received.`;
  }
  if (has(q, "trainer", "coach")) {
    return `${d.totalTrainers} trainer(s): ${d.activeTrainers} active, ${d.inactiveTrainers} inactive, ${d.pendingTrainerApprovals} awaiting approval.`;
  }
  if (has(q, "approval", "pending", "request")) {
    return `Pending: ${d.pendingMemberApprovals} member approval(s), ${d.pendingTrainerApprovals} trainer approval(s), ${d.pendingReports} report(s), ${d.pendingPayments} payment request(s).`;
  }
  if (has(q, "expire", "expiring", "renew")) {
    return `${d.expiringMemberships} membership(s) expiring soon and ${d.expiredMemberships} already expired. Filter them on the Members page.`;
  }
  if (has(q, "attendance", "today", "present")) {
    return `${d.attendanceToday} member(s) marked present today.`;
  }
  if (has(q, "report", "complaint", "problem")) {
    return `${d.pendingReports} pending report(s). Open the Reports page to read and resolve them.`;
  }
  if (has(q, "holiday", "closed")) {
    return "Add or edit gym holidays on the Holidays page — members see them on their home screen.";
  }
  if (has(q, "notification", "announce", "broadcast")) {
    return "Send announcements to all members or a single member from the Notifications page.";
  }
  if (has(q, "audit", "activity", "log", "history")) {
    return "Every admin action is logged on the Activity page.";
  }
  if (has(q, "membership", "plan", "assign")) {
    return "Open Members → a member → edit membership to set plan, amount, paid amount and duration, or assign a trainer.";
  }
  return null;
}

function reply(role: BotRole, raw: string, data: unknown): string {
  const q = raw.toLowerCase().trim();

  if (!q) return "Ask me anything about the app.";
  if (has(q, "hi", "hello", "hey") && q.length <= 12) return GREETING[role];
  if (has(q, "thank", "thanks")) return "Happy to help! Anything else?";
  if (has(q, "what is Fitwish", "about", "what can this app", "what does this app")) return ABOUT;
  if (has(q, "what can you", "help me", "options", "commands")) {
    return `You can ask things like: ${SUGGESTIONS[role].map((s) => `"${s}"`).join(", ")}.`;
  }

  const answer =
    role === "user"
      ? answerUser(q, data as UserBundle | undefined)
      : role === "trainer"
        ? answerTrainer(q, data as TrainerOverviewDTO | undefined)
        : answerAdmin(q, data as AdminDashboardDTO | undefined);

  if (answer) return answer;

  return `I'm not sure about that one. I can help with: ${SUGGESTIONS[role].map((s) => `"${s}"`).join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function HelpBot({ role }: { role: BotRole }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [{ id: "greet", from: "bot", text: GREETING[role] }]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const seq = useRef(0);

  const { data } = useSWR<unknown>(open ? ENDPOINT[role] : null, swrFetcher);

  const suggestions = useMemo(() => SUGGESTIONS[role], [role]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, open]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    seq.current += 1;
    const stamp = seq.current;
    setMsgs((prev) => [
      ...prev,
      { id: `q${stamp}`, from: "me", text: q },
      { id: `a${stamp}`, from: "bot", text: reply(role, q, data) },
    ]);
    setText("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-surface-2"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Bot size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-ink">Ask Fitwish Assistant</span>
          <span className="block text-[12.5px] text-ink-2">
            Instant answers about your sessions, dues and how the app works
          </span>
        </span>
        <Sparkles size={15} className="shrink-0 text-brand" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Fitwish Assistant">
        <div className="flex max-h-[58dvh] min-h-[240px] flex-col gap-2.5 overflow-y-auto pr-0.5">
          {msgs.map((m) => (
            <div key={m.id} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.from === "me"
                    ? "bg-brand text-white"
                    : "bg-surface-2 text-ink"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 transition hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your question…"
            aria-label="Ask the assistant"
          />
          <Button type="submit" aria-label="Send" className="!px-3.5">
            <Send size={15} />
          </Button>
        </form>
      </Modal>
    </>
  );
}
