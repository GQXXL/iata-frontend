import { useQuery } from "@tanstack/react-query";
import {
  createUserTicket,
  createUserTicketFollow,
  getUserTicketDetails,
  getUserTicketList,
} from "@workspace/ui/services/user/ticket";
import { MessageCircle, Send, X } from "lucide-react";
import {
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type Msg = {
  id: string;
  from: "user" | "admin";
  text: string;
  createdAt: number;
};

const readKey = (ticketId: number | null) =>
  `support:user:lastRead:${ticketId || "none"}`;
const activeTicketKey = "support:user:activeTicketId";

const formatTime = (ts: number) => {
  if (!ts) return "";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const playUnreadBeep = (ctxRef: MutableRefObject<AudioContext | null>) => {
  try {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const run = () => {
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 784; // G5
      gain1.gain.value = 0.0001;
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 1046; // C6
      gain2.gain.value = 0.0001;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      gain2.gain.exponentialRampToValueAtTime(0.1, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc2.start(now + 0.19);
      osc2.stop(now + 0.4);
    };

    if (ctx.state !== "running") {
      void ctx.resume().then(run);
      return;
    }

    run();
  } catch {
    // ignore
  }
};

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(() => {
    const cached = Number(localStorage.getItem(activeTicketKey) || 0);
    return cached || null;
  });
  const [creating, setCreating] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);
  const lastNotifiedTsRef = useRef(0);
  const initializedReadRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioReady = async () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) {
        return false;
      }
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AC();
      }
      await audioCtxRef.current.resume();
      return audioCtxRef.current.state === "running";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const unlock = () => {
      void ensureAudioReady();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const {
    data: ticketList,
    refetch: refetchList,
    isLoading: listLoading,
  } = useQuery({
    queryKey: ["support-user-ticket-list"],
    queryFn: async () => {
      const { data } = await getUserTicketList({ page: 1, size: 20 } as any);
      return data.data?.list || [];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!ticketList?.length) {
      setTicketId(null);
      localStorage.removeItem(activeTicketKey);
      return;
    }

    const stillExists =
      ticketId &&
      ticketList.some((t: any) => t.id === ticketId && t.status !== 4);
    const active = stillExists
      ? ticketList.find((t: any) => t.id === ticketId && t.status !== 4)
      : ticketList.find((t: any) => t.status !== 4);

    if (active?.id && active.id !== ticketId) {
      setTicketId(active.id);
      return;
    }

    if (!active) {
      setTicketId(null);
      localStorage.removeItem(activeTicketKey);
    }
  }, [ticketList]);

  useEffect(() => {
    if (ticketId) localStorage.setItem(activeTicketKey, String(ticketId));
  }, [ticketId]);

  const { data: ticket, refetch: refetchDetail } = useQuery({
    queryKey: ["support-user-ticket-detail", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await getUserTicketDetails({ id: ticketId as any });
      return data.data || null;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const messages = useMemo<Msg[]>(() => {
    if (!ticket) return [];

    const base = [
      {
        id: `desc-${ticket.id}`,
        from: "user" as const,
        text: ticket.description || "",
        createdAt: new Date(ticket.created_at).getTime() || Date.now(),
      },
    ].filter((m) => Boolean(m.text)) as Msg[];

    const follow: Msg[] = (ticket.follow || []).map((f: any) => ({
      id: `f-${f.id}`,
      from: (f.from === "System" ? "admin" : "user") as "admin" | "user",
      text: f.content || "",
      createdAt: new Date(f.created_at).getTime() || Date.now(),
    }));

    return [...base, ...follow].filter((m) => Boolean(m.text));
  }, [ticket]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const markCurrentTicketAsRead = () => {
    if (!ticketId) return;
    const latestAdminTs = messages
      .filter((m) => m.from === "admin")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);
    if (latestAdminTs > 0) {
      localStorage.setItem(readKey(ticketId), String(latestAdminTs));
      setReadVersion((v) => v + 1);
    }
  };

  useEffect(() => {
    initializedReadRef.current = false;
  }, [ticketId]);

  useEffect(() => {
    if (!(ticketId && messages.length) || initializedReadRef.current) return;

    const saved = Number(localStorage.getItem(readKey(ticketId)) || 0);
    if (saved > 0) {
      initializedReadRef.current = true;
      return;
    }

    const latestAdminTs = messages
      .filter((m) => m.from === "admin")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);

    if (latestAdminTs > 0) {
      localStorage.setItem(readKey(ticketId), String(latestAdminTs));
      setReadVersion((v) => v + 1);
    }

    initializedReadRef.current = true;
  }, [ticketId, messages]);

  useEffect(() => {
    if (!(open && ticketId)) return;
    markCurrentTicketAsRead();
  }, [open, ticketId, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      let currentTicketId = ticketId;
      if (!currentTicketId) {
        setCreating(true);
        const { data } = await createUserTicket({
          title: `在线客服 ${new Date().toLocaleString()}`,
          description: text,
        });
        currentTicketId = data.data?.id || null;
        await refetchList();
        if (!currentTicketId) {
          const latest = await getUserTicketList({ page: 1, size: 1 });
          currentTicketId = latest.data.data?.list?.[0]?.id || null;
        }
        setTicketId(currentTicketId);
        setCreating(false);
        return;
      }

      await createUserTicketFollow({
        ticket_id: currentTicketId as any,
        from: "User",
        type: 1,
        content: text,
      } as any);
      await refetchDetail();
    } catch {
      toast.error("发送失败，请登入后尝试发起对话");
      setCreating(false);
    }
  };

  const unread = useMemo(() => {
    if (!ticketId) return 0;
    const lastRead = Number(localStorage.getItem(readKey(ticketId)) || 0);
    return messages.filter(
      (m) => m.from === "admin" && (m.createdAt || 0) > lastRead
    ).length;
  }, [messages, ticketId, readVersion]);

  const messageReadState = useMemo(() => {
    const latestAdminTs = messages
      .filter((m) => m.from === "admin")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);

    const state: Record<string, "sent" | "read"> = {};
    messages.forEach((m) => {
      if (m.from !== "user") return;
      state[m.id] = latestAdminTs > (m.createdAt || 0) ? "read" : "sent";
    });
    return state;
  }, [messages]);

  useEffect(() => {
    const latestAdminTs = messages
      .filter((m) => m.from === "admin")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);
    if (latestAdminTs > lastNotifiedTsRef.current) {
      playUnreadBeep(audioCtxRef);
      lastNotifiedTsRef.current = latestAdminTs;
    }
  }, [messages]);

  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      playUnreadBeep(audioCtxRef);
    }
    prevUnreadRef.current = unread;
  }, [unread]);

  return (
    <>
      {open && (
        <div
          className="fixed overflow-hidden rounded-2xl border bg-background shadow-2xl"
          style={{
            bottom: "96px",
            right: "24px",
            width: "340px",
            zIndex: 2_147_483_000,
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-semibold text-sm">在线客服</p>
              <p className="text-muted-foreground text-xs">
                请描述清楚问题现象，方便我们更快为您处理！7/24⏰
              </p>
            </div>
            <button
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <div
            className="h-[320px] space-y-3 overflow-y-auto bg-muted/20 p-3"
            ref={listRef}
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {listLoading ? "会话加载中..." : "等您来撩..."}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  key={msg.id}
                >
                  <div className="max-w-[85%]">
                    <p className="mb-1 text-[10px] text-muted-foreground">
                      {formatTime(msg.createdAt)}
                      {msg.from === "user" && (
                        <span className="ml-1">
                          {messageReadState[msg.id] === "read" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </p>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${msg.from === "user" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <input
                className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={creating ? "正在创建会话..." : "请输入您的问题..."}
                value={input}
              />
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                disabled={creating}
                onClick={send}
                type="button"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="fixed inline-flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-xl hover:opacity-95"
        onClick={async () => {
          await ensureAudioReady();
          setOpen((v) => {
            const next = !v;
            if (next) {
              markCurrentTicketAsRead();
            }
            return next;
          });
        }}
        style={{ bottom: "24px", right: "24px", zIndex: 2_147_483_000 }}
        type="button"
      >
        <MessageCircle className="size-5" />
        <span className="font-medium text-sm">在线客服</span>
        {!open && unread > 0 && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground text-xs">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
