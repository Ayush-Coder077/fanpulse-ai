
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  CircleHelp,
  Cpu,
  Eye,
  Gauge,
  MessageCircle,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap
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

type ScorecardBatter = {
  batsman?: {
    id?: string;
    name?: string;
  };
  r?: number | string;
  b?: number | string;
  "4s"?: number | string;
  "6s"?: number | string;
  sr?: number | string;
  dismissal?: string;
  dismissalText?: string;
};

type ScorecardBowler = {
  bowler?: {
    id?: string;
    name?: string;
  };
  o?: number | string;
  m?: number | string;
  r?: number | string;
  w?: number | string;
  nb?: number | string;
  wd?: number | string;
  eco?: number | string;
};

type ScorecardInnings = {
  inning?: string;
  batting?: ScorecardBatter[];
  bowling?: ScorecardBowler[];
};

type ScorecardData = {
  scorecard?: ScorecardInnings[];
};

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

const initialBalls: Ball[] = [
  { over: "15.1", event: "1", runs: 1, note: "Rotated strike" },
  { over: "15.2", event: "4", runs: 4, note: "Driven through covers" },
  { over: "15.3", event: "2", runs: 2, note: "Good running" },
  { over: "15.4", event: "W", runs: 0, wicket: true, note: "Caught at deep midwicket" },
  { over: "15.5", event: "1", runs: 1, note: "New batter gets off the mark" },
  { over: "15.6", event: "6", runs: 6, note: "Dispatched over long-on" },
  { over: "16.1", event: "4", runs: 4, note: "Four through point" },
  { over: "16.2", event: "2", runs: 2, note: "Two more" },
  { over: "16.3", event: "1", runs: 1, note: "Single to midwicket" },
  { over: "16.4", event: "0", runs: 0, note: "Dot ball" },
  { over: "16.5", event: "6", runs: 6, note: "Big hit over extra cover" },
  { over: "16.6", event: "1", runs: 1, note: "Keeps the strike moving" },
  { over: "17.1", event: "4", runs: 4, note: "Beats the fielder" },
  { over: "17.2", event: "1", runs: 1, note: "Single" },
  { over: "17.3", event: "W", runs: 0, wicket: true, note: "Bowled! Middle stump disturbed" },
  { over: "17.4", event: "2", runs: 2, note: "Two runs" },
  { over: "17.5", event: "4", runs: 4, note: "Boundary behind square" },
  { over: "17.6", event: "1", runs: 1, note: "End of over" }
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
  bowler: "Pat Cummins"
};

function oversText(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function rate(runs: number, balls: number) {
  return balls > 0 ? ((runs / balls) * 6).toFixed(1) : "0.0";
}

function oversToBalls(value: number | string | undefined) {
  const overs = Number(value ?? 0);

  if (!Number.isFinite(overs)) return 0;

  const wholeOvers = Math.floor(overs);
  const ballsInOver = Math.round((overs - wholeOvers) * 10);

  return wholeOvers * 6 + Math.min(5, Math.max(0, ballsInOver));
}

function toLiveMatch(item: LiveApiMatch): Match {
  const innings = Array.isArray(item.score) ? item.score : [];

  const currentInnings = innings[innings.length - 1];
  const previousInnings =
    innings.length > 1 ? innings[innings.length - 2] : undefined;

  const battingFromInnings = currentInnings?.inning?.replace(
    /\s+Inning\s+\d+$/i,
    ""
  );

  const batting = battingFromInnings || item.teams?.[0] || "Batting team";

  const bowling =
    item.teams?.find(
      team => team.toLowerCase() !== batting.toLowerCase()
    ) ||
    item.teams?.[1] ||
    "Bowling team";

  const matchType = (item.matchType || "").toLowerCase();

  const totalBalls = matchType.includes("t20")
    ? 120
    : matchType.includes("odi")
      ? 300
      : 0;

  return {
    batting,
    bowling,
    score: Number(currentInnings?.r ?? 0),
    wickets: Number(currentInnings?.w ?? 0),
    balls: oversToBalls(currentInnings?.o),
    target: previousInnings
      ? Number(previousInnings.r ?? 0) + 1
      : 0,
    totalBalls,
    striker: "Player details unavailable",
    nonStriker: "Player details unavailable",
    bowler: "Player details unavailable"
  };
}

function getStats(match: Match) {
  const ballsLeft =
    match.totalBalls > 0
      ? Math.max(0, match.totalBalls - match.balls)
      : 0;

  const runsNeeded =
    match.target > 0
      ? Math.max(0, match.target - match.score)
      : 0;

  return {
    ballsLeft,
    runsNeeded,
    requiredRate:
      ballsLeft > 0 && match.target > 0
        ? ((runsNeeded / ballsLeft) * 6).toFixed(1)
        : "—",
    currentRate: rate(match.score, match.balls),
    overs: oversText(match.balls)
  };
}

function makeLocalInsight(match: Match, recent: Ball[]) {
  const s = getStats(match);

  const recentRuns = recent
    .slice(-6)
    .reduce((sum, ball) => sum + ball.runs, 0);

  const recentWickets = recent
    .slice(-6)
    .filter(ball => ball.wicket).length;

  const pressure =
    Number(s.requiredRate) > 12 || s.ballsLeft < 18;

  return {
    headline: recentWickets
      ? "A wicket has changed the equation"
      : recentRuns >= 14
        ? "Batting side has found momentum"
        : match.target > 0
          ? "The chase is entering its decisive phase"
          : "Current innings snapshot",

    what:
      match.target > 0
        ? `At ${match.score}/${match.wickets} after ${s.overs} overs, ${match.batting} needs ${s.runsNeeded} from ${s.ballsLeft} balls.`
        : `${match.batting} are ${match.score}/${match.wickets} after ${s.overs} overs. The current run rate is ${s.currentRate}.`,

    why: `${recentRuns} runs and ${recentWickets} wicket(s) came in the last ${Math.min(6, recent.length)} recorded balls. ${
      match.target > 0
        ? `The required rate is ${s.requiredRate} per over.`
        : "A target is not available in this score feed."
    }`,

    watch: pressure
      ? "Watch the next few deliveries closely; they could define the innings."
      : `Watch whether ${match.batting} can maintain its scoring rate.`,

    key:
      match.striker === "Player details unavailable"
        ? "Current batter-level details are not included in this live-score response."
        : `${match.striker} is currently on strike.`,

    momentum: recentWickets
      ? "AUS"
      : recentRuns >= 14
        ? "IND"
        : "EVEN"
  };
}

export default function Home() {
  const [match, setMatch] = useState<Match>(openingMatch);
  const [ballIndex, setBallIndex] = useState(0);
  const [history, setHistory] = useState<Ball[]>([]);

  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [modelStatus, setModelStatus] = useState("AI not loaded");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const [insight, setInsight] = useState(() =>
    makeLocalInsight(openingMatch, initialBalls.slice(0, 6))
  );

  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Hi! I’m FanPulse AI. Ask me why the chase is under pressure, who the key player is, or what to watch next."
    }
  ]);

  const [answerLoading, setAnswerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "chat">("insights");
  const [error, setError] = useState("");

  const [liveMatches, setLiveMatches] = useState<LiveApiMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [liveMatchTitle, setLiveMatchTitle] = useState("");
  const [liveStatus, setLiveStatus] = useState("Live scores not connected");
  const [liveError, setLiveError] = useState("");
  const [lastLiveUpdate, setLastLiveUpdate] = useState("");

  // Player scorecard state
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState("");

  const selectedMatchIdRef = useRef("");
  const engineRef = useRef<MLCEngine | null>(null);

  const stats = useMemo(() => getStats(match), [match]);

  const recent = history.slice(-6);

  const recentRuns = recent.reduce(
    (sum, ball) => sum + ball.runs,
    0
  );

  const momentum = liveMode
    ? 50
    : Math.max(
        15,
        Math.min(
          90,
          50 +
            (recentRuns - 7) * 2 -
            recent.filter(ball => ball.wicket).length * 13
        )
      );

  // Find the innings corresponding to the current batting team.
  const playerInnings = useMemo(() => {
    const innings = scorecard?.scorecard || [];

    if (!innings.length) return undefined;

    const matchingInnings = innings.find(inning =>
      (inning.inning || "")
        .toLowerCase()
        .includes(match.batting.toLowerCase())
    );

    // The latest innings is a fallback when team naming differs.
    return matchingInnings || innings[innings.length - 1];
  }, [scorecard, match.batting]);

  const batters = playerInnings?.batting || [];
  const bowlers = playerInnings?.bowling || [];

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  async function fetchLiveScores() {
    setLiveStatus("Checking cricket data…");
    setLiveError("");

    try {
      const response = await fetch("/api/matches");
      const payload = await response.json();

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

      const matches: LiveApiMatch[] = payload.data.filter(
        (item: LiveApiMatch) => item && item.id
      );

      setLiveMatches(matches);

      if (!matches.length) {
        setLiveStatus("No current matches returned");
        return;
      }

      const selected =
        matches.find(
          item => item.id === selectedMatchIdRef.current
        ) ||
        matches.find(item =>
          /live|in progress|innings break/i.test(item.status || "")
        ) ||
        matches[0];

      selectedMatchIdRef.current = selected.id;

      setSelectedMatchId(selected.id);
      setMatch(toLiveMatch(selected));

      setLiveMatchTitle(
        selected.name || `${(selected.teams || []).join(" vs ")}`
      );

      setLiveMode(true);
      setBallIndex(0);
      setHistory([]);

      setInsight(makeLocalInsight(toLiveMatch(selected), []));

      setLiveStatus("Cricket data connected");
      setLastLiveUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to load live cricket scores.";

      setLiveError(message);
      setLiveStatus("Live scores unavailable");
    }
  }

  async function fetchPlayerScorecard(matchId: string) {
    if (!matchId) return;

    setScorecardLoading(true);
    setScorecardError("");
    setScorecard(null);

    try {
      const response = await fetch(
        `/api/scorecard?id=${encodeURIComponent(matchId)}`
      );

      const payload = await response.json();

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

      setScorecard(payload.data as ScorecardData);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to load player scorecard.";

      setScorecardError(message);
    } finally {
      setScorecardLoading(false);
    }
  }

  function chooseLiveMatch(matchId: string) {
    const selected = liveMatches.find(
      item => item.id === matchId
    );

    if (!selected) return;

    selectedMatchIdRef.current = selected.id;

    setSelectedMatchId(selected.id);
    setMatch(toLiveMatch(selected));

    setLiveMatchTitle(
      selected.name || `${(selected.teams || []).join(" vs ")}`
    );

    setLiveMode(true);
    setHistory([]);
    setBallIndex(0);

    setInsight(makeLocalInsight(toLiveMatch(selected), []));
  }

  // Load the selected match's scorecard whenever the match changes.
  useEffect(() => {
    if (liveMode && selectedMatchId) {
      void fetchPlayerScorecard(selectedMatchId);
    } else {
      setScorecard(null);
      setScorecardError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId, liveMode]);

  // Load live matches and refresh the score feed every 15 minutes.
  useEffect(() => {
    void fetchLiveScores();

    const timer = window.setInterval(() => {
      void fetchLiveScores();
    }, 15 * 60 * 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAI() {
    if (engineRef.current || loading) return;

    setLoading(true);
    setError("");
    setModelStatus("Preparing browser AI…");
    setProgress(0);

    try {
      if (!("gpu" in navigator)) {
        throw new Error(
          "WebGPU is not available in this browser. Try the latest Chrome or Edge on a compatible device."
        );
      }

      const created = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: report => {
          setModelStatus(report.text || "Downloading model…");
          setProgress(
            Math.round((report.progress || 0) * 100)
          );
        }
      });

      engineRef.current = created;
      setEngine(created);

      setModelStatus("AI ready — running on this device");
      setProgress(100);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not load the local model.";

      setError(message);
      setModelStatus("Local AI unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function askModel(system: string, prompt: string) {
    const active = engineRef.current;

    if (!active) return null;

    const result = await active.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 240
    });

    return result.choices[0]?.message?.content || null;
  }

  async function analyzeMatch() {
    const fallback = makeLocalInsight(
      match,
      recent.length
        ? recent
        : liveMode
          ? []
          : initialBalls.slice(0, 6)
    );

    setInsight(fallback);

    if (!engineRef.current) return;

    setAnswerLoading(true);

    try {
      const prompt = `Current verified match state: ${JSON.stringify({
        ...match,
        ...stats,
        recentBalls: recent.map(ball => ({
          event: ball.event,
          runs: ball.runs,
          wicket: !!ball.wicket,
          note: ball.note
        }))
      })}.

Return five concise labeled sections: HEADLINE, WHAT HAPPENED, WHY IT MATTERS, WATCH NEXT, KEY PLAYER.
Use only supplied facts. Do not invent batter scores, probabilities, ball-by-ball events, or player names.
If player or delivery details are unavailable, say so.`;

      const result = await askModel(
        "You are FanPulse, a concise cricket companion. Explain the match in plain language. Never invent statistics.",
        prompt
      );

      if (result) {
        setInsight({
          ...fallback,
          headline: result.slice(0, 110),
          what: result
        });
      }
    } catch {
      setError(
        "AI analysis failed. The stats-based insight is still available."
      );
    } finally {
      setAnswerLoading(false);
    }
  }

  function nextBall() {
    if (liveMode || ballIndex >= initialBalls.length) return;

    const ball = initialBalls[ballIndex];

    setHistory(prev => [...prev, ball]);

    setMatch(prev => ({
      ...prev,
      score: prev.score + ball.runs,
      wickets: prev.wickets + (ball.wicket ? 1 : 0),
      balls: prev.balls + 1,
      striker: ball.wicket
        ? "Suryakumar Yadav"
        : ball.runs % 2 === 1
          ? prev.nonStriker
          : prev.striker,
      nonStriker: ball.wicket
        ? prev.nonStriker
        : ball.runs % 2 === 1
          ? prev.striker
          : prev.nonStriker
    }));

    setBallIndex(prev => prev + 1);
  }

  useEffect(() => {
    if (history.length) {
      const timer = window.setTimeout(() => {
        void analyzeMatch();
      }, 150);

      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, match]);

  async function sendChat() {
    const question = chatInput.trim();

    if (!question || answerLoading) return;

    setChatInput("");

    setChat(prev => [
      ...prev,
      { role: "user", content: question }
    ]);

    setAnswerLoading(true);

    const fallback = `The current score is ${match.score}/${match.wickets} in ${stats.overs} overs. ${match.batting} needs ${stats.runsNeeded} from ${stats.ballsLeft} balls, at a required rate of ${stats.requiredRate}. ${insight.watch}`;

    try {
      const result = await askModel(
        "You are FanPulse AI, a helpful live cricket explainer. Answer in 2-4 short sentences. Use only the match state supplied. If something is not provided, say so instead of guessing. Do not invent player names or ball-by-ball events.",
        `Match state: ${JSON.stringify({
          ...match,
          ...stats,
          recentBalls: recent
        })}\nFan question: ${question}`
      );

      setChat(prev => [
        ...prev,
        {
          role: "assistant",
          content: result || fallback
        }
      ]);
    } catch {
      setChat(prev => [
        ...prev,
        { role: "assistant", content: fallback }
      ]);
    } finally {
      setAnswerLoading(false);
    }
  }

  function resetMatch() {
    setLiveMode(false);
    setLiveMatchTitle("");
    setSelectedMatchId("");
    selectedMatchIdRef.current = "";

    setScorecard(null);
    setScorecardError("");

    setMatch(openingMatch);
    setBallIndex(0);
    setHistory([]);

    setInsight(
      makeLocalInsight(openingMatch, initialBalls.slice(0, 6))
    );

    setChat([
      {
        role: "assistant",
        content: "Match reset. Ask me anything about the chase!"
      }
    ]);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Activity size={19} />
          </span>
          <span>
            fanpulse<span className="brand-ai">.ai</span>
          </span>
        </a>

        <div className="top-actions">
          <span className="privacy">
            <ShieldCheck size={14} /> Private browser AI
          </span>
          <span className="live-pill">
            <i /> DEMO MATCH
          </span>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE MATCH, DECODED
          </div>

          <h1>
            Feel every <span>turning point.</span>
          </h1>

          <p>
            Cricket score updates, explained by AI that runs on your device.
          </p>
        </div>

        <div className="hero-chip">
          <Trophy size={16} />
          {liveMode ? "CRICKET DATA" : "T20 INTERNATIONAL"}
          <span>•</span>
          {liveMode ? "SCORE FEED" : "2ND INNINGS"}
        </div>
      </section>

      <section className="score-layout">
        <div className="score-card panel">
          <div className="match-meta">
            <span>
              {match.batting.toUpperCase()} <b>VS</b>{" "}
              {match.bowling.toUpperCase()}
            </span>
            <span className="innings">
              {liveMode ? "LIVE MATCH" : "2ND INNINGS"}
            </span>
          </div>

          <div className="score-main">
            <div>
              <div className="team-label">
                <span className="flag">🏏</span> {match.batting}
              </div>

              <div className="score-number">
                {match.score}
                <span>/{match.wickets}</span>
              </div>

              <div className="overs-label">
                {stats.overs} <span>OVERS</span>
              </div>
            </div>

            <div className="vs-mark">VS</div>

            <div className="target-block">
              <span className="target-label">TARGET</span>
              <strong>{match.target || "—"}</strong>
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
              <strong>{stats.currentRate}</strong>
            </div>

            <div>
              <span>REQUIRED RR</span>
              <strong className="lime">{stats.requiredRate}</strong>
            </div>

            <div>
              <span>BALLS LEFT</span>
              <strong>
                {match.totalBalls > 0 ? stats.ballsLeft : "—"}
              </strong>
            </div>

            <div>
              <span>WICKETS LEFT</span>
              <strong>{10 - match.wickets}</strong>
            </div>
          </div>

          <div className="score-footer">
            <span>
              <i className="dot-live" />
              {liveMode
                ? "Provider live score · may be delayed"
                : "Simulated live feed"}
            </span>

            <span>
              {liveMode
                ? `Updated ${lastLiveUpdate || "—"}`
                : `Last ball: ${history[history.length - 1]?.event || "—"}`}
            </span>
          </div>
        </div>

        <div className="side-stack">
          <div className="player-card panel">
            <div className="card-kicker">
              <span>BATTERS</span>
              <Target size={15} />
            </div>

            {liveMode && batters.length > 0 ? (
              batters.slice(0, 2).map((batter, index) => (
                <div className="player-row" key={batter.batsman?.id || index}>
                  <div className="avatar">🏏</div>
                  <div>
                    <strong>
                      {batter.batsman?.name || "Unknown batter"}
                    </strong>
                    <span>
                      {batter.r ?? 0} runs · {batter.b ?? 0} balls
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="player-row">
                  <div className="avatar">🏏</div>
                  <div>
                    <strong>{match.striker}</strong>
                    <span>
                      {liveMode
                        ? "Batter details unavailable"
                        : "Striker • On strike"}
                    </span>
                  </div>
                  {!liveMode && <span className="strike">●</span>}
                </div>

                <div className="player-row">
                  <div className="avatar muted-avatar">🏏</div>
                  <div>
                    <strong>{match.nonStriker}</strong>
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
              <span>BOWLING FIGURES</span>
              <Zap size={15} />
            </div>

            {liveMode && bowlers.length > 0 ? (
              bowlers.slice(0, 2).map((bowler, index) => (
                <div className="player-row" key={bowler.bowler?.id || index}>
                  <div className="avatar bowler-avatar">🏏</div>
                  <div>
                    <strong>
                      {bowler.bowler?.name || "Unknown bowler"}
                    </strong>
                    <span>
                      {bowler.o ?? 0} overs · {bowler.w ?? 0} wickets ·{" "}
                      {bowler.r ?? 0} runs
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="player-row">
                <div className="avatar bowler-avatar">🏏</div>
                <div>
                  <strong>{match.bowler}</strong>
                  <span>
                    {liveMode
                      ? "Bowler details unavailable"
                      : "Australia • Right-arm fast"}
                  </span>
                </div>
              </div>
            )}

            <div className="bowler-note">
              Player figures from the available scorecard.
            </div>
          </div>
        </div>
      </section>

      {/* Full player scorecard */}
      {liveMode && (
        <section className="panel" style={{ marginTop: 20, padding: 22 }}>
          <div className="card-topline">
            <div>
              <div className="card-kicker">MATCH STATISTICS</div>
              <h3>Player scorecard</h3>
            </div>

            <button
              className="btn-secondary"
              onClick={() =>
                void fetchPlayerScorecard(selectedMatchId)
              }
              disabled={scorecardLoading || !selectedMatchId}
            >
              <RotateCcw size={14} />
              {scorecardLoading ? "Loading…" : "Refresh players"}
            </button>
          </div>

          {scorecardLoading && (
            <p style={{ color: "#9ca3af", marginTop: 16 }}>
              Loading player statistics…
            </p>
          )}

          {scorecardError && (
            <p style={{ color: "#fca5a5", marginTop: 16 }}>
              {scorecardError}
            </p>
          )}

          {!scorecardLoading && !scorecardError && !scorecard && (
            <p style={{ color: "#9ca3af", marginTop: 16 }}>
              Player scorecard is not available for this match yet.
            </p>
          )}

          {scorecard && (
            <>
              <div style={{ marginTop: 22 }}>
                <h3 style={{ marginBottom: 12 }}>
                  Batting — {playerInnings?.inning || match.batting}
                </h3>

                {batters.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 520,
                        textAlign: "left"
                      }}
                    >
                      <thead>
                        <tr style={{ color: "#9ca3af" }}>
                          <th style={tableCell}>Batter</th>
                          <th style={tableCell}>R</th>
                          <th style={tableCell}>B</th>
                          <th style={tableCell}>4s</th>
                          <th style={tableCell}>6s</th>
                          <th style={tableCell}>SR</th>
                        </tr>
                      </thead>

                      <tbody>
                        {batters.map((batter, index) => (
                          <tr
                            key={batter.batsman?.id || index}
                            style={{ borderTop: "1px solid #26372f" }}
                          >
                            <td style={tableCell}>
                              <strong>
                                {batter.batsman?.name || "Unknown batter"}
                              </strong>
                              <div
                                style={{
                                  color: "#9ca3af",
                                  fontSize: 12,
                                  marginTop: 3
                                }}
                              >
                                {batter.dismissalText ||
                                  batter.dismissal ||
                                  ""}
                              </div>
                            </td>

                            <td style={tableCell}>
                              <strong>{batter.r ?? "—"}</strong>
                            </td>
                            <td style={tableCell}>{batter.b ?? "—"}</td>
                            <td style={tableCell}>{batter["4s"] ?? "—"}</td>
                            <td style={tableCell}>{batter["6s"] ?? "—"}</td>
                            <td style={tableCell}>{batter.sr ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#9ca3af" }}>
                    No batting figures supplied for this innings.
                  </p>
                )}
              </div>

              <div style={{ marginTop: 28 }}>
                <h3 style={{ marginBottom: 12 }}>Bowling</h3>

                {bowlers.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: 520,
                        textAlign: "left"
                      }}
                    >
                      <thead>
                        <tr style={{ color: "#9ca3af" }}>
                          <th style={tableCell}>Bowler</th>
                          <th style={tableCell}>O</th>
                          <th style={tableCell}>M</th>
                          <th style={tableCell}>R</th>
                          <th style={tableCell}>W</th>
                          <th style={tableCell}>ECO</th>
                        </tr>
                      </thead>

                      <tbody>
                        {bowlers.map((bowler, index) => (
                          <tr
                            key={bowler.bowler?.id || index}
                            style={{ borderTop: "1px solid #26372f" }}
                          >
                            <td style={tableCell}>
                              <strong>
                                {bowler.bowler?.name || "Unknown bowler"}
                              </strong>
                            </td>
                            <td style={tableCell}>{bowler.o ?? "—"}</td>
                            <td style={tableCell}>{bowler.m ?? "—"}</td>
                            <td style={tableCell}>{bowler.r ?? "—"}</td>
                            <td style={tableCell}>
                              <strong>{bowler.w ?? "—"}</strong>
                            </td>
                            <td style={tableCell}>{bowler.eco ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#9ca3af" }}>
                    No bowling figures supplied for this innings.
                  </p>
                )}
              </div>
            </>
          )}

          <p
            style={{
              color: "#9ca3af",
              fontSize: 12,
              marginTop: 18
            }}
          >
            Figures are provided by the cricket scorecard feed. They do not
            necessarily identify the current striker or current bowler.
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
              {liveMode ? "LIVE CRICKET DATA" : "LIVE MATCH SIMULATOR"}
            </strong>

            <span>
              {liveMode
                ? liveMatchTitle || "Selected match"
                : "Advance the sample match one ball at a time"}
            </span>

            <small
              style={{
                display: "block",
                marginTop: 4,
                color: liveError ? "#fca5a5" : "#9ca3af"
              }}
            >
              {liveStatus}
              {liveError ? ` · ${liveError}` : ""}
            </small>
          </div>
        </div>

        <div className="feed-controls" style={{ flexWrap: "wrap" }}>
          <select
            aria-label="Choose a cricket match"
            value={selectedMatchId}
            onChange={e => chooseLiveMatch(e.target.value)}
            style={{
              maxWidth: 260,
              minHeight: 40,
              padding: "0 10px",
              borderRadius: 10,
              color: "#e5e7eb",
              background: "#17251f",
              border: "1px solid #34463d"
            }}
          >
            <option value="">Choose a current match</option>

            {liveMatches.map(item => (
              <option key={item.id} value={item.id}>
                {item.name || (item.teams || []).join(" vs ")}
              </option>
            ))}
          </select>

          <button
            className="btn-secondary"
            onClick={() => void fetchLiveScores()}
          >
            <RotateCcw size={15} /> Refresh scores
          </button>

          <button className="btn-secondary" onClick={resetMatch}>
            Demo mode
          </button>

          {!liveMode && (
            <button
              className="btn-primary"
              onClick={nextBall}
              disabled={ballIndex >= initialBalls.length}
            >
              <Play size={15} fill="currentColor" />
              {ballIndex >= initialBalls.length
                ? "Feed complete"
                : "Next ball"}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </section>

      <section className="insight-grid">
        <div className="main-column">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> REAL-TIME CONTEXT
              </div>
              <h2>Inside the match</h2>
            </div>

            <span className="updated">
              <span className="green-pulse" /> Score refreshes periodically
            </span>
          </div>

          <div className="momentum-card panel">
            <div className="card-topline">
              <div>
                <div className="card-kicker">MATCH MOMENTUM</div>
                <h3>Who has the edge?</h3>
              </div>

              <span className="momentum-live">
                <Activity size={14} /> LIVE SIGNAL
              </span>
            </div>

            <div className="momentum-score">
              <span>{match.batting.toUpperCase()}</span>

              <div className="momentum-track">
                <div
                  className="momentum-fill"
                  style={{ width: `${momentum}%` }}
                />
              </div>

              <span>{match.bowling.toUpperCase()}</span>
            </div>

            <div className="momentum-foot">
              <span>
                {liveMode
                  ? "Momentum unavailable from score-only feed"
                  : `${match.batting} signal`}{" "}
                <b>{liveMode ? "—" : `${momentum}%`}</b>
              </span>

              <span>
                {liveMode
                  ? "Recent ball-by-ball data is required"
                  : "Illustrative momentum indicator · not win probability"}
              </span>
            </div>
          </div>

          <div className="ai-card panel">
            <div className="ai-card-head">
              <div className="ai-icon">
                <BrainCircuit size={20} />
              </div>

              <div>
                <div className="card-kicker">FANPULSE AI INSIGHT</div>
                <h3>{insight.headline}</h3>
              </div>

              <span className="sparkle">
                <Sparkles size={17} />
              </span>
            </div>

            <div className="insight-body">
              <div className="insight-block">
                <span className="insight-label">WHAT HAPPENED</span>
                <p>{insight.what}</p>
              </div>

              <div className="insight-block">
                <span className="insight-label">WHY IT MATTERS</span>
                <p>{insight.why}</p>
              </div>
            </div>

            <div className="watch-next">
              <div className="watch-icon">
                <Eye size={18} />
              </div>

              <div>
                <span className="insight-label">WATCH NEXT</span>
                <p>{insight.watch}</p>
              </div>
            </div>

            <div className="ai-card-footer">
              <span>
                <ShieldCheck size={14} />
                {engine
                  ? "Generated with local browser AI"
                  : "Stats-based fallback · load AI for local generation"}
              </span>

              <button
                onClick={() => void analyzeMatch()}
                className="text-button"
                disabled={answerLoading}
              >
                {answerLoading ? "Thinking…" : "Refresh insight"}{" "}
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          <div className="timeline-card panel">
            <div className="card-topline">
              <div>
                <div className="card-kicker">RECENT DELIVERIES</div>
                <h3>
                  {liveMode ? "Ball-by-ball feed" : "The last six balls"}
                </h3>
              </div>

              <span className="timeline-count">
                {liveMode
                  ? "Live feed availability depends on provider"
                  : `${history.length} / ${initialBalls.length} balls played`}
              </span>
            </div>

            <div className="ball-strip">
              {(recent.length
                ? recent
                : liveMode
                  ? []
                  : initialBalls.slice(0, 6)
              ).map((ball, index) => (
                <div
                  key={`${ball.over}-${index}`}
                  className={`ball ${
                    ball.wicket
                      ? "wicket"
                      : ball.runs === 4 || ball.runs === 6
                        ? "boundary"
                        : ""
                  }`}
                >
                  <strong>{ball.event}</strong>
                  <span>{ball.over}</span>
                </div>
              ))}
            </div>

            <p className="timeline-note">
              {liveMode
                ? "The current-score endpoint does not include ball-by-ball commentary. The score and overs above come from the live provider."
                : history.length
                  ? history[history.length - 1]?.note
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
                <strong>On-device AI</strong>
                <span>WebLLM · WebGPU</span>
              </div>

              <span className={`status-dot ${engine ? "ready" : ""}`} />
            </div>

            <p>
              Your questions and match context are processed in this browser.
              No AI API key or remote inference server.
            </p>

            <div className="model-name">
              <span>MODEL</span>
              <strong>Qwen 2.5 · 1.5B</strong>
              <small>{MODEL_ID}</small>
            </div>

            <div className="load-progress">
              <div>
                <span>{modelStatus}</span>
                <b>{progress}%</b>
              </div>

              <div className="progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>

            <button
              className="btn-load"
              onClick={() => void loadAI()}
              disabled={loading || !!engine}
            >
              {engine ? (
                <>
                  <ShieldCheck size={15} /> Local AI ready
                </>
              ) : loading ? (
                "Loading model…"
              ) : (
                <>
                  <Cpu size={15} /> Load local AI model
                </>
              )}
            </button>

            {error && <div className="error-note">{error}</div>}

            <div className="privacy-note">
              <ShieldCheck size={13} /> Model runs on your device after download.
            </div>
          </div>

          <div className="key-player panel">
            <div className="card-kicker">
              PLAYER TO WATCH <Zap size={14} />
            </div>

            <div className="key-player-main">
              <div className="big-avatar">🏏</div>

              <div>
                <strong>
                  {batters[0]?.batsman?.name || match.striker}
                </strong>
                <span>
                  {liveMode
                    ? "Player listed in scorecard"
                    : "Currently on strike"}
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
              <span /> KEY BATTER RIGHT NOW
            </div>
          </div>

          <div className="fantasy-card panel">
            <div className="card-kicker">
              FANTASY IMPACT <Trophy size={14} />
            </div>

            <h3>What matters for fantasy fans?</h3>

            <div className="fantasy-row">
              <span className="fantasy-icon green">
                <Zap size={15} />
              </span>

              <div>
                <strong>
                  {batters[0]?.batsman?.name || match.striker}
                </strong>
                <small>
                  {liveMode
                    ? "Batting figures from scorecard"
                    : "Opportunity to add batting points"}
                </small>
              </div>

              <span className="impact-label">BAT</span>
            </div>

            <div className="fantasy-row">
              <span className="fantasy-icon orange">
                <Target size={15} />
              </span>

              <div>
                <strong>
                  {bowlers[0]?.bowler?.name || match.bowler}
                </strong>
                <small>
                  {liveMode
                    ? "Bowling figures from scorecard"
                    : "Wicket-taking opportunity"}
                </small>
              </div>

              <span className="impact-label">BOWL</span>
            </div>

            <p className="disclaimer">
              Qualitative context only. Not a fantasy-points or outcome prediction.
            </p>
          </div>
        </aside>
      </section>

      <section className="chat-section panel">
        <div className="chat-header">
          <div className="chat-title-icon">
            <MessageCircle size={19} />
          </div>

          <div>
            <div className="card-kicker">
              YOUR PERSONAL MATCH COMPANION
            </div>
            <h2>Ask Match AI</h2>
            <p>Get the match explained in plain language.</p>
          </div>

          <span className="chat-local">
            <span /> {engine ? "Local AI active" : "Demo mode"}
          </span>
        </div>

        <div className="chat-tabs">
          <button
            className={activeTab === "insights" ? "selected" : ""}
            onClick={() => setActiveTab("insights")}
          >
            Suggested questions
          </button>

          <button
            className={activeTab === "chat" ? "selected" : ""}
            onClick={() => setActiveTab("chat")}
          >
            Conversation
          </button>
        </div>

        {activeTab === "insights" ? (
          <div className="suggestions">
            {[
              "Why is this chase under pressure?",
              "Who is the key player right now?",
              "What should I watch in the next over?"
            ].map(question => (
              <button
                key={question}
                onClick={() => {
                  setChatInput(question);
                  setActiveTab("chat");
                }}
              >
                {question}
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <div className="chat-messages">
            {chat.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role}`}
              >
                <span>
                  {message.role === "assistant" ? "FP" : "YOU"}
                </span>
                <p>{message.content}</p>
              </div>
            ))}

            {answerLoading && (
              <div className="thinking">FanPulse is thinking…</div>
            )}
          </div>
        )}

        <form
          className="chat-form"
          onSubmit={event => {
            event.preventDefault();
            setActiveTab("chat");
            void sendChat();
          }}
        >
          <input
            value={chatInput}
            onChange={event => setChatInput(event.target.value)}
            placeholder="Ask why the match is changing…"
            aria-label="Ask Match AI"
          />

          <button disabled={!chatInput.trim() || answerLoading}>
            <Send size={16} />
            <span>Ask AI</span>
          </button>
        </form>

        <div className="chat-foot">
          <CircleHelp size={13} />
          For the best experience, load the local AI model above. Without it,
          the demo uses deterministic match calculations.
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">
            <Activity size={16} />
          </span>
          <span>
            fanpulse<span className="brand-ai">.ai</span>
          </span>
        </a>

        <span>Built for fans, powered on-device.</span>
        <span>Dream11 FDE Intern Assignment · Prototype</span>
      </footer>
    </main>
  );
}

const tableCell: React.CSSProperties = {
  padding: "12px 10px",
  color: "#e5e7eb",
  fontSize: 13,
  whiteSpace: "nowrap"
};
