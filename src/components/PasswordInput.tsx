"use client";

import { useState } from "react";

/** Campo de senha com botão de olho pra alternar entre oculto/visível. */
export function PasswordInput({
  className = "input",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input {...rest} type={visivel ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        tabIndex={-1}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px]"
          aria-hidden="true"
        >
          {visivel ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5 0 9 3.5 10 7-.4 1.3-1.1 2.5-2 3.6M6.2 6.2C4.3 7.4 2.9 9.1 2 12c1 3.5 5 7 10 7 1.4 0 2.7-.3 3.9-.7" />
              <path d="M9.5 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12c1-3.5 5-7 10-7s9 3.5 10 7c-1 3.5-5 7-10 7s-9-3.5-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
