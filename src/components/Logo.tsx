const SIZES = {
  sm: { text: "text-base", icon: "size-5", gap: "gap-1.5" },
  md: { text: "text-lg", icon: "size-6", gap: "gap-2" },
  lg: { text: "text-2xl", icon: "size-8", gap: "gap-2.5" },
};

/**
 * Marca do sistema — "Auto Peças System". Fonte única do nome/identidade:
 * usada no login, no cadastro e na barra lateral.
 */
export function Logo({
  size = "md",
  variant = "color",
  className = "",
}: {
  size?: keyof typeof SIZES;
  variant?: "color" | "light";
  className?: string;
}) {
  const s = SIZES[size];
  const mark = variant === "light" ? "text-white" : "text-primary";
  const brand = variant === "light" ? "text-white" : "text-primary";
  const tail = variant === "light" ? "text-sky-400" : "text-foreground";

  return (
    <span className={`inline-flex items-center font-bold ${s.gap} ${className}`}>
      {/* Porca sextavada — remete a autopeças */}
      <svg
        viewBox="0 0 24 24"
        className={`${s.icon} ${mark} shrink-0`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 1.5 21.09 6.75 21.09 17.25 12 22.5 2.91 17.25 2.91 6.75 12 1.5ZM17 12A5 5 0 1 1 7 12A5 5 0 0 1 17 12Z"
        />
      </svg>
      <span className={s.text}>
        <span className={brand}>Auto Peças</span>
        <span className={tail}> System</span>
      </span>
    </span>
  );
}
