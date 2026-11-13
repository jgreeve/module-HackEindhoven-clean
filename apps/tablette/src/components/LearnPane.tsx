// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useMemo, useState } from "react";
import * as workspace from "../forge/workspace";
import { getMode } from "../app/mode";
import { handoff } from "../app/handoff";
import { LESSONS, TRACKS } from "../learn/lessons";
import type { Lesson } from "../learn/lessons";
import { loadProgress, markComplete, setCurrent } from "../learn/progress";
import type { LearnProgress } from "../learn/progress";
import { Markdown } from "./Markdown";

/** Learn mode: Pygram-derived tracks, a lesson reader, and "open in sketch". */
export function LearnPane() {
  const [progress, setProgress] = useState<LearnProgress>(() => loadProgress());
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [opening, setOpening] = useState(false);
  const [check, setCheck] = useState<{ ok: boolean; entities: number; error?: string } | null>(
    null,
  );

  const trackLessons = useMemo(
    () => LESSONS.filter((l) => l.track === trackId),
    [trackId],
  );
  const lesson: Lesson | undefined = useMemo(
    () => trackLessons.find((l) => l.id === lessonId) ?? trackLessons[0],
    [trackLessons, lessonId],
  );

  const pickTrack = (id: string) => {
    setTrackId(id);
    setLessonId(null);
    setShowHints(false);
    setCheck(null);
  };
  const pickLesson = (id: string) => {
    setLessonId(id);
    setShowHints(false);
    setCheck(null);
    setProgress(setCurrent(id));
  };

  // Run the lesson's code and report the compile result + entity count.
  const checkLesson = async () => {
    if (!lesson) return;
    setOpening(true);
    setCheck(null);
    try {
      const session = await import("../modules/bimr/session");
      await workspace.writeFile(`lessons/${lesson.id}.py`, lesson.code);
      const snap = await session.runModel();
      const ok = !snap.error && !!snap.ifcx;
      setCheck({
        ok,
        entities: session.countEntities(snap.ifcx),
        error: snap.error ?? undefined,
      });
    } catch (e) {
      setCheck({ ok: false, entities: 0, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setOpening(false);
    }
  };

  const openInSketch = async () => {
    if (!lesson) return;
    setOpening(true);
    try {
      const path = `lessons/${lesson.id}.py`;
      await workspace.writeFile(path, lesson.code);
      handoff({ from: getMode(), to: "sketch", intent: { kind: "open-file", path } });
    } finally {
      setOpening(false);
    }
  };

  const complete = () => {
    if (lesson) setProgress(markComplete(lesson.id));
  };

  if (!lesson) return null;

  const index = trackLessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? trackLessons[index - 1] : null;
  const next = index < trackLessons.length - 1 ? trackLessons[index + 1] : null;

  return (
    <div className="learn">
      <aside className="learn-side">
        {TRACKS.map((t) => (
          <div key={t.id} className="learn-track">
            <button
              type="button"
              className={`learn-track-btn ${t.id === trackId ? "active" : ""}`}
              onClick={() => pickTrack(t.id)}
            >
              <span className="learn-track-title">{t.title}</span>
              <span className="learn-track-desc">{t.description}</span>
            </button>
            {t.id === trackId && (
              <ul className="learn-lessons">
                {trackLessons.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={`learn-lesson ${l.id === lesson.id ? "active" : ""}`}
                      onClick={() => pickLesson(l.id)}
                    >
                      <span>{l.title}</span>
                      {progress.completed.includes(l.id) && (
                        <span className="learn-done">{"\u2713"}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </aside>

      <div className="learn-main">
        <h2 className="learn-title">{lesson.title}</h2>
        <Markdown text={lesson.markdown} />
        <pre className="learn-code">{lesson.code}</pre>
        <div className="learn-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => void openInSketch()}
            disabled={opening}
          >
            {opening ? "Opening..." : "Open in sketch"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void checkLesson()}
            disabled={opening}
          >
            {opening ? "Running..." : "Run lesson"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={complete}
            disabled={progress.completed.includes(lesson.id)}
          >
            {progress.completed.includes(lesson.id) ? "Completed" : "Mark complete"}
          </button>
          {lesson.hints && lesson.hints.length > 0 && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowHints((s) => !s)}
            >
              {showHints ? "Hide hints" : "Hints"}
            </button>
          )}
        </div>
        {check && (
          <div className={`learn-check ${check.ok ? "ok" : "err"}`}>
            {check.ok
              ? `Compiled OK — ${check.entities} entities.`
              : `Compile error: ${check.error ?? "unknown error"}`}
          </div>
        )}
        {showHints && lesson.hints && (
          <ul className="learn-hints">
            {lesson.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}

        <div className="learn-nav">
          <button
            type="button"
            className="btn"
            disabled={!prev}
            onClick={() => prev && pickLesson(prev.id)}
          >
            {"\u2190"} Previous
          </button>
          <span className="learn-nav-pos">
            {index + 1} / {trackLessons.length}
          </span>
          <button
            type="button"
            className="btn"
            disabled={!next}
            onClick={() => next && pickLesson(next.id)}
          >
            Next {"\u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
