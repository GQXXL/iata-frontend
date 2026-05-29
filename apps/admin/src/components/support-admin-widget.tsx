import { useQuery } from "@tanstack/react-query";
import {
  createTicketFollow,
  getTicket,
  getTicketList,
} from "@workspace/ui/services/admin/ticket";
import { getUserDetail } from "@workspace/ui/services/admin/user";
import { Headset, Reply, X } from "lucide-react";
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
  `support:admin:lastRead:${ticketId || "none"}`;
const readMsgKey = (ticketId: number | null) =>
  `support:admin:readMsgIds:${ticketId || "none"}`;

const getReadMsgSet = (ticketId: number | null) => {
  try {
    const raw = localStorage.getItem(readMsgKey(ticketId));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set<string>();
  }
};

const setReadMsgSet = (ticketId: number | null, ids: Set<string>) => {
  localStorage.setItem(readMsgKey(ticketId), JSON.stringify(Array.from(ids)));
};

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
      ctx
        .resume()
        .then(run)
        .catch(() => {
          // ignore
        });
      return;
    }

    run();
  } catch {
    // ignore
  }
};

export function SupportAdminWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [userEmailMap, setUserEmailMap] = useState<Record<number, string>>({});
  const [ticketDetailMap, setTicketDetailMap] = useState<Record<number, any>>(
    {}
  );
  const [readVersion, setReadVersion] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);
  const lastNotifiedTsRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioReady = async () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AC();
      }
      await audioCtxRef.current.resume();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const unlock = () => {
      ensureAudioReady().catch(() => {
        // ignore
      });
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const { data: tickets, refetch: refetchList } = useQuery({
    queryKey: ["support-admin-ticket-list"],
    queryFn: async () => {
      const { data } = await getTicketList({ page: 1, size: 50 } as any);
      return data.data?.list || [];
    },
    refetchInterval: 6000,
  });

  const activeTicket = useMemo(() => {
    if (!tickets?.length) return null;
    if (ticketId) {
      return tickets.find((t: any) => t.id === ticketId) || null;
    }
    return (
      tickets.find((t: any) => t.status === 2 || t.status === 1) || tickets[0]
    );
  }, [tickets, ticketId]);

  useEffect(() => {
    if (!ticketId && activeTicket?.id) setTicketId(activeTicket.id);
  }, [activeTicket?.id, ticketId]);

  useEffect(() => {
    const run = async () => {
      if (!tickets?.length) return;
      const userIds = Array.from(
        new Set(tickets.map((t: any) => Number(t.user_id)).filter(Boolean))
      );
      const missing = userIds.filter((id) => !userEmailMap[id]);
      if (!missing.length) return;
      const pairs = await Promise.all(
        missing.map(async (id) => {
          try {
            const { data } = await getUserDetail({ id } as any);
            return [id, data.data?.email || `用户#${id}`] as const;
          } catch {
            return [id, `用户#${id}`] as const;
          }
        })
      );
      setUserEmailMap((prev) => {
        const next = { ...prev };
        pairs.forEach(([id, email]) => {
          next[id] = email;
        });
        return next;
      });
    };
    run();
  }, [tickets]);

  useEffect(() => {
    const run = async () => {
      if (!tickets?.length) return;
      const ids = tickets.map((t: any) => Number(t.id)).filter(Boolean);
      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const { data } = await getTicket({ id } as any);
            return [id, data.data || null] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );
      setTicketDetailMap((prev) => {
        const next = { ...prev };
        details.forEach(([id, detail]) => {
          if (detail) next[id] = detail;
        });
        return next;
      });
    };
    run();
  }, [tickets]);

  const { data: ticket, refetch: refetchDetail } = useQuery({
    queryKey: ["support-admin-ticket-detail", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await getTicket({ id: ticketId } as any);
      return data.data || null;
    },
    enabled: !!ticketId,
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!(ticketId && ticket)) return;
    setTicketDetailMap((prev) => ({ ...prev, [ticketId]: ticket }));
  }, [ticketId, ticket]);

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
    const currentRead = getReadMsgSet(ticketId);
    messages.forEach((m) => {
      if (m.from === "user") currentRead.add(m.id);
    });
    setReadMsgSet(ticketId, currentRead);

    const latestUserTs = messages
      .filter((m) => m.from === "user")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);
    if (latestUserTs > 0) {
      localStorage.setItem(readKey(ticketId), String(latestUserTs));
    }
    setReadVersion((v) => v + 1);
  };

  useEffect(() => {
    if (!(open && ticketId)) return;
    markCurrentTicketAsRead();
  }, [open, ticketId, messages]);

  useEffect(() => {
    if (!tickets?.length) return;
    let changed = false;

    (tickets || []).forEach((t: any) => {
      const tid = Number(t.id);
      if (!tid) return;
      const detail = ticketDetailMap[tid] || t;
      const allMsgs = [
        {
          id: `desc-${tid}`,
          from: "user" as const,
          createdAt: new Date(detail.created_at || t.created_at).getTime() || 0,
          text: detail.description || t.description || "",
        },
        ...(((detail.follow || []) as any[]).map((f: any) => ({
          id: `f-${f.id}`,
          from: (f.from === "System" ? "admin" : "user") as "admin" | "user",
          createdAt: new Date(f.created_at).getTime() || 0,
          text: f.content || "",
        })) as any[]),
      ].filter((m) => Boolean(m.text));

      const readSet = getReadMsgSet(tid);
      if (readSet.size === 0) {
        allMsgs.forEach((m: any) => {
          if (m.from === "user") readSet.add(m.id);
        });
        setReadMsgSet(tid, readSet);
        const latestUserTs = allMsgs
          .filter((m: any) => m.from === "user")
          .reduce((max: number, m: any) => Math.max(max, m.createdAt || 0), 0);
        if (latestUserTs > 0) {
          localStorage.setItem(readKey(tid), String(latestUserTs));
        }
        changed = true;
      }
    });

    if (changed) setReadVersion((v) => v + 1);
  }, [tickets, ticketDetailMap]);

  const unreadByTicket = useMemo(() => {
    const map: Record<number, number> = {};
    (tickets || []).forEach((t: any) => {
      const tid = Number(t.id);
      if (!tid) return;
      const detail = ticketDetailMap[tid] || t;
      const allMsgs = [
        {
          id: `desc-${tid}`,
          from: "user" as const,
          createdAt: new Date(detail.created_at || t.created_at).getTime() || 0,
          text: detail.description || t.description || "",
        },
        ...(((detail.follow || []) as any[]).map((f: any) => ({
          id: `f-${f.id}`,
          from: (f.from === "System" ? "admin" : "user") as "admin" | "user",
          createdAt: new Date(f.created_at).getTime() || 0,
          text: f.content || "",
        })) as any[]),
      ].filter((m) => Boolean(m.text));

      const readSet = getReadMsgSet(tid);
      map[tid] = allMsgs.filter(
        (m: any) => m.from === "user" && !readSet.has(m.id)
      ).length;
    });
    return map;
  }, [tickets, ticketDetailMap, readVersion]);

  const unreadTotal = useMemo(
    () => Object.values(unreadByTicket).reduce((a, b) => a + b, 0),
    [unreadByTicket]
  );

  useEffect(() => {
    const latestUserTs = Object.values(ticketDetailMap)
      .flatMap((detail: any) => {
        const base = [
          {
            from: "user",
            createdAt: new Date(detail?.created_at || 0).getTime() || 0,
            text: detail?.description || "",
          },
        ];
        const follow = ((detail?.follow || []) as any[]).map((f: any) => ({
          from: f.from === "System" ? "admin" : "user",
          createdAt: new Date(f.created_at).getTime() || 0,
          text: f.content || "",
        }));
        return [...base, ...follow];
      })
      .filter((m: any) => m.from === "user" && Boolean(m.text))
      .reduce((max: number, m: any) => Math.max(max, m.createdAt || 0), 0);

    if (latestUserTs > lastNotifiedTsRef.current) {
      playUnreadBeep(audioCtxRef);
      lastNotifiedTsRef.current = latestUserTs;
    }
  }, [ticketDetailMap]);

  useEffect(() => {
    if (unreadTotal > prevUnreadRef.current) {
      playUnreadBeep(audioCtxRef);
    }
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  const messageReadState = useMemo(() => {
    const latestUserTs = messages
      .filter((m) => m.from === "user")
      .reduce((max, m) => Math.max(max, m.createdAt || 0), 0);

    const state: Record<string, "sent" | "read"> = {};
    messages.forEach((m) => {
      if (m.from !== "admin") return;
      state[m.id] = latestUserTs > (m.createdAt || 0) ? "read" : "sent";
    });
    return state;
  }, [messages]);

  const customerWaiting =
    tickets?.filter((t: any) => t.status === 2 || t.status === 1).length || 0;

  const reply = async () => {
    const text = input.trim();
    if (!(text && ticketId)) return;
    setInput("");
    try {
      await createTicketFollow({
        ticket_id: ticketId,
        from: "System",
        type: 1,
        content: text,
      } as any);
      await refetchDetail();
      await refetchList();
    } catch {
      toast.error("发送失败，请登入后尝试发起对话");
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed overflow-hidden rounded-2xl border bg-background shadow-2xl"
          style={{
            bottom: "96px",
            right: "24px",
            width: "390px",
            zIndex: 2_147_483_000,
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-semibold text-sm">客服管理小窗</p>
              <p className="text-muted-foreground text-xs">
                {activeTicket
                  ? `当前工单 #${activeTicket.id}`
                  : "暂无待处理会话"}
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

          <div className="border-b px-3 py-2">
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              onChange={(e) => setTicketId(Number(e.target.value) || null)}
              value={ticketId || ""}
            >
              <option value="">选择会话</option>
              {(tickets || []).map((t: any) => {
                const email =
                  userEmailMap[Number(t.user_id)] || `用户#${t.user_id}`;
                const unread = unreadByTicket[Number(t.id)] || 0;
                return (
                  <option key={t.id} value={t.id}>
                    #{t.id} · {email} {unread > 0 ? `· 未读${unread}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div
            className="h-[320px] space-y-3 overflow-y-auto bg-muted/20 p-3"
            ref={listRef}
          >
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-xs">暂无会话</p>
            ) : (
              messages.map((msg) => (
                <div
                  className={`flex ${msg.from === "admin" ? "justify-end" : "justify-start"}`}
                  key={msg.id}
                >
                  <div className="max-w-[85%]">
                    <p className="mb-1 text-[10px] text-muted-foreground">
                      {formatTime(msg.createdAt)}
                      {msg.from === "admin" && (
                        <span className="ml-1">
                          {messageReadState[msg.id] === "read" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </p>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${msg.from === "admin" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-3">
            <div className="mb-2 text-muted-foreground text-xs">
              待处理会话：{customerWaiting}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && reply()}
                placeholder={ticketId ? "输入客服回复..." : "暂无可回复会话"}
                value={input}
              />
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                disabled={!ticketId}
                onClick={reply}
                type="button"
              >
                <Reply className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="fixed inline-flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-xl hover:opacity-95"
        onClick={async () => {
          await ensureAudioReady();
          setOpen((v) => !v);
        }}
        style={{ bottom: "24px", right: "24px", zIndex: 2_147_483_000 }}
        type="button"
      >
        <Headset className="size-5" />
        <span className="font-medium text-sm">客服管理</span>
        {!open && unreadTotal > 0 && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground text-xs">
            {unreadTotal}
          </span>
        )}
      </button>
    </>
  );
}
