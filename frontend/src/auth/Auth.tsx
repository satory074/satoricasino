import { useState, type FormEvent } from "react";
import { apiPost, setAuth } from "../shared/api/api";
import type { AuthData } from "../shared/types/game";
import clsx from "clsx";

interface Props {
  onAuthed: () => void;
  playClick: () => void;
}

export function Auth({ onAuthed, playClick }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pass.trim() || busy) return;
    setBusy(true);
    setErr("");
    playClick();
    try {
      const data = await apiPost<AuthData>(
        tab === "login" ? "/api/login" : "/api/register",
        { display_name: name.trim(), passphrase: pass.trim() },
      );
      setAuth(data);
      onAuthed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-section">
      <div className="auth-card">
        <div className="auth-logo">SatoriArcade</div>
        <div className="auth-tagline">Blackjack Lounge</div>

        <div className="auth-tabs">
          <div
            className={clsx("auth-tab", tab === "login" && "active")}
            onClick={() => {
              playClick();
              setTab("login");
              setErr("");
            }}
          >
            Login
          </div>
          <div
            className={clsx("auth-tab", tab === "register" && "active")}
            onClick={() => {
              playClick();
              setTab("register");
              setErr("");
            }}
          >
            Register
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <input
            type="text"
            placeholder="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Passphrase"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {tab === "login" ? "Enter Lounge" : "Create Account"}
          </button>
        </form>

        <div className="error-msg">{err}</div>
      </div>
    </div>
  );
}
