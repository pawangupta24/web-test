"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "@/lib/router";
import { ArrowLeft, MapPin, Share2, UserX, MoreHorizontal, ShieldOff, UserMinus, Mail, Phone, Languages as LangIcon, Briefcase, GraduationCap, Activity, CalendarDays, Award, UserPlus, UserCheck, Clock, Link2, Loader2, MessageSquare } from "lucide-react";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import ShareSheet from "@/components/ShareSheet";
import MediaViewer from "@/components/profile/MediaViewer";
import { MetaRow, CountRow } from "@/components/profile/ProfileIdentity";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { profileUrl } from "@/lib/shareLinks";
import { compact, roleLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { reconcileFollowState } from "@/lib/relationships";
import { broadcastFollow, onFollowChange } from "@/lib/followBus";
import { useFollowAction } from "@/lib/useFollowAction";

/**
 * Another user's profile — the routing target for every DP / display-name tap
 * across feed cards, like lists, and comment rows. Renders the documented
 * third-party shape (docs/profile.md §9): { user, roleDetails, isFollowing,
 * connectionStatus, … }. Every profile is public — no visibility gate.
 */
const yr = (d) => (d ? new Date(d).getFullYear() : "Now");
const monthYear = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null);

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me, demo } = useAuth();
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState(null);
  const [share, setShare] = useState(false);
  const [failed, setFailed] = useState(false);
  const [viewer, setViewer] = useState(null); // fullscreen photo src, or null

  const isMe = me && (me._id === id || me.id === id);

  useEffect(() => {
    if (isMe) return;
    let alive = true;
    Promise.allSettled([dok.profile.byId(id), dok.follows.check(id)])
      .then(([p, f]) => {
        if (!alive) return;
        if (p.status !== "fulfilled") { setFailed(true); return; }
        const profile = p.value || {};
        const u = profile.user || profile;
        const rel = f.status === "fulfilled" ? f.value : {};
        // Relationship flags live at the TOP LEVEL of the byId payload (docs/profile.md §9),
        // not inside `user`; follows.check is a fallback (it lacks connectionStatus).
        setData({
          ...profile,
          user: {
            ...u,
            isSelf: u.isSelf ?? profile.isSelf,
            isFollowing: profile.isFollowing ?? rel.isFollowing ?? u.isFollowing,
            isFollowedBy: profile.isFollowedBy ?? rel.isFollowedBy ?? u.isFollowedBy,
            connectionStatus: profile.connectionStatus ?? u.connectionStatus ?? rel.connectionStatus,
            connectionRequestId: profile.connectionRequestId ?? u.connectionRequestId,
          },
        });
      });
    dok.posts
      .byUser(id, "?limit=20")
      .then((d) => alive && setPosts(d.posts || d.feed || []))
      .catch(() => alive && setPosts([]));
    return () => { alive = false; };
  }, [id, demo, isMe]);

  if (isMe) return <Navigate to="/app/profile" replace />;
  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card grid place-items-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-900/[.05] text-ink-400"><UserX size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">Profile unavailable</p>
          {/* "private" is no longer a reason a profile can be unreachable — the
              remaining causes are deactivation, removal, or a block either way. */}
          <p className="text-sm text-ink-500">This account has been deactivated or removed, or one of you has blocked the other.</p>
          <button onClick={() => nav(-1)} className="btn-ghost px-5 py-2 text-sm">Go back</button>
        </div>
      </div>
    );
  }
  if (!data) return <ProfileSkeleton />;

  const u = data.user;
  const rd = data.roleDetails || data.roleProfile || {};
  const headline = u.professionalHeadline || u.headline || rd.mainSpecialization || rd.course || roleLabel(u.role);
  const place = [rd.hospitals?.[0]?.name || rd.institution, u.city].filter(Boolean).join(" · ");
  const since = monthYear(u.createdAt);
  // Private accounts were removed — every profile, its lists and its content are
  // public, so there is no visibility gate here any more. The API still sends
  // `isPrivate` (permanently false) until the cleanup release; nothing reads it.
  const patients = rd.patientVerificationCount;

  const uid = u.id || u._id;
  const listLink = (t) => `/app/connections?user=${uid}&tab=${t}&name=${encodeURIComponent(u.fullName || "")}`;
  const metrics = [
    { n: u.postsCount, label: "Posts" },
    { n: u.followersCount, label: "Followers", to: listLink("followers") },
    { n: u.followingCount, label: "Following", to: listLink("following") },
    // No backend endpoint for a third party's connections list — display-only.
    { n: u.connectionsCount, label: "Connections" },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {u.coverPhoto && (
            <button type="button" onClick={() => setViewer(u.coverPhoto)} aria-label="View cover photo" className="absolute inset-0 h-full w-full cursor-zoom-in">
              <img src={u.coverPhoto} alt="" className="h-full w-full object-cover" />
            </button>
          )}
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
          <button onClick={() => nav(-1)} aria-label="Back" className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ArrowLeft size={18} /></button>
          <div className="absolute right-3 top-3 flex gap-2">
            <button onClick={() => setShare(true)} aria-label="Share profile" className="press grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><Share2 size={17} /></button>
            <ProfileMenu user={u} demo={demo} onChanged={(patch) => setData((d) => ({ ...d, user: { ...d.user, ...patch } }))} />
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* relative z-10 lifts the DP + action above the absolutely-positioned cover image */}
          <div className="relative z-10 -mt-14">
            {u.profilePhoto ? (
              <button type="button" onClick={() => setViewer(u.profilePhoto)} aria-label="View profile photo" className="press inline-block cursor-zoom-in rounded-full ring-4 ring-surface">
                <Avatar user={u} size={104} />
              </button>
            ) : (
              <span className="inline-block rounded-full ring-4 ring-surface"><Avatar user={u} size={104} /></span>
            )}
          </div>

          {/* Same order as your own profile: name, handle, bio, meta. */}
          <div className="mt-3">
            <h1 className="flex items-center gap-1.5 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink-900 text-balance">
              {u.fullName} {u.isVerified && <Verified size={20} />}
            </h1>
            {u.uniqueUsername && <p className="mt-0.5 text-sm text-ink-500">@{u.uniqueUsername}</p>}
            {headline && <p className="mt-2.5 text-[15px] font-semibold leading-snug text-brand-700">{headline}</p>}
            <MetaRow
              className="mt-2.5"
              items={[
                place && { key: "where", icon: MapPin, text: place },
                u.role === "doctor" && patients != null && { key: "consults", icon: Activity, text: `${compact(patients)} Consultations on Orovion` },
                since && { key: "since", icon: CalendarDays, text: `Joined ${since}` },
              ]}
            />
          </div>

          {/* Follow + Connect — two distinct buttons on the profile (vs. one morphing button on cards) */}
          {!u.isSelf && <ProfileActions user={u} demo={demo} />}

          {/* No consult CTA here on purpose: booking is entered from the Consults tab
              (components/consult/parts.tsx -> DoctorCard), so the profile stays a
              profile rather than a sales surface. */}

          {/* Counts sit directly under the identity block, as on your own profile.
              A count with no list endpoint renders as plain text rather than a
              button that would do nothing when pressed. */}
          <CountRow
            className="mt-3"
            counts={metrics.map((m) => ({ label: m.label, n: m.n, onClick: m.to ? () => nav(m.to) : undefined }))}
          />
        </div>
      </div>

      {/* role-based detail sections */}
      <Details user={u} rd={rd} />

      {/* content (the 6-tab archive grid is a later build; public posts shown for now) */}
      {(
        <div className="mt-5 space-y-5">
          {posts === null ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : posts.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="font-semibold text-ink-900">No posts yet</p>
              <p className="mt-1 text-sm text-ink-500">{u.fullName?.split(" ")[0]} hasn't shared anything public.</p>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p._id || p.id} post={p} demo={demo} onRemoved={(pid) => setPosts((x) => x.filter((y) => (y._id || y.id) !== pid))} />)
          )}
        </div>
      )}

      {viewer && <MediaViewer src={viewer} kind="image" onClose={() => setViewer(null)} />}
      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        kind="profile"
        demo={demo}
        shareUrl={profileUrl(u.uniqueUsername, u.id || u._id) || undefined}
      />
    </div>
  );
}

/* 3-dot overflow: Block / Unfollow (Disconnect needs a backend endpoint — deferred). */
function ProfileMenu({ user, demo, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const id = user.id || user._id;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const block = async () => {
    setOpen(false);
    if (demo || !window.confirm(`Block ${user.fullName}? They won't be able to find, follow or message you.`)) return;
    setBusy(true);
    try { await dok.profile.block(id); broadcastFollow(id, false); toast?.success?.("User blocked"); onChanged?.({ isFollowing: false, isBlocked: true }); }
    catch { toast?.error("Couldn't block — try again"); }
    finally { setBusy(false); }
  };

  const unfollow = async () => {
    setOpen(false);
    setBusy(true);
    try { await dok.follows.unfollow(id); broadcastFollow(id, false); toast?.success?.("Unfollowed"); onChanged?.({ isFollowing: false, connectionStatus: "none" }); }
    catch { toast?.error("Couldn't unfollow — try again"); }
    finally { setBusy(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={busy} aria-label="More options" aria-haspopup="menu" aria-expanded={open} className="press grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="anim-pop absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-ink-900/[.06] bg-surface p-1.5 shadow-card">
          {user.isFollowing && (
            <button role="menuitem" onClick={unfollow} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm font-medium text-ink-700 hover:bg-ink-900/[.04]">
              <UserMinus size={17} className="text-ink-400" /> Unfollow
            </button>
          )}
          <button role="menuitem" onClick={block} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm font-medium text-danger-700 hover:bg-danger-50">
            <ShieldOff size={17} /> Block user
          </button>
        </div>
      )}
    </div>
  );
}

/* The profile's two independent actions: a Follow control and a networking
   control, both visible at once (unlike the single morphing button on feed and
   reel cards).

   PRD State C: once the viewer follows, the networking control takes priority —
   but Following is deliberately RETAINED beside it rather than replaced, so the
   unfollow action is never taken away from the user.

   Private accounts are gone: no Requested state on the follow side. The connect
   side keeps a pending state, because a connection genuinely does await the
   other person's approval. */
function ProfileActions({ user, demo }) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user.id || user._id;

  const initFollow = user.isFollowing ? "following" : "follow";
  const cs = user.connectionStatus;
  const initConnect = cs === "connected" ? "message"
    : cs === "pending_outgoing" ? "connecting"
    : cs === "pending_incoming" ? "accept"
    : "connect";

  const [fState, setF] = useState(initFollow);
  const [cState, setC] = useState(initConnect);
  const [busyMsg, setBusyMsg] = useState(false);
  const src = useRef(Math.random().toString(36).slice(2)); // ignore our own broadcast echo
  const fRef = useRef(fState);
  fRef.current = fState;
  const reqIdRef = useRef(user.connectionRequestId || null); // captured for cancel

  // re-sync if the viewed user changes (block/unfollow from the 3-dot menu, nav)
  useEffect(() => { setF(initFollow); setC(initConnect); /* eslint-disable-next-line */ }, [id, user.isFollowing, cs]);

  // Resync when this user is followed/unfollowed on another surface.
  useEffect(() => {
    return onFollowChange((d) => {
      if (d.source === src.current || String(d.id) !== String(id)) return;
      const next = reconcileFollowState(fRef.current, d, true); // plain toggle here
      if (next !== fRef.current) {
        setF(next);
        // Unfollowing resets the networking side ONLY while nothing is
        // established. An accepted connection survives an unfollow — the two are
        // independent relationships — so "message" must not be torn down here.
        if (next === "follow" && cState !== "message") setC("connect");
      }
    });
  }, [id, cState]); // eslint-disable-line react-hooks/exhaustive-deps

  const followAction = useFollowAction({
    userId: id, commit: setF, current: fState, source: src.current, demo,
    onError: (m) => toast?.error(m),
  });
  const connectAction = useFollowAction({
    userId: id, commit: setC, current: cState, source: src.current, demo,
    onError: (m) => toast?.error(m),
  });

  if (!id) return null;

  /* follow side — a plain two-state toggle */
  const doFollow = () => followAction.follow(true);
  const doUnfollow = () => followAction.unfollow();

  /* connect side */
  const doConnect = async () => {
    // Connecting implies following; the server creates that edge itself, so the
    // follow control is mirrored optimistically here rather than waiting a round
    // trip to catch up.
    if (fRef.current === "follow") setF("following");
    await connectAction.connect();
  };
  // Tap the pending control to cancel the outgoing request.
  const doCancelConnect = async () => {
    setC("connect");
    if (demo) return;
    try { await dok.network.reject(reqIdRef.current || user.connectionRequestId || id); reqIdRef.current = null; }
    catch { setC("connecting"); toast?.error("Couldn't cancel the request"); }
  };
  const doAccept = () => connectAction.accept(user.connectionRequestId);
  const doMessage = async () => {
    if (demo) { nav("/app/messages"); return; }
    setBusyMsg(true);
    try {
      const d = await dok.chat.start({ recipientId: id });
      const cid = d?.conversation?.id || d?.conversation?._id || d?.conversationId;
      nav(cid ? `/app/messages?c=${cid}` : "/app/messages");
    } catch { toast?.error("Couldn't open the conversation"); }
    finally { setBusyMsg(false); }
  };

  // Not following: Follow owns the whole row as the single primary action.
  // Following: the networking control takes the primary slot and Following
  // shrinks to a secondary control beside it — still one tap from unfollow,
  // which State B requires to always be available.
  const isFollowing = fState === "following";

  const CONNECT = {
    connect:    { label: "Connect",    icon: Link2,          onClick: doConnect,       cls: "btn-primary" },
    connecting: { label: "Connecting", icon: Clock,          onClick: doCancelConnect, cls: "btn-outline", title: "Tap to cancel request" },
    accept:     { label: "Accept",     icon: UserCheck,      onClick: doAccept,        cls: "btn-primary" },
    message:    { label: "Message",    icon: MessageSquare,  onClick: doMessage,       cls: "btn-primary", busy: busyMsg },
  }[cState] || { label: "Connect", icon: Link2, onClick: doConnect, cls: "btn-primary" };

  const CIcon = CONNECT.icon;

  // BOTH controls are always present. Only their EMPHASIS swaps with state:
  //
  //   not following  →  Follow is primary, Connect sits beside it as secondary
  //   following      →  the networking action takes primary, Following steps back
  //
  // Connect is deliberately available to a non-follower: the server creates the
  // follow edge itself before sending the request (sendConnectionRequest ->
  // ensureFollow), so one tap does both and the pair can never end up connected
  // without following. Hiding it here would strand that capability and force two
  // taps for something the backend already handles in one.
  const FollowControl = isFollowing ? (
    <button
      onClick={doUnfollow}
      disabled={followAction.busy}
      title="Tap to unfollow"
      aria-label={`Unfollow ${user.fullName || "this user"}`}
      className="btn-outline shrink-0 px-4 py-2.5 text-sm text-ink-600 transition hover:border-danger-500/40 hover:text-danger-600"
    >
      {followAction.busy ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
      <span className="hidden sm:inline">Following</span>
    </button>
  ) : (
    <button
      onClick={doFollow}
      disabled={followAction.busy}
      className="btn-primary flex-1 py-2.5 text-sm"
    >
      {followAction.busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Follow
    </button>
  );

  const ConnectControl = (
    <button
      onClick={CONNECT.onClick}
      disabled={!CONNECT.onClick || CONNECT.busy || connectAction.busy}
      title={CONNECT.title}
      className={cn(
        // Primary only once following — before that, Follow owns the primary slot
        // (PRD State A) and Connect is the secondary option.
        isFollowing ? CONNECT.cls : "btn-outline",
        "flex-1 py-2.5 text-sm",
      )}
    >
      {CONNECT.busy || connectAction.busy ? <Loader2 size={16} className="animate-spin" /> : <CIcon size={16} />} {CONNECT.label}
    </button>
  );

  return (
    <div className="mt-4 flex gap-2">
      {isFollowing ? <>{ConnectControl}{FollowControl}</> : <>{FollowControl}{ConnectControl}</>}
    </div>
  );
}

/* Role-aware detail sections (doctor / student / general) from the documented roleDetails shape. */
function Details({ user, rd }) {
  const role = user.role;
  const education = rd.education || [];
  const workplace = rd.workplace || rd.hospitals || [];
  const academics = rd.academics || [];
  const experiences = rd.experiences || [];
  const certificates = rd.certificates || [];
  const specialties = rd.specialties || rd.specializations || [];
  const interests = rd.interests || user.interests || [];

  const hasContact = user.bio || user.city || user.languages?.length || user.workEmail || user.workPhone || user.age != null;
  const hasRoleDetails =
    role === "doctor" ? (education.length > 0 || workplace.length > 0 || certificates.length > 0 || specialties.length > 0) :
    role === "student" ? (academics.length > 0 || experiences.length > 0) :
    role === "general_user" ? (interests.length > 0) : false;

  const hasAny = hasContact || hasRoleDetails;
  if (!hasAny) return null;

  return (
    <div className="mt-5 space-y-5">
      {hasContact && (
        <Section title="About">
          {user.bio && (
            <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">{user.bio}</p>
          )}
          {user.bio && (user.city || user.age != null || user.languages?.length > 0 || user.workEmail || user.workPhone) && (
            <hr className="my-4 border-ink-900/[.06]" />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {user.city && <Line icon={MapPin} text={user.city} />}
            {user.age != null && <Line icon={CalendarDays} text={`${user.age} years`} />}
            {user.languages?.length > 0 && <Line icon={LangIcon} text={user.languages.join(", ")} />}
            {user.workEmail && <Line icon={Mail} text={user.workEmail} />}
            {user.workPhone && <Line icon={Phone} text={user.workPhone} />}
          </div>
        </Section>
      )}

      {role === "doctor" && specialties.length > 0 && (
        <Section title="Specialties">
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => <span key={s} className="chip bg-brand-50 text-brand-700">{s}</span>)}
          </div>
        </Section>
      )}

      {role === "doctor" && workplace.length > 0 && (
        <Section title="Experience">
          {workplace.map((h, i) => (
            <Row key={`w${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[h.role || h.designation, h.organizationName || h.name].filter(Boolean).join(" · ") || h.organizationName || h.name}
              text={[h.department || h.address, `${yr(h.startDate)} — ${h.endDate ? yr(h.endDate) : "Present"}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "doctor" && education.length > 0 && (
        <Section title="Education">
          {education.map((e, i) => (
            <Row key={`e${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[e.organizationName, e.departmentName].filter(Boolean).join(" · ") || e.organizationName}
              text={`${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`} />
          ))}
        </Section>
      )}

      {role === "student" && academics.length > 0 && (
        <Section title="Academics">
          {academics.map((a, i) => (
            <Row key={`a${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[a.program, a.collegeName].filter(Boolean).join(" · ") || a.collegeName}
              text={[a.city, a.currentYear, a.expectedGraduationDate && `Grad ${yr(a.expectedGraduationDate)}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "student" && experiences.length > 0 && (
        <Section title="Experience & interests">
          {experiences.map((e, i) => (
            <Row key={`x${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[e.program, e.institution].filter(Boolean).join(" · ") || e.institution}
              text={[e.city, `${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`, e.interests?.join(", ")].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "doctor" && certificates.length > 0 && (
        <Section title="Certificates">
          {certificates.map((c, i) => (
            <Row key={`c${i}`} icon={Award} tint="bg-ink-900/[.04] text-ink-600"
              title={c.name}
              text={[c.validationDate && `Valid ${monthYear(c.validationDate)}`, c.fileUrl && "Document attached"].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "general_user" && interests.length > 0 && (
        <Section title="Clinical interests">
          <div className="flex flex-wrap gap-2">
            {interests.map((t, i) => <span key={i} className="chip bg-brand-50 text-brand-700">{typeof t === "string" ? t : t.topic}</span>)}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Line({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-900/[.04] bg-ink-900/[.01] p-3 transition hover:bg-ink-900/[.03]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={16} />
      </span>
      <span className="text-sm font-medium text-ink-700 break-all">{text}</span>
    </div>
  );
}

function Row({ icon: Icon, title, text, tint }) {
  return (
    <div className="flex gap-3 rounded-xl p-2 transition hover:bg-ink-900/[.02]">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tint)}><Icon size={18} /></span>
      <div><p className="text-sm font-semibold text-ink-900">{title}</p>{text && <p className="text-sm text-ink-500">{text}</p>}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="space-y-3 px-5 pb-5">
          <div className="-mt-14"><Skeleton className="h-[104px] w-[104px] rounded-full ring-4 ring-surface" /></div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
