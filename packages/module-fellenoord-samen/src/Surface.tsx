// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ModuleSurfaceProps } from "@tablette/module-sdk";
import { nl, identities, identityName, type Category, type Identity } from "./copy";
import { projects, sourceUrls, type Place, type LocalData, type Comment } from "./data";
import { landmarks, inFellenoord, type Position } from "./geo";
import { getStore } from "./store";
import { NeighbourhoodMap } from "./Map";
import { Illustration } from "./Illustration";
import { matchingPlaces } from "./search";
import { styles } from "./styles";
const categories = Object.entries(nl.categories) as [Category, string][];
const date = (value: string) => new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(value));
const coordinates = (p: Position) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

function Discussion({ targetId, data, onSaved }: { targetId: string; data: LocalData; onSaved: () => void }) {
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const comments = data.comments.filter(c => c.targetId === targetId);
  const parent = comments.find(c => c.id === parentId);
  function comment(c: Comment, reply = false) {
    return <article key={c.id} className="fs-comment">
      <small className="fs-meta"><strong>{identityName(c.author)}</strong> · <time dateTime={c.createdAt}>{date(c.createdAt)}</time></small>
      <p>{c.body}</p>
      {!reply && <button type="button" onClick={() => { setParentId(c.id); input.current?.focus(); }}>{nl.reply} <span className="fs-meta">· {identityName(c.author)}</span></button>}
      {!reply && <div className="fs-replies">{comments.filter(r => r.parentId === c.id).map(r => comment(r, true))}</div>}
    </article>;
  }
  return <section className="fs-discussion" aria-label={nl.discussion}>
    <h3>{nl.discussion} <span className="fs-meta">({comments.length})</span></h3>
    {comments.length === 0 && <p className="fs-meta">{nl.noComments}</p>}
    {comments.filter(c => !c.parentId).map(c => comment(c))}
    <form className="fs-composer" onSubmit={event => { event.preventDefault(); if (getStore().comment(targetId, body, parentId)) { setBody(""); setParentId(null); onSaved(); } }}>
      {parent && <p className="fs-meta">{nl.replyTo} {identityName(parent.author)} <button type="button" onClick={() => setParentId(null)}>{nl.cancelReply}</button></p>}
      <label>{nl.comment}<small>{nl.constructive}</small><textarea ref={input} required minLength={2} maxLength={1000} placeholder={nl.commentPlaceholder} value={body} onChange={e => setBody(e.target.value)} /></label>
      <button className="fs-primary" type="submit">{nl.post}</button>
    </form>
  </section>;
}

function Detail({ place, data, onBack, onMessage }: { place: Place; data: LocalData; onBack: () => void; onMessage: (text: string) => void }) {
  const [plan, setPlan] = useState(false);
  return <article className="fs-detail" aria-label={place.title}>
    <button className="fs-back" type="button" onClick={onBack}>← {nl.back}</button>
    <div className="fs-card-row"><span className={`fs-tag fs-tag-${place.category}`}>{nl.categories[place.category]}</span><small className="fs-meta">{place.kind === "project" ? nl.demoProject : nl.demoIdea}</small></div>
    <h2 style={{ marginTop: 12 }}>{place.title}</h2>
    <dl><dt>{nl.location}</dt><dd>{place.location}</dd>
      {place.kind === "project" ? <><dt>{nl.status}</dt><dd>{place.status}</dd></> : <><dt>{nl.author}</dt><dd>{identityName(place.author)}</dd><dt>{nl.created}</dt><dd><time dateTime={place.createdAt}>{date(place.createdAt)}</time></dd></>}
    </dl>
    {place.kind === "project" && <>
      <div className="fs-view-toggle"><button type="button" aria-pressed={!plan} onClick={() => setPlan(false)}>{nl.scene}</button><button type="button" aria-pressed={plan} onClick={() => setPlan(true)}>{nl.plan}</button></div>
      <Illustration category={place.category} plan={plan} />
      <h3>{nl.about}</h3>
    </>}
    <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{place.description}</p>
    {place.kind === "project" ? <>
      <a href={place.source} target="_blank" rel="noreferrer">{nl.source} ↗</a>
      <div className="fs-question"><h3>{nl.question}</h3><p>{place.question}</p></div>
    </> : <div className="fs-actions">
      <button type="button" className="fs-primary" aria-pressed={place.supporters.includes(data.identity)} onClick={() => { if (getStore().toggleSupport(place.id)) onMessage(nl.supportSaved); }}>{place.supporters.includes(data.identity) ? nl.unsupport : nl.support}</button>
      <span className="fs-meta">{place.supporters.length} {nl.supporters}</span>
    </div>}
    <Discussion key={place.id} targetId={place.id} data={data} onSaved={() => onMessage(nl.commentSaved)} />
  </article>;
}

type Draft = { title: string; category: Category; description: string; pin: Position | null; location: string };
const emptyDraft = (): Draft => ({ title: "", category: "groen", description: "", pin: null, location: "" });
export function Surface(_props: ModuleSurfaceProps) {
  const store = getStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { data, error } = snapshot;
  const [mode, setMode] = useState<"project" | "idea">("project");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");
  const [sources, setSources] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!snapshot.focusId) return;
    const place = [...projects, ...store.getSnapshot().data.ideas].find(p => p.id === snapshot.focusId);
    if (!place) return;
    // Preserve an unfinished draft when a chat tool focuses a place.
    setSelected(place.id); setMode(place.kind); setQuery(""); setCategory(""); setMessage(nl.toolFocus);
  }, [snapshot.focusRevision, snapshot.focusId, store]);
  const places: Place[] = mode === "project" ? projects : data.ideas;
  const filtered = matchingPlaces(places, query).filter(p => !category || p.category === category);
  const place = [...projects, ...data.ideas].find(p => p.id === selected);
  function choose(id: string) { setSelected(id); setMessage(""); setValidation(""); }
  function tab(value: "project" | "idea") { setMode(value); setSelected(null); setQuery(""); setCategory(""); setMessage(""); }
  function finishDraft() { setStep(0); setDraft(emptyDraft()); setValidation(""); }
  function pin(position: Position, location?: string) {
    if (!inFellenoord(position)) { setValidation(nl.outside); return; }
    setDraft(d => ({ ...d, pin: position, location: location ?? `${nl.location} · ${coordinates(position)}` })); setValidation("");
  }
  function exportData() {
    try {
      const blob = new Blob([store.exportRaw()], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "fellenoord-samen-demo.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setValidation(nl.exportError); }
  }
  useEffect(() => { if (selected && !step) heading.current?.focus(); }, [selected, step]);
  return <div className="fs-root" lang="nl" data-testid="fellenoord-surface">
    <style>{styles}</style>
    <header className="fs-header"><div><div className="fs-eyebrow">{nl.area}</div><h1 ref={heading} tabIndex={-1}>{nl.title}</h1><p>{nl.subtitle}</p></div>
      <div className="fs-identity"><span className="fs-demo">● {nl.demo}</span><label>{nl.identity}<select value={data.identity} onChange={e => { if (store.setIdentity(e.target.value as Identity)) setMessage(""); }}>{identities.map(id => <option key={id} value={id}>{identityName(id)}</option>)}</select></label></div>
    </header>
    <p className="fs-notice">{nl.notice}</p>
    <nav className="fs-nav" aria-label={nl.title}>
      <div role="tablist" aria-label={nl.participationMode} onKeyDown={event => {
        if (!step && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault(); const next = event.key === "Home" ? "project" : event.key === "End" ? "idea" : mode === "project" ? "idea" : "project";
          tab(next); document.getElementById(`fs-tab-${next}`)?.focus();
        }
      }}>
        <button id="fs-tab-project" type="button" role="tab" tabIndex={mode === "project" ? 0 : -1} aria-selected={mode === "project"} aria-controls="fs-places" disabled={step !== 0} onClick={() => tab("project")}>{nl.projects}</button>{" "}
        <button id="fs-tab-idea" type="button" role="tab" tabIndex={mode === "idea" ? 0 : -1} aria-selected={mode === "idea"} aria-controls="fs-places" disabled={step !== 0} onClick={() => tab("idea")}>{nl.ideas}</button>
      </div>
      <button type="button" className="fs-primary" disabled={step !== 0} onClick={() => { setMode("idea"); setSelected(null); setStep(1); setDraft(emptyDraft()); setMessage(""); setValidation(""); }}>+ {nl.add}</button>
    </nav>
    {error && <p role="alert" className="fs-error">{error}</p>}
    {validation && <p role="alert" className="fs-error">{validation}</p>}
    <div role="status" aria-live="polite">{message && <p className="fs-success">{message}</p>}</div>
    <div className="fs-layout">
      <div className="fs-sidebar" id="fs-places" role="tabpanel" aria-labelledby={mode === "project" ? "fs-tab-project" : "fs-tab-idea"}>
        {step ? <section className="fs-wizard" aria-label={nl.add}>
          <span className="fs-steps">{[nl.stepLocation, nl.stepDetails, nl.stepReview][step - 1]}</span>
          <h2>{nl.add}</h2>
          {step === 1 && <>
            <p>{nl.choose}</p><label>{nl.landmark}<select value={landmarks.findIndex(l => draft.pin?.lat === l.lat && draft.pin?.lng === l.lng)} onChange={e => { const landmark = landmarks[Number(e.target.value)]; if (landmark) pin(landmark, landmark.label); }}><option value={-1}>{draft.pin ? nl.customLocation : nl.landmarkPlaceholder}</option>{landmarks.map((l, i) => <option key={l.label} value={i}>{l.label}</option>)}</select></label>
            {draft.pin && <p className="fs-location">{nl.coordinates}: {coordinates(draft.pin)}<br />{draft.location}</p>}
            <button type="button" className="fs-primary" onClick={() => { if (!draft.pin || !inFellenoord(draft.pin)) setValidation(nl.noLocation); else { setStep(2); setValidation(""); } }}>{nl.confirmLocation}</button>
          </>}
          {step === 2 && <form onSubmit={event => { event.preventDefault(); if (!draft.pin || !inFellenoord(draft.pin) || draft.title.trim().length < 5 || draft.description.trim().length < 20) { setValidation(nl.required); return; } setValidation(""); setStep(3); }}>
            <label>{nl.ideaTitle}<small>{nl.titleHint}</small><input autoFocus required minLength={5} maxLength={100} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></label>
            <label>{nl.category}<select aria-label={nl.category} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as Category }))}>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label>{nl.ideaDescription}<small>{nl.descriptionHint}</small><textarea required minLength={20} maxLength={2000} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></label>
            <button type="submit" className="fs-primary">{nl.next}</button>
          </form>}
          {step === 3 && <><p>{nl.review}</p><h3>{draft.title}</h3><p><span className={`fs-tag fs-tag-${draft.category}`}>{nl.categories[draft.category]}</span></p><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{draft.description}</p><p className="fs-location">{draft.location}<br />{draft.pin && coordinates(draft.pin)}</p><p className="fs-meta">{nl.author}: {identityName(data.identity)}</p>
            <button type="button" className="fs-primary" onClick={() => { if (!draft.pin) { setValidation(nl.noLocation); return; } const id = store.addIdea({ ...draft, position: draft.pin }); if (id) { finishDraft(); setQuery(""); setCategory(""); setMode("idea"); setSelected(id); setMessage(nl.saved); } }}>{nl.publish}</button>
          </>}
          <div className="fs-actions">{step > 1 && <button type="button" onClick={() => { setStep(step === 3 ? 2 : 1); setValidation(""); }}>{nl.previous}</button>}<button type="button" onClick={finishDraft}>{nl.cancel}</button></div>
        </section> : place ? <Detail key={place.id} place={place} data={data} onBack={() => { setSelected(null); setMessage(""); }} onMessage={setMessage} /> : <>
          <label>{nl.search}<input type="search" value={query} placeholder={nl.searchPlaceholder} onChange={e => setQuery(e.target.value)} /></label>
          <label>{nl.category}<select aria-label={nl.category} value={category} onChange={e => setCategory(e.target.value as Category | "")}><option value="">{nl.all}</option>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <div className="fs-result-count"><span className="fs-meta">{filtered.length} {nl.results}</span>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>{nl.resetFilters}</button>}</div>
          <div className="fs-cards">{filtered.map(p => <button className="fs-card" key={p.id} type="button" onClick={() => choose(p.id)}>
            <span className="fs-card-row"><span className={`fs-tag fs-tag-${p.category}`}>{nl.categories[p.category]}</span><span className="fs-card-symbol" aria-hidden="true">{p.kind === "project" ? "▦" : "✦"}</span></span>
            <strong>{p.title}</strong><small>{p.kind === "project" ? p.summary : p.description.slice(0, 130) + (p.description.length > 130 ? "…" : "")}</small>
            <span className="fs-card-row"><small>{p.location}</small><small>{p.kind === "idea" ? `${p.supporters.length} ${nl.supporters}` : p.status}</small></span>
          </button>)}</div>{filtered.length === 0 && <p className="fs-meta">{nl.empty}</p>}
        </>}
      </div>
      <NeighbourhoodMap places={step ? [...projects, ...data.ideas] : selected ? [...projects, ...data.ideas].filter(p => p.kind === mode) : filtered} selected={selected} placing={step === 1} pin={step ? draft.pin : null} onSelect={id => { if (!step) choose(id); }} onPin={pin} />
    </div>
    <footer className="fs-footer"><button type="button" aria-expanded={sources} onClick={() => setSources(!sources)}>{sources ? nl.closeSources : nl.sources}</button><button type="button" onClick={exportData}>{nl.export}</button><button type="button" onClick={() => { if (window.confirm(nl.resetConfirm) && store.reset()) { finishDraft(); setSelected(null); setMessage(""); } }}>{nl.reset}</button></footer>
    {sources && <aside className="fs-sources"><p>{nl.boundaryInfo}</p><p>{nl.boundary}</p><a href={sourceUrls.fellenoord} target="_blank" rel="noreferrer">{nl.sourceMunicipality} ↗</a>{" · "}<a href={sourceUrls.vision} target="_blank" rel="noreferrer">{nl.sourceVision} ↗</a></aside>}
  </div>;
}
