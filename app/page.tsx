"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  Cpu,
  Eye,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
  CircleHelp,
} from "lucide-react";

type Ball = {
  over: string;
  event: string;
  runs: number;
  wicket?: boolean;
  note: string;
};

type Match = {
  batting: string;
  bowling: string;
  score: number;
  wickets: number;
  balls: number;
  target: number;
  totalBalls: number;
  striker: string;
  nonStriker: string;
  bowler: string;
};

type LiveApiMatch = {
  id: string;
  name?: string;
  matchType?: string;
  status?: string;
  teams?: string[];
  score?: {
    r?: number;
    w?: number;
    o?: number | string;
    inning?: string;
  }[];
  venue?: string;
  date?: string;
};

type Batter = {
  batsman?: { id?: string; name?: string };
  r?: number | string;
  b?: number | string;
  "4s"?: number | string;
  "6s"?: number | string;
  sr?: number | string;
  dismissal?: string;
  dismissalText?: string;
};

type Bowler = {
  bowler?: { id?: string; name?: string };
  o?: number | string;
  m?: number | string;
  r?: number | string;
  w?: number | string;
  eco?: number | string;
};

type Innings = {
  inning?: string;
  batting?: Batter[];
  bowling?: Bowler[];
};

type ScorecardData = {
  scorecard?: Innings[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Keep this EXACTLY the same between visits so WebLLM can reuse
// the model stored in the browser cache.
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

const REFRESH_INTERVAL = 15 * 60 * 1000;

const AI_SYSTEM_PROMPT = `
You are FanPulse AI, a knowledgeable cricket match companion.

Answer the user's exact cricket question using only the supplied match data.

Rules:
- Never invent scores, players, wickets or statistics.
- Clearly say when information is unavailable.
- Label projections as estimates.
- Never invent win probabilities.
- Compare actual scorecard figures when available.
- Do not repeat generic match summaries for different questions.
- Keep answers concise, natural and conversational.
`;

const initialBalls: Ball[] = [
  {
    over: "15.1",
    event: "1",
    runs: 1,
    note: "Rotated strike",
  },
  {
    over: "15.2",
    event: "4",
    runs: 4,
    note: "Driven through covers",
  },
  {
    over: "15.3",
    event: "2",
    runs: 2,
    note: "Good running",
  },
  {
    over: "15.4",
    event: "W",
    runs: 0,
    wicket: true,
    note: "Caught at deep midwicket",
  },
  {
    over: "15.5",
    event: "1",
    runs: 1,
    note: "New batter gets off the mark",
  },
  {
    over: "15.6",
    event: "6",
    runs: 6,
    note: "Dispatched over long-on",
  },
  {
    over: "16.1",
    event: "4",
    runs: 4,
    note: "Four through point",
  },
  {
    over: "16.2",
    event: "2",
    runs: 2,
    note: "Two more",
  },
  {
    over: "16.3",
    event: "1",
    runs: 1,
    note: "Single to midwicket",
  },
  {
    over: "16.4",
    event: "0",
    runs: 0,
    note: "Dot ball",
  },
  {
    over: "16.5",
    event: "6",
    runs: 6,
    note: "Big hit over extra cover",
  },
  {
    over: "16.6",
    event: "1",
    runs: 1,
    note: "End of over",
  },
  {
    over: "17.1",
    event: "4",
    runs: 4,
    note: "Four through point",
  },
  {
    over: "17.2",
    event: "1",
    runs: 1,
    note: "Single",
  },
  {
    over: "17.3",
    event: "W",
    runs: 0,
    wicket: true,
    note: "Bowled",
  },
  {
    over: "17.4",
    event: "2",
    runs: 2,
    note: "Two runs",
  },
  {
    over: "17.5",
    event: "4",
    runs: 4,
    note: "Boundary behind square",
  },
  {
    over: "17.6",
    event: "1",
    runs: 1,
    note: "End of over",
  },
];

const openingMatch: Match = {
  batting: "IND",
  bowling: "AUS",
  score: 142,
  wickets: 4,
  balls: 98,
  target: 196,
  totalBalls: 120,
  striker: "Hardik Pandya",
  nonStriker: "Ravindra Jadeja",
  bowler: "Pat Cummins",
};

function oversText(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function runRate(runs: number, balls: number) {
  return balls > 0 ? ((runs / balls) * 6).toFixed(1) : "0.0";
}

function oversToBalls(value: number | string | undefined) {
  const overs = Number(value ?? 0);

  if (!Number.isFinite(overs)) return 0;

  const wholeOvers = Math.floor(overs);
  const ballsInOver = Math.round((overs - wholeOvers) * 10);

  return (
    wholeOvers * 6 +
    Math.min(5, Math.max(0, ballsInOver))
  );
}

function toLiveMatch(item: LiveApiMatch): Match {
  const innings = Array.isArray(item.score)
    ? item.score
    : [];

  const current = innings[innings.length - 1];

  const previous =
    innings.length > 1
      ? innings[innings.length - 2]
      : undefined;

  const batting =
    current?.inning?.replace(
      /\s+Inning\s+\d+$/i,
      ""
    ) ||
    item.teams?.[0] ||
    "Batting team";

  const bowling =
    item.teams?.find(
      (team) =>
        team.toLowerCase() !==
        batting.toLowerCase()
    ) ||
    item.teams?.[1] ||
    "Bowling team";

  const type = (
    item.matchType || ""
  ).toLowerCase();

  const totalBalls = type.includes("t20")
    ? 120
    : type.includes("odi")
      ? 300
      : 0;

  return {
    batting,
    bowling,
    score: Number(current?.r ?? 0),
    wickets: Number(current?.w ?? 0),
    balls: oversToBalls(current?.o),
    target: previous
      ? Number(previous.r ?? 0) + 1
      : 0,
    totalBalls,
    striker: "Player details unavailable",
    nonStriker: "Player details unavailable",
    bowler: "Player details unavailable",
  };
}

function getStats(match: Match) {
  const ballsLeft =
    match.totalBalls > 0
      ? Math.max(
          0,
          match.totalBalls - match.balls
        )
      : 0;

  const runsNeeded = match.target
    ? Math.max(
        0,
        match.target - match.score
      )
    : 0;

  return {
    ballsLeft,
    runsNeeded,
    currentRate: runRate(
      match.score,
      match.balls
    ),
    requiredRate:
      ballsLeft > 0 && match.target
        ? (
            (runsNeeded / ballsLeft) *
            6
          ).toFixed(1)
        : "—",
    overs: oversText(match.balls),
  };
}

function makeLocalInsight(
  match: Match,
  recent: Ball[]
) {
  const stats = getStats(match);

  const recentRuns = recent.reduce(
    (sum, ball) => sum + ball.runs,
    0
  );

  const recentWickets =
    recent.filter(
      (ball) => ball.wicket
    ).length;

  return {
    headline: recentWickets
      ? "A wicket has changed the equation"
      : recentRuns >= 14
        ? "The batting side has found momentum"
        : "The chase is entering its decisive phase",

    what: match.target
      ? `${match.batting} are ${match.score}/${match.wickets} after ${stats.overs} overs. They need ${stats.runsNeeded} runs from ${stats.ballsLeft} balls.`
      : `${match.batting} are ${match.score}/${match.wickets} after ${stats.overs} overs. Current run rate: ${stats.currentRate}.`,

    why: `${recentRuns} runs and ${recentWickets} wicket(s) in the recorded deliveries. ${
      match.target
        ? `Required rate: ${stats.requiredRate}.`
        : "Target unavailable."
    }`,

    watch:
      Number(stats.requiredRate) > 12
        ? "The batting side needs to accelerate."
        : "Watch whether the batting side maintains its scoring rate.",

    key: `${match.striker} is currently listed as the striker.`,
  };
}

function buildMatchContext(
  match: Match,
  stats: ReturnType<typeof getStats>,
  recent: Ball[],
  scorecard: ScorecardData | null,
  liveMode: boolean,
  title: string
) {
  return {
    match:
      title ||
      `${match.batting} vs ${match.bowling}`,

    source: liveMode
      ? "CricAPI"
      : "Demo simulation",

    score: {
      battingTeam: match.batting,
      bowlingTeam: match.bowling,
      runs: match.score,
      wickets: match.wickets,
      overs: stats.overs,
      currentRunRate: stats.currentRate,
      target: match.target || null,
      runsNeeded: match.target
        ? stats.runsNeeded
        : null,
      ballsRemaining: match.totalBalls
        ? stats.ballsLeft
        : null,
      requiredRunRate:
        stats.requiredRate,
    },

    players: {
      striker: match.striker,
      nonStriker: match.nonStriker,
      bowler: match.bowler,
    },

    recentDeliveries: recent,

    scorecard:
      scorecard?.scorecard || [],
  };
}

function getQuestionFallback(
  question: string,
  match: Match,
  stats: ReturnType<typeof getStats>,
  scorecard: ScorecardData | null
) {
  const q = question.toLowerCase();

  const innings =
    scorecard?.scorecard || [];

  const battingInnings =
    innings.find((item) =>
      (item.inning || "")
        .toLowerCase()
        .includes(
          match.batting.toLowerCase()
        )
    ) ||
    innings[innings.length - 1];

  const batters =
    battingInnings?.batting || [];

  const bowlers =
    battingInnings?.bowling || [];

  if (
    q.includes("predicted final score") ||
    q.includes("projected score") ||
    q.includes("final score") ||
    q.includes("prediction")
  ) {
    if (
      !match.totalBalls ||
      match.balls >= match.totalBalls
    ) {
      return "A limited-overs final score projection is not available for this match format or innings stage.";
    }

    const projected =
      (match.score /
        Math.max(match.balls, 1)) *
      match.totalBalls;

    return `At the current run rate of ${stats.currentRate}, ${match.batting} are projected to finish around ${Math.round(projected)} runs. This is a simple mathematical estimate, not a guaranteed result. They have ${stats.ballsLeft} balls remaining.`;
  }

  if (
    q.includes("compare") ||
    q.includes("player performance") ||
    q.includes("performances")
  ) {
    if (
      !batters.length &&
      !bowlers.length
    ) {
      return "I can't compare individual player performances because the scorecard data is not available for this match yet. Refresh the player scorecard when the provider makes it available.";
    }

    const topBatters = [...batters]
      .sort(
        (a, b) =>
          Number(b.r || 0) -
          Number(a.r || 0)
      )
      .slice(0, 3)
      .map(
        (p) =>
          `${p.batsman?.name || "Unknown"}: ${p.r ?? 0} runs off ${p.b ?? 0} balls (SR ${p.sr ?? "—"})`
      );

    const topBowlers = [...bowlers]
      .sort(
        (a, b) =>
          Number(b.w || 0) -
          Number(a.w || 0)
      )
      .slice(0, 3)
      .map(
        (p) =>
          `${p.bowler?.name || "Unknown"}: ${p.w ?? 0} wickets for ${p.r ?? 0} runs in ${p.o ?? 0} overs`
      );

    return [
      topBatters.length
        ? `BATTING:\n${topBatters.join("\n")}`
        : "Batting figures unavailable.",

      topBowlers.length
        ? `BOWLING:\n${topBowlers.join("\n")}`
        : "Bowling figures unavailable.",
    ].join("\n\n");
  }

  if (
    q.includes("required run rate") ||
    q.includes("run rate") ||
    q.includes("enough")
  ) {
    if (!match.target) {
      return "The target is not available, so I cannot calculate the required run rate.";
    }

    return `The current run rate is ${stats.currentRate}, while the required run rate is ${stats.requiredRate}. ${
      Number(stats.requiredRate) >
      Number(stats.currentRate)
        ? "The batting team needs to accelerate."
        : "The batting team is currently scoring at or above the required rate."
    }`;
  }

  if (
    q.includes("pressure") ||
    q.includes("struggling") ||
    q.includes("losing")
  ) {
    if (!match.target) {
      return `${match.batting} are ${match.score}/${match.wickets}. The target is unavailable, so chase pressure cannot be calculated accurately.`;
    }

    return `${match.batting} need ${stats.runsNeeded} runs from ${stats.ballsLeft} balls, at a required rate of ${stats.requiredRate}. They have ${10 - match.wickets} wickets remaining. ${
      Number(stats.requiredRate) > 12
        ? "This is a high-pressure chase."
        : "The required rate is more manageable."
    }`;
  }

  if (
    q.includes("chance") ||
    q.includes("winner") ||
    q.includes("win")
  ) {
    return `A reliable winning probability cannot be calculated from the current score alone. ${match.batting} need ${stats.runsNeeded} runs from ${stats.ballsLeft} balls, with ${10 - match.wickets} wickets remaining. More information, such as ball-by-ball events and player performance, is needed for a meaningful estimate.`;
  }

  if (
    q.includes("key player") ||
    q.includes("impactful player") ||
    q.includes("best player")
  ) {
    if (
      !batters.length &&
      !bowlers.length
    ) {
      return "Individual player statistics are not available in the current scorecard. I can't reliably identify the most impactful player yet.";
    }

    const batter = [...batters].sort(
      (a, b) =>
        Number(b.r || 0) -
        Number(a.r || 0)
    )[0];

    const bowler = [...bowlers].sort(
      (a, b) =>
        Number(b.w || 0) -
        Number(a.w || 0)
    )[0];

    return `Based on available figures, the leading batter is ${
      batter?.batsman?.name ||
      "unavailable"
    } with ${batter?.r ?? 0} runs. The leading wicket-taker is ${
      bowler?.bowler?.name ||
      "unavailable"
    } with ${bowler?.w ?? 0} wickets.`;
  }

  if (
    q.includes("how many runs") ||
    q.includes("runs needed") ||
    q.includes("how much")
  ) {
    return match.target
      ? `${match.batting} need ${stats.runsNeeded} runs from ${stats.ballsLeft} balls, with ${10 - match.wickets} wickets remaining.`
      : "The target is not available in the current score data.";
  }

  return `Current situation: ${match.batting} are ${match.score}/${match.wickets} after ${stats.overs} overs. ${
    match.target
      ? `They need ${stats.runsNeeded} runs from ${stats.ballsLeft} balls.`
      : "The target is unavailable."
  } Load the local AI model for a more detailed conversational answer.`;
}

const tableCell: CSSProperties = {
  padding: "12px 10px",
  fontSize: 13,
};

export default function Home() {
  const [match, setMatch] =
    useState<Match>(openingMatch);

  const [ballIndex, setBallIndex] =
    useState(0);

  const [history, setHistory] =
    useState<Ball[]>([]);

  const [engine, setEngine] =
    useState<MLCEngine | null>(null);

  const [modelStatus, setModelStatus] =
    useState("AI not loaded");

  const [progress, setProgress] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [insight, setInsight] =
    useState(() =>
      makeLocalInsight(
        openingMatch,
        initialBalls.slice(0, 6)
      )
    );

  const [chatInput, setChatInput] =
    useState("");

  const [chat, setChat] =
    useState<ChatMessage[]>([
      {
        role: "assistant",
        content:
          "Hi! I'm FanPulse AI. Ask me about the score, required run rate, key players or match situation.",
      },
    ]);

  const [answerLoading, setAnswerLoading] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<"insights" | "chat">(
      "insights"
    );

  const [error, setError] =
    useState("");

  const [liveMatches, setLiveMatches] =
    useState<LiveApiMatch[]>([]);

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  const [liveMode, setLiveMode] =
    useState(false);

  const [liveMatchTitle, setLiveMatchTitle] =
    useState("");

  const [liveStatus, setLiveStatus] =
    useState("Live scores not connected");

  const [liveError, setLiveError] =
    useState("");

  const [lastLiveUpdate, setLastLiveUpdate] =
    useState("");

  const [scorecard, setScorecard] =
    useState<ScorecardData | null>(null);

  const [scorecardLoading, setScorecardLoading] =
    useState(false);

  const [scorecardError, setScorecardError] =
    useState("");

  const engineRef =
    useRef<MLCEngine | null>(null);

  const loadingRef =
    useRef(false);

  const selectedMatchIdRef =
    useRef("");

  const stats = useMemo(
    () => getStats(match),
    [match]
  );

  const recent = useMemo(
    () => history.slice(-6),
    [history]
  );

  const playerInnings = useMemo(() => {
    const innings =
      scorecard?.scorecard || [];

    if (!innings.length) return undefined;

    return (
      innings.find((item) =>
        (item.inning || "")
          .toLowerCase()
          .includes(
            match.batting.toLowerCase()
          )
      ) ||
      innings[innings.length - 1]
    );
  }, [scorecard, match.batting]);

  const batters =
    playerInnings?.batting || [];

  const bowlers =
    playerInnings?.bowling || [];

  const momentum = liveMode
    ? 50
    : Math.max(
        15,
        Math.min(
          90,
          50 +
            (recent.reduce(
              (sum, ball) =>
                sum + ball.runs,
              0
            ) -
              7) *
              2 -
            recent.filter(
              (ball) => ball.wicket
            ).length *
              13
        )
      );

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  /*
   * ---------------------------------------------------------
   * WEBLLM AUTOMATIC CACHE LOADING
   * ---------------------------------------------------------
   *
   * This runs once when the page opens.
   *
   * First visit:
   *   WebLLM downloads the model and stores it in browser cache.
   *
   * Refresh:
   *   WebLLM reuses the cached model for the same MODEL_ID.
   *
   * We don't manually download the model.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadAI();
      }, 300);

    return () =>
      window.clearTimeout(timer);

    // Intentionally run once on initial page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLiveScores =
    useCallback(async () => {
      setLiveStatus(
        "Checking cricket data…"
      );

      setLiveError("");

      try {
        const response = await fetch(
          "/api/matches",
          {
            cache: "no-store",
          }
        );

        const payload =
          await response.json();

        if (
          !response.ok ||
          payload.status === "failure" ||
          !Array.isArray(payload.data)
        ) {
          throw new Error(
            payload.reason ||
              payload.message ||
              "The cricket provider did not return match data."
          );
        }

        const matches: LiveApiMatch[] =
          payload.data.filter(
            (item: LiveApiMatch) =>
              item && item.id
          );

        setLiveMatches(matches);

        if (!matches.length) {
          setLiveStatus(
            "No current matches returned"
          );
          return;
        }

        const selected =
          matches.find(
            (item) =>
              item.id ===
              selectedMatchIdRef.current
          ) ||
          matches.find((item) =>
            /live|in progress|innings break/i.test(
              item.status || ""
            )
          ) ||
          matches[0];

        selectedMatchIdRef.current =
          selected.id;

        setSelectedMatchId(
          selected.id
        );

        const nextMatch =
          toLiveMatch(selected);

        setMatch(nextMatch);

        setLiveMatchTitle(
          selected.name ||
            (selected.teams || []).join(
              " vs "
            )
        );

        setLiveMode(true);
        setBallIndex(0);
        setHistory([]);

        setInsight(
          makeLocalInsight(
            nextMatch,
            []
          )
        );

        setLiveStatus(
          "Cricket data connected"
        );

        setLastLiveUpdate(
          new Date().toLocaleTimeString()
        );
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Unable to load live cricket scores.";

        setLiveError(message);
        setLiveStatus(
          "Live scores unavailable"
        );
      }
    }, []);

  const fetchPlayerScorecard =
    useCallback(
      async (matchId: string) => {
        if (!matchId) return;

        setScorecardLoading(true);
        setScorecardError("");

        try {
          const response =
            await fetch(
              `/api/scorecard?id=${encodeURIComponent(
                matchId
              )}`,
              {
                cache: "no-store",
              }
            );

          const payload =
            await response.json();

          if (
            !response.ok ||
            payload.status === "failure" ||
            !payload.data
          ) {
            throw new Error(
              payload.reason ||
                payload.message ||
                "Player scorecard is not available."
            );
          }

          setScorecard(
            payload.data as ScorecardData
          );
        } catch (e) {
          const message =
            e instanceof Error
              ? e.message
              : "Unable to load player scorecard.";

          setScorecardError(message);
          setScorecard(null);
        } finally {
          setScorecardLoading(false);
        }
      },
      []
    );

  function chooseLiveMatch(
    matchId: string
  ) {
    const selected =
      liveMatches.find(
        (item) => item.id === matchId
      );

    if (!selected) return;

    selectedMatchIdRef.current =
      selected.id;

    setSelectedMatchId(selected.id);

    const nextMatch =
      toLiveMatch(selected);

    setMatch(nextMatch);

    setLiveMatchTitle(
      selected.name ||
        (selected.teams || []).join(
          " vs "
        )
    );

    setLiveMode(true);
    setHistory([]);
    setBallIndex(0);

    setInsight(
      makeLocalInsight(
        nextMatch,
        []
      )
    );

    setChat([
      {
        role: "assistant",
        content: `Selected ${
          selected.name ||
          (selected.teams || []).join(
            " vs "
          )
        }. Ask me about this match.`,
      },
    ]);
  }

  useEffect(() => {
    if (
      liveMode &&
      selectedMatchId
    ) {
      void fetchPlayerScorecard(
        selectedMatchId
      );
    } else {
      setScorecard(null);
      setScorecardError("");
    }
  }, [
    selectedMatchId,
    liveMode,
    fetchPlayerScorecard,
  ]);

  useEffect(() => {
    void fetchLiveScores();

    const timer =
      window.setInterval(() => {
        void fetchLiveScores();
      }, REFRESH_INTERVAL);

    return () =>
      window.clearInterval(timer);
  }, [fetchLiveScores]);

  /*
   * Load WebLLM.
   *
   * CreateMLCEngine automatically uses
   * persistent browser cache when the same
   * MODEL_ID has already been downloaded.
   */
  async function loadAI() {
    if (
      engineRef.current ||
      loadingRef.current
    ) {
      return;
    }

    loadingRef.current = true;

    setLoading(true);
    setError("");
    setProgress(0);
    setModelStatus(
      "Checking local model cache…"
    );

    try {
      if (!("gpu" in navigator)) {
        throw new Error(
          "WebGPU is unavailable. Try the latest Chrome or Edge."
        );
      }

      const created =
        await CreateMLCEngine(
          MODEL_ID,
          {
            initProgressCallback:
              (report) => {
                const percentage =
                  Math.round(
                    (report.progress ||
                      0) * 100
                  );

                setProgress(
                  percentage
                );

                const text =
                  report.text || "";

                if (
                  percentage >=
                  100
                ) {
                  setModelStatus(
                    "Starting local AI…"
                  );
                } else if (
                  /download/i.test(
                    text
                  )
                ) {
                  setModelStatus(
                    "Downloading model for first use…"
                  );
                } else {
                  setModelStatus(
                    text ||
                      "Loading local AI model…"
                  );
                }
              },
          }
        );

      engineRef.current =
        created;

      setEngine(created);

      setProgress(100);

      setModelStatus(
        "AI ready — loaded on this device"
      );
    } catch (e) {
      console.error(
        "WebLLM loading error:",
        e
      );

      engineRef.current = null;
      setEngine(null);

      const message =
        e instanceof Error
          ? e.message
          : "GPU initialization failed.";

      console.error(message);

      setModelStatus(
        "AI failed to start"
      );

      setError(
        "Local AI could not start. Try refreshing the page, closing other GPU-heavy applications, and loading the model again."
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  async function askModel(
    system: string,
    prompt: string,
    conversationHistory: ChatMessage[] = []
  ) {
    const activeEngine =
      engineRef.current;

    if (!activeEngine) return null;

    const messages = [
      {
        role: "system" as const,
        content: system,
      },

      ...conversationHistory
        .slice(-4)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),

      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const result =
      await activeEngine.chat.completions.create(
        {
          messages,
          temperature: 0.2,
          max_tokens: 160,
        }
      );

    return (
      result.choices[0]?.message?.content?.trim() ||
      null
    );
  }

  async function analyzeMatch() {
    const fallback =
      makeLocalInsight(
        match,
        recent.length
          ? recent
          : liveMode
            ? []
            : initialBalls.slice(
                0,
                6
              )
      );

    setInsight(fallback);

    if (
      !engineRef.current ||
      answerLoading
    ) {
      return;
    }

    setAnswerLoading(true);
    setError("");

    try {
      const context =
        buildMatchContext(
          match,
          stats,
          recent,
          scorecard,
          liveMode,
          liveMatchTitle
        );

      const prompt = `
Analyze this cricket match.

MATCH DATA:
${JSON.stringify(context)}

Return:
HEADLINE:
WHAT HAPPENED:
WHY IT MATTERS:
WATCH NEXT:

Use only supplied facts. Do not invent statistics or probabilities.
`;

      const result =
        await askModel(
          AI_SYSTEM_PROMPT,
          prompt
        );

      if (result) {
        setInsight({
          ...fallback,
          headline:
            "FanPulse AI match analysis",
          what: result,
          why:
            "Generated from the available match information and scorecard.",
        });
      }
    } catch (e) {
      console.error(
        "Match analysis error:",
        e
      );

      setError(
        "AI analysis failed. Statistics-based insights remain available."
      );
    } finally {
      setAnswerLoading(false);
    }
  }

  function nextBall() {
    if (
      liveMode ||
      ballIndex >=
        initialBalls.length
    ) {
      return;
    }

    const ball =
      initialBalls[ballIndex];

    setHistory((previous) => [
      ...previous,
      ball,
    ]);

    setMatch((previous) => ({
      ...previous,

      score:
        previous.score +
        ball.runs,

      wickets:
        previous.wickets +
        (ball.wicket ? 1 : 0),

      balls:
        previous.balls + 1,

      striker: ball.wicket
        ? "Suryakumar Yadav"
        : ball.runs % 2 === 1
          ? previous.nonStriker
          : previous.striker,

      nonStriker:
        ball.wicket
          ? previous.nonStriker
          : ball.runs % 2 === 1
            ? previous.striker
            : previous.nonStriker,
    }));

    setBallIndex(
      (previous) =>
        previous + 1
    );
  }

  useEffect(() => {
    if (!history.length) return;

    const timer =
      window.setTimeout(() => {
        void analyzeMatch();
      }, 300);

    return () =>
      window.clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, match]);

  async function sendChat() {
    const question =
      chatInput.trim();

    if (
      !question ||
      answerLoading
    ) {
      return;
    }

    const previousMessages =
      chat.slice(-4);

    setChatInput("");
    setActiveTab("chat");

    setChat((previous) => [
      ...previous,
      {
        role: "user",
        content: question,
      },
    ]);

    setAnswerLoading(true);
    setError("");

    const context =
      buildMatchContext(
        match,
        stats,
        recent,
        scorecard,
        liveMode,
        liveMatchTitle
      );

    const fallback =
      getQuestionFallback(
        question,
        match,
        stats,
        scorecard
      );

    try {
      let result: string | null =
        null;

      if (engineRef.current) {
        result = await askModel(
          AI_SYSTEM_PROMPT,
          `
Answer this exact cricket question.

MATCH DATA:
${JSON.stringify(context)}

QUESTION:
${question}

Instructions:
- Answer the question directly.
- Compare actual scorecard figures when asked.
- Explain calculations when asked for a prediction.
- Say when data is missing.
- Never invent statistics or probabilities.
- Keep your answer concise.
`,
          previousMessages
        );
      }

      setChat((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            result || fallback,
        },
      ]);
    } catch (e) {
      console.error(
        "FanPulse AI chat error:",
        e
      );

      setChat((previous) => [
        ...previous,
        {
          role: "assistant",
          content: fallback,
        },
      ]);

      setError(
        "Local AI encountered an error. Showing a question-specific answer instead."
      );
    } finally {
      setAnswerLoading(false);
    }
  }

  function resetMatch() {
    setLiveMode(false);
    setLiveMatchTitle("");
    setSelectedMatchId("");

    selectedMatchIdRef.current =
      "";

    setScorecard(null);
    setScorecardError("");

    setMatch(openingMatch);
    setBallIndex(0);
    setHistory([]);

    setInsight(
      makeLocalInsight(
        openingMatch,
        initialBalls.slice(0, 6)
      )
    );

    setChat([
      {
        role: "assistant",
        content:
          "Demo match loaded. Ask me anything about the chase!",
      },
    ]);
  }

  const suggestedQuestions = [
    "What could be the predicted final score?",
    "Compare the available player performances.",
    "How many runs are needed?",
    "Is the current run rate enough?",
    "Who is the most impactful player?",
    "Which team has the better chance of winning?",
    "Why is this chase under pressure?",
    "Explain this match in simple language.",
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
        >
          <span className="brand-mark">
            <Activity size={19} />
          </span>

          <span>
            fanpulse
            <span className="brand-ai">
              .ai
            </span>
          </span>
        </a>

        <div className="top-actions">
          <span className="privacy">
            <ShieldCheck size={14} />
            Private browser AI
          </span>

          <span className="live-pill">
            <i />{" "}
            {liveMode
              ? "CRICKET DATA"
              : "DEMO MATCH"}
          </span>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" />{" "}
            THE MATCH, DECODED
          </div>

          <h1>
            Feel every{" "}
            <span>
              turning point.
            </span>
          </h1>

          <p>
            Cricket score updates,
            explained by AI that runs
            on your device.
          </p>
        </div>

        <div className="hero-chip">
          <Trophy size={16} />

          {liveMode
            ? "CRICKET DATA"
            : "T20 INTERNATIONAL"}

          <span>•</span>

          {liveMode
            ? "SCORE FEED"
            : "2ND INNINGS"}
        </div>
      </section>

      <section className="score-layout">
        <div className="score-card panel">
          <div className="match-meta">
            <span>
              {match.batting.toUpperCase()}{" "}
              <b>VS</b>{" "}
              {match.bowling.toUpperCase()}
            </span>

            <span className="innings">
              {liveMode
                ? "LIVE / PROVIDER MATCH"
                : "2ND INNINGS"}
            </span>
          </div>

          <div className="score-main">
            <div>
              <div className="team-label">
                <span className="flag">
                  🏏
                </span>{" "}
                {match.batting}
              </div>

              <div className="score-number">
                {match.score}
                <span>
                  /{match.wickets}
                </span>
              </div>

              <div className="overs-label">
                {stats.overs}{" "}
                <span>OVERS</span>
              </div>
            </div>

            <div className="vs-mark">
              VS
            </div>

            <div className="target-block">
              <span className="target-label">
                TARGET
              </span>

              <strong>
                {match.target || "—"}
              </strong>

              <span className="target-sub">
                {match.target
                  ? `Need ${stats.runsNeeded} runs`
                  : "Not available yet"}
              </span>
            </div>
          </div>

          <div className="score-divider" />

          <div className="score-stats">
            <div>
              <span>CRR</span>
              <strong>
                {stats.currentRate}
              </strong>
            </div>

            <div>
              <span>
                REQUIRED RR
              </span>

              <strong className="lime">
                {stats.requiredRate}
              </strong>
            </div>

            <div>
              <span>
                BALLS LEFT
              </span>

              <strong>
                {match.totalBalls >
                0
                  ? stats.ballsLeft
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                WICKETS LEFT
              </span>

              <strong>
                {Math.max(
                  0,
                  10 -
                    match.wickets
                )}
              </strong>
            </div>
          </div>

          <div className="score-footer">
            <span>
              <i className="dot-live" />
              {liveMode
                ? "Provider score · refresh may be delayed"
                : "Simulated live feed"}
            </span>

            <span>
              {liveMode
                ? `Updated ${
                    lastLiveUpdate ||
                    "—"
                  }`
                : `Last ball: ${
                    history[
                      history.length -
                        1
                    ]?.event ||
                    "—"
                  }`}
            </span>
          </div>
        </div>

        <div className="side-stack">
          <div className="player-card panel">
            <div className="card-kicker">
              <span>BATTERS</span>
              <Target size={15} />
            </div>

            {liveMode &&
            batters.length > 0 ? (
              batters
                .slice(0, 2)
                .map(
                  (
                    batter,
                    index
                  ) => (
                    <div
                      className="player-row"
                      key={
                        batter
                          .batsman
                          ?.id ||
                        index
                      }
                    >
                      <div className="avatar">
                        🏏
                      </div>

                      <div>
                        <strong>
                          {batter
                            .batsman
                            ?.name ||
                            "Unknown batter"}
                        </strong>

                        <span>
                          {batter.r ??
                            0}{" "}
                          runs ·{" "}
                          {batter.b ??
                            0}{" "}
                          balls
                        </span>
                      </div>
                    </div>
                  )
                )
            ) : (
              <>
                <div className="player-row">
                  <div className="avatar">
                    🏏
                  </div>

                  <div>
                    <strong>
                      {match.striker}
                    </strong>

                    <span>
                      {liveMode
                        ? "Batter details unavailable"
                        : "Striker • On strike"}
                    </span>
                  </div>

                  {!liveMode && (
                    <span className="strike">
                      ●
                    </span>
                  )}
                </div>

                <div className="player-row">
                  <div className="avatar muted-avatar">
                    🏏
                  </div>

                  <div>
                    <strong>
                      {
                        match.nonStriker
                      }
                    </strong>

                    <span>
                      {liveMode
                        ? "Batter details unavailable"
                        : "Non-striker"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="player-card panel bowler-card">
            <div className="card-kicker">
              <span>
                BOWLING FIGURES
              </span>
              <Zap size={15} />
            </div>

            {liveMode &&
            bowlers.length > 0 ? (
              bowlers
                .slice(0, 2)
                .map(
                  (
                    bowler,
                    index
                  ) => (
                    <div
                      className="player-row"
                      key={
                        bowler
                          .bowler
                          ?.id ||
                        index
                      }
                    >
                      <div className="avatar bowler-avatar">
                        🏏
                      </div>

                      <div>
                        <strong>
                          {bowler
                            .bowler
                            ?.name ||
                            "Unknown bowler"}
                        </strong>

                        <span>
                          {bowler.o ??
                            0}{" "}
                          overs ·{" "}
                          {bowler.w ??
                            0}{" "}
                          wickets ·{" "}
                          {bowler.r ??
                            0}{" "}
                          runs
                        </span>
                      </div>
                    </div>
                  )
                )
            ) : (
              <div className="player-row">
                <div className="avatar bowler-avatar">
                  🏏
                </div>

                <div>
                  <strong>
                    {match.bowler}
                  </strong>

                  <span>
                    {liveMode
                      ? "Bowler details unavailable"
                      : "Australia • Right-arm fast"}
                  </span>
                </div>
              </div>
            )}

            <div className="bowler-note">
              Player figures from
              the available
              scorecard.
            </div>
          </div>
        </div>
      </section>

      {liveMode && (
        <section
          className="panel"
          style={{
            marginTop: 20,
            padding: 22,
          }}
        >
          <div className="card-topline">
            <div>
              <div className="card-kicker">
                MATCH STATISTICS
              </div>

              <h3>
                Player scorecard
              </h3>
            </div>

            <button
              className="btn-secondary"
              onClick={() =>
                void fetchPlayerScorecard(
                  selectedMatchId
                )
              }
              disabled={
                scorecardLoading ||
                !selectedMatchId
              }
            >
              <RotateCcw
                size={14}
              />

              {scorecardLoading
                ? "Loading…"
                : "Refresh players"}
            </button>
          </div>

          {scorecardLoading && (
            <p
              style={{
                color: "#9ca3af",
                marginTop: 16,
              }}
            >
              Loading player
              statistics…
            </p>
          )}

          {scorecardError && (
            <p
              style={{
                color: "#fca5a5",
                marginTop: 16,
              }}
            >
              {scorecardError}
            </p>
          )}

          {!scorecardLoading &&
            !scorecardError &&
            !scorecard && (
              <p
                style={{
                  color: "#9ca3af",
                  marginTop: 16,
                }}
              >
                Player scorecard
                is not available
                for this match
                yet.
              </p>
            )}

          {scorecard && (
            <>
              <div
                style={{
                  marginTop: 22,
                }}
              >
                <h3
                  style={{
                    marginBottom: 12,
                  }}
                >
                  Batting —{" "}
                  {playerInnings?.inning ||
                    match.batting}
                </h3>

                {batters.length ? (
                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                        minWidth: 520,
                        textAlign:
                          "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            color:
                              "#9ca3af",
                          }}
                        >
                          {[
                            "Batter",
                            "R",
                            "B",
                            "4s",
                            "6s",
                            "SR",
                          ].map(
                            (
                              heading
                            ) => (
                              <th
                                key={
                                  heading
                                }
                                style={
                                  tableCell
                                }
                              >
                                {
                                  heading
                                }
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {batters.map(
                          (
                            batter,
                            index
                          ) => (
                            <tr
                              key={
                                batter
                                  .batsman
                                  ?.id ||
                                index
                              }
                              style={{
                                borderTop:
                                  "1px solid #26372f",
                              }}
                            >
                              <td
                                style={
                                  tableCell
                                }
                              >
                                <strong>
                                  {batter
                                    .batsman
                                    ?.name ||
                                    "Unknown batter"}
                                </strong>

                                <div
                                  style={{
                                    color:
                                      "#9ca3af",
                                    fontSize: 12,
                                    marginTop:
                                      3,
                                  }}
                                >
                                  {batter.dismissalText ||
                                    batter.dismissal ||
                                    ""}
                                </div>
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                <strong>
                                  {batter.r ??
                                    "—"}
                                </strong>
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {batter.b ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {batter[
                                  "4s"
                                ] ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {batter[
                                  "6s"
                                ] ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {batter.sr ??
                                  "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p
                    style={{
                      color:
                        "#9ca3af",
                    }}
                  >
                    No batting
                    figures
                    supplied for
                    this innings.
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: 28,
                }}
              >
                <h3
                  style={{
                    marginBottom: 12,
                  }}
                >
                  Bowling
                </h3>

                {bowlers.length ? (
                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse:
                          "collapse",
                        minWidth: 520,
                        textAlign:
                          "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            color:
                              "#9ca3af",
                          }}
                        >
                          {[
                            "Bowler",
                            "O",
                            "M",
                            "R",
                            "W",
                            "ECO",
                          ].map(
                            (
                              heading
                            ) => (
                              <th
                                key={
                                  heading
                                }
                                style={
                                  tableCell
                                }
                              >
                                {
                                  heading
                                }
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {bowlers.map(
                          (
                            bowler,
                            index
                          ) => (
                            <tr
                              key={
                                bowler
                                  .bowler
                                  ?.id ||
                                index
                              }
                              style={{
                                borderTop:
                                  "1px solid #26372f",
                              }}
                            >
                              <td
                                style={
                                  tableCell
                                }
                              >
                                <strong>
                                  {bowler
                                    .bowler
                                    ?.name ||
                                    "Unknown bowler"}
                                </strong>
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {bowler.o ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {bowler.m ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {bowler.r ??
                                  "—"}
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                <strong>
                                  {bowler.w ??
                                    "—"}
                                </strong>
                              </td>

                              <td
                                style={
                                  tableCell
                                }
                              >
                                {bowler.eco ??
                                  "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p
                    style={{
                      color:
                        "#9ca3af",
                    }}
                  >
                    No bowling
                    figures
                    supplied for
                    this innings.
                  </p>
                )}
              </div>
            </>
          )}

          <p
            style={{
              color: "#9ca3af",
              fontSize: 12,
              marginTop: 18,
            }}
          >
            Figures come from
            the cricket
            scorecard feed.
            They do not
            necessarily
            identify the
            current striker
            or current
            bowler.
          </p>
        </section>
      )}

      <section className="control-row">
        <div className="feed-label">
          <span className="feed-icon">
            <Activity size={16} />
          </span>

          <div>
            <strong>
              {liveMode
                ? "LIVE CRICKET DATA"
                : "LIVE MATCH SIMULATOR"}
            </strong>

            <span>
              {liveMode
                ? liveMatchTitle ||
                  "Selected match"
                : "Advance the sample match one ball at a time"}
            </span>

            <small
              style={{
                display: "block",
                marginTop: 4,
                color: liveError
                  ? "#fca5a5"
                  : "#9ca3af",
              }}
            >
              {liveStatus}
              {liveError
                ? ` · ${liveError}`
                : ""}
            </small>
          </div>
        </div>

        <div
          className="feed-controls"
          style={{
            flexWrap: "wrap",
          }}
        >
          <select
            aria-label="Choose a cricket match"
            value={
              selectedMatchId
            }
            onChange={(event) =>
              chooseLiveMatch(
                event.target.value
              )
            }
            style={{
              maxWidth: 260,
              minHeight: 40,
              padding: "0 10px",
              borderRadius: 10,
              color: "#e5e7eb",
              background:
                "#17251f",
              border:
                "1px solid #34463d",
            }}
          >
            <option value="">
              Choose a current
              match
            </option>

            {liveMatches.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name ||
                    (
                      item.teams ||
                      []
                    ).join(
                      " vs "
                    )}
                </option>
              )
            )}
          </select>

          <button
            className="btn-secondary"
            onClick={() =>
              void fetchLiveScores()
            }
          >
            <RotateCcw
              size={15}
            />{" "}
            Refresh scores
          </button>

          <button
            className="btn-secondary"
            onClick={
              resetMatch
            }
          >
            Demo mode
          </button>

          {!liveMode && (
            <button
              className="btn-primary"
              onClick={
                nextBall
              }
              disabled={
                ballIndex >=
                initialBalls.length
              }
            >
              <Play
                size={15}
                fill="currentColor"
              />

              {ballIndex >=
              initialBalls.length
                ? "Feed complete"
                : "Next ball"}

              <ChevronRight
                size={16}
              />
            </button>
          )}
        </div>
      </section>

      <section className="insight-grid">
        <div className="main-column">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />{" "}
                REAL-TIME CONTEXT
              </div>

              <h2>
                Inside the match
              </h2>
            </div>

            <span className="updated">
              <span className="green-pulse" />{" "}
              Score refreshes
              periodically
            </span>
          </div>

          <div className="momentum-card panel">
            <div className="card-topline">
              <div>
                <div className="card-kicker">
                  MATCH MOMENTUM
                </div>

                <h3>
                  Who has the edge?
                </h3>
              </div>

              <span className="momentum-live">
                <Activity
                  size={14}
                />{" "}
                LIVE SIGNAL
              </span>
            </div>

            <div className="momentum-score">
              <span>
                {match.batting.toUpperCase()}
              </span>

              <div className="momentum-track">
                <div
                  className="momentum-fill"
                  style={{
                    width: `${momentum}%`,
                  }}
                />
              </div>

              <span>
                {match.bowling.toUpperCase()}
              </span>
            </div>

            <div className="momentum-foot">
              <span>
                {liveMode
                  ? "Momentum unavailable from score-only feed"
                  : `${match.batting} signal`}{" "}
                <b>
                  {liveMode
                    ? "—"
                    : `${momentum}%`}
                </b>
              </span>

              <span>
                {liveMode
                  ? "Ball-by-ball data required"
                  : "Illustrative indicator · not win probability"}
              </span>
            </div>
          </div>

          <div className="ai-card panel">
            <div className="ai-card-head">
              <div className="ai-icon">
                <BrainCircuit
                  size={20}
                />
              </div>

              <div>
                <div className="card-kicker">
                  FANPULSE AI INSIGHT
                </div>

                <h3>
                  {insight.headline}
                </h3>
              </div>

              <span className="sparkle">
                <Sparkles
                  size={17}
                />
              </span>
            </div>

            <div className="insight-body">
              <div className="insight-block">
                <span className="insight-label">
                  WHAT HAPPENED
                </span>

                <p>
                  {insight.what}
                </p>
              </div>

              <div className="insight-block">
                <span className="insight-label">
                  WHY IT MATTERS
                </span>

                <p>
                  {insight.why}
                </p>
              </div>
            </div>

            <div className="watch-next">
              <div className="watch-icon">
                <Eye size={18} />
              </div>

              <div>
                <span className="insight-label">
                  WATCH NEXT
                </span>

                <p>
                  {insight.watch}
                </p>
              </div>
            </div>

            <div className="ai-card-footer">
              <span>
                <ShieldCheck
                  size={14}
                />

                {engine
                  ? "Generated with local browser AI"
                  : "Stats-based fallback · load AI for local generation"}
              </span>

              <button
                onClick={() =>
                  void analyzeMatch()
                }
                className="text-button"
                disabled={
                  answerLoading
                }
              >
                {answerLoading
                  ? "Thinking…"
                  : "Refresh insight"}{" "}
                <ArrowUpRight
                  size={14}
                />
              </button>
            </div>
          </div>

          <div className="timeline-card panel">
            <div className="card-topline">
              <div>
                <div className="card-kicker">
                  RECENT DELIVERIES
                </div>

                <h3>
                  {liveMode
                    ? "Ball-by-ball feed"
                    : "The last six balls"}
                </h3>
              </div>

              <span className="timeline-count">
                {liveMode
                  ? "Provider ball-by-ball data unavailable"
                  : `${history.length} / ${initialBalls.length} balls played`}
              </span>
            </div>

            <div className="ball-strip">
              {(
                recent.length
                  ? recent
                  : liveMode
                    ? []
                    : initialBalls.slice(
                        0,
                        6
                      )
              ).map(
                (ball, index) => (
                  <div
                    key={`${ball.over}-${index}`}
                    className={`ball ${
                      ball.wicket
                        ? "wicket"
                        : ball.runs ===
                              4 ||
                            ball.runs ===
                              6
                          ? "boundary"
                          : ""
                    }`}
                  >
                    <strong>
                      {
                        ball.event
                      }
                    </strong>

                    <span>
                      {ball.over}
                    </span>
                  </div>
                )
              )}
            </div>

            <p className="timeline-note">
              {liveMode
                ? "The current-score endpoint does not include ball-by-ball commentary."
                : history.length
                  ? history[
                      history.length -
                        1
                    ]?.note
                  : "Sample delivery sequence. Press Next ball to advance the simulated match."}
            </p>
          </div>
        </div>

        <aside className="right-column">
          <div className="local-card panel">
            <div className="local-card-title">
              <div className="local-icon">
                <Cpu size={18} />
              </div>

              <div>
                <strong>
                  On-device AI
                </strong>

                <span>
                  WebLLM · WebGPU
                </span>
              </div>

              <span
                className={`status-dot ${
                  engine
                    ? "ready"
                    : ""
                }`}
              />
            </div>

            <p>
              Your questions and
              match context are
              processed in this
              browser. No cloud
              LLM API is used.
            </p>

            <div className="model-name">
              <span>MODEL</span>

              <strong>
                Qwen 2.5 · 0.5B
              </strong>

              <small>
                {MODEL_ID}
              </small>
            </div>

            <div className="load-progress">
              <div>
                <span>
                  {modelStatus}
                </span>

                <b>
                  {progress}%
                </b>
              </div>

              <div className="progress-track">
                <i
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            <button
              className="btn-load"
              onClick={() =>
                void loadAI()
              }
              disabled={
                loading || !!engine
              }
            >
              {engine ? (
                <>
                  <ShieldCheck
                    size={15}
                  />
                  Local AI ready
                </>
              ) : loading ? (
                <>
                  <Cpu size={15} />

                  {progress > 0
                    ? `Loading model… ${progress}%`
                    : "Checking local cache…"}
                </>
              ) : (
                <>
                  <Cpu size={15} />
                  Load local AI
                  model
                </>
              )}
            </button>

            {error && (
              <div className="error-note">
                {error}
              </div>
            )}

            <div className="privacy-note">
              <ShieldCheck
                size={13}
              />{" "}
              Model runs on
              your device after
              the first download.
            </div>
          </div>

          <div className="key-player panel">
            <div className="card-kicker">
              PLAYER TO WATCH{" "}
              <Zap size={14} />
            </div>

            <div className="key-player-main">
              <div className="big-avatar">
                🏏
              </div>

              <div>
                <strong>
                  {batters[0]
                    ?.batsman
                    ?.name ||
                    match.striker}
                </strong>

                <span>
                  {liveMode
                    ? "Player listed in scorecard"
                    : "Currently on strike (demo)"}
                </span>
              </div>
            </div>

            <p>
              {liveMode
                ? batters.length
                  ? `${batters[0]?.r ?? 0} runs from ${batters[0]?.b ?? 0} balls in the available scorecard.`
                  : "Player details are not available in the current scorecard."
                : insight.key}
            </p>

            <div className="player-tag">
              <span /> KEY BATTER
              RIGHT NOW
            </div>
          </div>

          <div className="fantasy-card panel">
            <div className="card-kicker">
              FANTASY IMPACT{" "}
              <Trophy size={14} />
            </div>

            <h3>
              What matters for
              fantasy fans?
            </h3>

            <div className="fantasy-row">
              <span className="fantasy-icon green">
                <Zap size={15} />
              </span>

              <div>
                <strong>
                  {batters[0]
                    ?.batsman
                    ?.name ||
                    match.striker}
                </strong>

                <small>
                  {liveMode
                    ? "Batting figures from scorecard"
                    : "Opportunity to add batting points"}
                </small>
              </div>

              <span className="impact-label">
                BAT
              </span>
            </div>

            <div className="fantasy-row">
              <span className="fantasy-icon orange">
                <Target
                  size={15}
                />
              </span>

              <div>
                <strong>
                  {bowlers[0]
                    ?.bowler
                    ?.name ||
                    match.bowler}
                </strong>

                <small>
                  {liveMode
                    ? "Bowling figures from scorecard"
                    : "Wicket-taking opportunity"}
                </small>
              </div>

              <span className="impact-label">
                BOWL
              </span>
            </div>

            <p className="disclaimer">
              Qualitative context
              only. Not a
              fantasy-points or
              outcome prediction.
            </p>
          </div>
        </aside>
      </section>

      <section className="chat-section panel">
        <div className="chat-header">
          <div className="chat-title-icon">
            <MessageCircle
              size={19}
            />
          </div>

          <div>
            <div className="card-kicker">
              YOUR PERSONAL MATCH
              COMPANION
            </div>

            <h2>
              Ask Match AI
            </h2>

            <p>
              Get the match
              explained in plain
              language.
            </p>
          </div>

          <span className="chat-local">
            <span />{" "}
            {engine
              ? "Local AI active"
              : "Question-specific demo mode"}
          </span>
        </div>

        <div className="chat-tabs">
          <button
            className={
              activeTab ===
              "insights"
                ? "selected"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "insights"
              )
            }
          >
            Suggested
            questions
          </button>

          <button
            className={
              activeTab === "chat"
                ? "selected"
                : ""
            }
            onClick={() =>
              setActiveTab("chat")
            }
          >
            Conversation
          </button>
        </div>

        {activeTab ===
        "insights" ? (
          <div className="suggestions">
            {suggestedQuestions.map(
              (question) => (
                <button
                  key={question}
                  onClick={() => {
                    setChatInput(
                      question
                    );
                    setActiveTab(
                      "chat"
                    );
                  }}
                >
                  {question}
                  <ChevronRight
                    size={15}
                  />
                </button>
              )
            )}
          </div>
        ) : (
          <div className="chat-messages">
            {chat.map(
              (
                message,
                index
              ) => (
                <div
                  key={index}
                  className={`message ${message.role}`}
                >
                  <span>
                    {message.role ===
                    "assistant"
                      ? "FP"
                      : "YOU"}
                  </span>

                  <p>
                    {
                      message.content
                    }
                  </p>
                </div>
              )
            )}

            {answerLoading && (
              <div className="thinking">
                FanPulse is
                thinking…
              </div>
            )}
          </div>
        )}

        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault();

            setActiveTab(
              "chat"
            );

            void sendChat();
          }}
        >
          <input
            value={chatInput}
            onChange={(event) =>
              setChatInput(
                event.target.value
              )
            }
            placeholder="Ask about scores, players, predictions or match analysis..."
            aria-label="Ask Match AI"
          />

          <button
            disabled={
              !chatInput.trim() ||
              answerLoading
            }
          >
            <Send size={16} />
            <span>Ask AI</span>
          </button>
        </form>

        <div className="chat-foot">
          <CircleHelp size={13} />

          Load the local AI
          model for
          conversational answers.
          Without it, FanPulse
          uses question-specific
          calculations and
          scorecard data.
        </div>
      </section>

      <footer>
        <a
          className="brand footer-brand"
          href="#"
        >
          <span className="brand-mark">
            <Activity size={16} />
          </span>

          <span>
            fanpulse
            <span className="brand-ai">
              .ai
            </span>
          </span>
        </a>

        <span>
          Built for fans,
          powered on-device.
        </span>

        <span>
          Dream11 FDE Intern
          Assignment · Prototype
        </span>
      </footer>
    </main>
  );
}