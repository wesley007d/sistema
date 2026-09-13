import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scopedDb, type ScopedDb } from "@/lib/tenant-db";

const COOKIE = "moto_sid";
const SESSION_DAYS = 30;

/** Encerra a sessão se ficar este tempo sem nenhuma atividade. */
const SESSION_IDLE_MS = 3 * 864e5; // 3 dias

/** Grava `Session.ultimaAtividade` no máximo 1x por este intervalo (ms). */
const ATIVIDADE_THROTTLE_MS = 60_000;

/** Sessão é considerada "online agora" se teve atividade nos últimos X ms. */
export const ONLINE_JANELA_MS = 5 * 60_000;

/** Grava 1 "ação" de módulo no máx. 1x a cada este intervalo por usuário+módulo. */
const ATIVIDADE_MODULO_THROTTLE_MS = 5 * 60_000;

// Cache em memória do processo (sobrevive a HMR em dev, como o rate-limit).
const atividadeModuloCache: Map<string, number> =
  (globalThis as unknown as { __atividadeModuloCache?: Map<string, number> })
    .__atividadeModuloCache ?? new Map();
(
  globalThis as unknown as { __atividadeModuloCache?: Map<string, number> }
).__atividadeModuloCache = atividadeModuloCache;

function diaAtual(agora = new Date()): Date {
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
}

/**
 * Registra 1 ação do usuário num módulo (Área do Dono > Fase 2: DAU/WAU/MAU
 * histórico real + "funcionalidades mais usadas"). Throttled por usuário+módulo
 * pra não gravar a cada request; roda em segundo plano, nunca trava a resposta.
 */
function registrarAtividadeModulo(user: User, moduloKey: string) {
  if (user.companyId === PLATAFORMA_COMPANY_ID) return;
  const chave = `${user.id}:${moduloKey}`;
  const agora = Date.now();
  const ultima = atividadeModuloCache.get(chave) ?? 0;
  if (agora - ultima < ATIVIDADE_MODULO_THROTTLE_MS) return;
  atividadeModuloCache.set(chave, agora);
  const dia = diaAtual(new Date(agora));
  prisma
    .$transaction([
      prisma.atividadeDia.upsert({
        where: { userId_dia: { userId: user.id, dia } },
        create: { companyId: user.companyId, userId: user.id, dia, acoes: 1 },
        update: { acoes: { increment: 1 } },
      }),
      prisma.atividadeModulo.upsert({
        where: { userId_dia_modulo: { userId: user.id, dia, modulo: moduloKey } },
        create: {
          companyId: user.companyId,
          userId: user.id,
          dia,
          modulo: moduloKey,
          acoes: 1,
        },
        update: { acoes: { increment: 1 } },
      }),
    ])
    .catch(() => {});
}

/**
 * Empresa "guarda-chuva" onde vivem os usuários donos da plataforma. Não é uma
 * loja real — é filtrada da lista de empresas na Área do Dono.
 */
export const PLATAFORMA_COMPANY_ID = "plataforma";

/** E-mails do dono da plataforma (OWNER_EMAILS no .env), normalizados. */
const OWNER_EMAILS = (process.env.OWNER_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** True se o usuário é dono da plataforma (vê a Área do Dono em /dono). */
export function isOwner(user: Pick<User, "email">): boolean {
  return OWNER_EMAILS.includes(user.email.trim().toLowerCase());
}

/** Módulos cujo acesso o admin pode liberar por funcionário */
export const MODULES: { key: string; label: string }[] = [
  { key: "dashboard", label: "Início (painel)" },
  { key: "produtos", label: "Produtos / Peças" },
  { key: "servicos", label: "Serviços" },
  { key: "parceiros", label: "Clientes e Fornecedores" },
  { key: "vendas", label: "Vendas / PDV + Caixa" },
  { key: "pdv", label: "PDV — só lançar venda (vendedor)" },
  { key: "ordens_servico", label: "Ordens de Serviço" },
  { key: "notas", label: "Notas Fiscais" },
  { key: "xml", label: "XML" },
  { key: "financeiro", label: "Financeiro (completo)" },
  { key: "financeiro_caixa", label: "Financeiro — Caixa e recebíveis" },
  { key: "relatorios", label: "Relatórios e DRE" },
  { key: "configuracoes", label: "Configurações da empresa" },
];

export const ALL_MODULE_KEYS = MODULES.map((m) => m.key);

// ---------- senha ----------

const scrypt = promisify(scryptCb) as (
  senha: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// Parâmetros scrypt atuais (recomendação OWASP: N ≥ 2^16). Ficam gravados no
// próprio hash, então dá para subir depois sem invalidar as senhas existentes.
const SCRYPT_N = 1 << 16; // 65536
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
// N=65536, r=8 ~ 64 MiB; folga p/ o limite interno do Node (default 32 MiB).
const SCRYPT_MAXMEM = 160 * 1024 * 1024;

// Formato novo: scrypt$N$r$p$salt$hash. Formato legado: scrypt$salt$hash
// (parâmetros antigos do scryptSync: N=16384, r=8, p=1).
const LEGADO = { N: 16384, r: 8, p: 1 };

export async function hashPassword(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(senha, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString(
    "hex",
  )}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  senha: string,
  armazenado: string,
): Promise<boolean> {
  const parts = (armazenado ?? "").split("$");
  let N: number;
  let r: number;
  let p: number;
  let saltHex: string;
  let hashHex: string;
  if (parts.length === 6 && parts[0] === "scrypt") {
    N = Number(parts[1]);
    r = Number(parts[2]);
    p = Number(parts[3]);
    saltHex = parts[4];
    hashHex = parts[5];
  } else if (parts.length === 3 && parts[0] === "scrypt") {
    ({ N, r, p } = LEGADO);
    saltHex = parts[1];
    hashHex = parts[2];
  } else {
    return false;
  }
  if (
    !saltHex ||
    !hashHex ||
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p)
  ) {
    return false;
  }
  const alvo = Buffer.from(hashHex, "hex");
  let hash: Buffer;
  try {
    hash = await scrypt(senha, Buffer.from(saltHex, "hex"), alvo.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
  } catch {
    return false;
  }
  return hash.length === alvo.length && timingSafeEqual(hash, alvo);
}

/**
 * True se o hash foi gerado com parâmetros mais fracos que os atuais — quem
 * chama pode regravar a senha no login (`await hashPassword(senha)`).
 */
export function precisaRehashSenha(armazenado: string): boolean {
  const parts = (armazenado ?? "").split("$");
  if (parts[0] !== "scrypt") return false;
  if (parts.length === 3) return true;
  if (parts.length === 6) return Number(parts[1]) < SCRYPT_N;
  return false;
}

// ---------- sessão ----------

export async function createSession(userId: string) {
  const jar = await cookies();

  // Rotação: descarta a sessão anterior deste navegador (se houver) e faz
  // uma higiene das sessões já expiradas do usuário.
  const anterior = jar.get(COOKIE)?.value;
  if (anterior) {
    await prisma.session.deleteMany({ where: { id: anterior } }).catch(() => {});
  }
  await prisma.session
    .deleteMany({ where: { userId, expiraEm: { lt: new Date() } } })
    .catch(() => {});

  const expiraEm = new Date(Date.now() + SESSION_DAYS * 864e5);
  // Token de sessão: aleatório-criptográfico (não o cuid() do PK, que é
  // parcialmente previsível). 32 bytes = 256 bits de entropia.
  const id = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { id, userId, expiraEm } });
  await prisma.user.update({
    where: { id: userId },
    data: { ultimoLogin: new Date() },
  });
  jar.set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid) {
    await prisma.session.deleteMany({ where: { id: sid } });
    jar.delete(COOKIE);
  }
}

/** Usuário logado (ou null). Memoizado por request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session || session.expiraEm < new Date() || !session.user.ativo) {
    return null;
  }
  const agora = Date.now();
  // Timeout por inatividade: sessão parada há mais de SESSION_IDLE_MS é morta.
  if (agora - session.ultimaAtividade.getTime() > SESSION_IDLE_MS) {
    await prisma.session.deleteMany({ where: { id: sid } }).catch(() => {});
    return null;
  }
  // Marca atividade da sessão (throttled) p/ a Área do Dono saber quem está online.
  if (agora - session.ultimaAtividade.getTime() > ATIVIDADE_THROTTLE_MS) {
    await prisma.session
      .update({ where: { id: sid }, data: { ultimaAtividade: new Date(agora) } })
      .catch(() => {});
  }
  return session.user;
});

// ---------- autorização ----------

export function permissionsOf(user: User): string[] {
  if (user.role === "ADMIN") return ALL_MODULE_KEYS;
  try {
    const arr = JSON.parse(user.permissoes);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function can(user: User, moduleKey: string): boolean {
  if (user.role === "ADMIN") return true;
  if (moduleKey === "dashboard") return true; // painel sempre visível
  return permissionsOf(user).includes(moduleKey);
}

/** Exige usuário logado; redireciona para /login se não houver. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Exige acesso a um módulo; redireciona para /acesso-negado se não tiver. */
export async function requirePermission(moduleKey: string): Promise<User> {
  const user = await requireUser();
  if (!can(user, moduleKey)) redirect("/acesso-negado");
  registrarAtividadeModulo(user, moduleKey);
  return user;
}

/** Exige acesso a QUALQUER um dos módulos da lista. */
export async function requireAnyPermission(moduleKeys: string[]): Promise<User> {
  const user = await requireUser();
  const liberado = moduleKeys.find((k) => can(user, k));
  if (!liberado) redirect("/acesso-negado");
  registrarAtividadeModulo(user, liberado);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/acesso-negado");
  return user;
}

/** Exige que o usuário logado seja dono da plataforma (ver /dono). */
export async function requireOwner(): Promise<User> {
  const user = await requireUser();
  if (!isOwner(user)) redirect("/acesso-negado");
  return user;
}

/** Usuário logado + client Prisma já escopado à empresa dele. */
export async function requireDb(): Promise<{ user: User; db: ScopedDb }> {
  const user = await requireUser();
  return { user, db: scopedDb(user.companyId) };
}

/** Como `requireDb`, mas também exige acesso a um módulo específico. */
export async function requireDbPermission(
  moduleKey: string
): Promise<{ user: User; db: ScopedDb }> {
  const user = await requirePermission(moduleKey);
  return { user, db: scopedDb(user.companyId) };
}

/** Como `requireDbPermission`, mas aceita qualquer um dos módulos da lista. */
export async function requireDbAnyPermission(
  moduleKeys: string[]
): Promise<{ user: User; db: ScopedDb }> {
  const user = await requireAnyPermission(moduleKeys);
  return { user, db: scopedDb(user.companyId) };
}

/** Como `requireDb`, mas exige que o usuário seja ADMIN. */
export async function requireDbAdmin(): Promise<{ user: User; db: ScopedDb }> {
  const user = await requireAdmin();
  return { user, db: scopedDb(user.companyId) };
}
