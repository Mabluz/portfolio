"use client";
import { useActionState } from "react";
import { login, type LoginState } from "@/server/actions/auth";

const input = "min-h-12 w-full box-border rounded-[10px] border border-line bg-white px-3.5 py-3 text-[15px] text-ink focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} noValidate>
      <div className="mb-4 flex flex-col gap-1.5">
        <label htmlFor="l-user" className="text-sm font-semibold">Brukernavn</label>
        <input id="l-user" name="username" type="text" autoComplete="username" required className={input} />
      </div>
      <div className="mb-6 flex flex-col gap-1.5">
        <label htmlFor="l-pass" className="text-sm font-semibold">Passord</label>
        <input id="l-pass" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {state.error && (
        <p role="alert" className="mb-4 rounded-[10px] bg-[#f6e7e4] px-3.5 py-2.5 text-sm text-[#8e2f2f]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[50px] w-full cursor-pointer items-center justify-center rounded-full border-0 bg-forest text-[15px] font-semibold text-sand hover:bg-forest-dark disabled:opacity-60"
      >
        {pending ? "Logger inn…" : "Logg inn"}
      </button>
    </form>
  );
}
