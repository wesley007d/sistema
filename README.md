# MotoGestor — ERP para loja de motopeças

Sistema web para loja de peças e oficina de motos, no estilo do vhsys:
cadastro de produtos, serviços, clientes/fornecedores, emissão de **NF-e**
(produto) e **NFS-e** (serviço), importação e gestão de **XML**, e financeiro.

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19 + TypeScript
- **Prisma 6** + **SQLite** (banco em arquivo, sem instalação)
- **Tailwind CSS 4**
- Camada fiscal plugável: provedor `local` (gera XML e simula autorização) ou
  `plugnotas` (integração real via API — esqueleto pronto em
  `src/lib/fiscal/plugnotas-provider.ts`)

## Como rodar

```bash
npm install
npx prisma migrate dev      # cria o banco (prisma/dev.db)
npm run db:seed             # dados de exemplo + usuários (opcional)
npm run dev                 # http://localhost:3000
```

### Acesso

O sistema tem login. Se não houver nenhum usuário, a tela de login mostra o
cadastro do primeiro administrador. O seed cria dois acessos:

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `admin@local` | `admin123` | Administrador (acesso total) |
| `balcao@local` | `balcao123` | Funcionário (só produtos, clientes, OS, vendas) |

O administrador define, em **Configurações → Usuários e permissões**, quais
módulos cada funcionário pode abrir. Módulo sem permissão → tela "acesso negado".

Scripts úteis:

| Comando | Ação |
| --- | --- |
| `npm run db:studio` | abre o Prisma Studio (navegar/editar o banco) |
| `npm run db:migrate` | cria/aplica migrações |
| `npm run db:reset` | recria o banco do zero e roda o seed |
| `GET /api/selftest` | diagnóstico: chave de acesso + emissão local + parser XML |

## Configuração fiscal

Arquivo `.env`:

```
FISCAL_PROVIDER="local"        # ou "plugnotas"
FISCAL_AMBIENTE="HOMOLOGACAO"
PLUGNOTAS_API_URL="https://api.sandbox.plugnotas.com.br"
PLUGNOTAS_TOKEN=""
```

Preencha os dados da empresa em **Configurações** (CNPJ, IE, IM, endereço) —
são obrigatórios para a emissão.

> O provedor `local` **não transmite** nada à SEFAZ nem à prefeitura. Ele gera
> o XML, calcula a chave de acesso (com dígito verificador válido) e marca a
> nota como autorizada, para desenvolvimento e demonstração. Para emitir de
> verdade, use um provedor homologado (PlugNotas, Focus NF-e, NFE.io…) e um
> certificado digital A1.

## Módulos

| Módulo | Status |
| --- | --- |
| Produtos / peças + estoque + movimentações | ✅ |
| Serviços (LC 116 / ISS) | ✅ |
| Clientes e fornecedores | ✅ |
| Notas fiscais — NF-e produto (baixa estoque + financeiro) | ✅ |
| Notas fiscais — NFS-e serviço | ✅ |
| XML — importar entrada, vincular produtos, lançar estoque, baixar | ✅ |
| **Financeiro** — títulos a pagar/receber (parcelamento, baixa total/parcial, estorno), contas de caixa/banco, **fluxo de caixa** (saldo por período, entradas/saídas, transferência, sangria/suprimento) | ✅ |
| **Relatórios e DRE** — painel do período, **DRE** (competência), vendas (mais vendidos, formas de pagamento, operadores), estoque (valor, giro, cobertura), aging de recebíveis/dívidas | ✅ |
| Configurações da empresa | ✅ |
| **Ordens de serviço (oficina)** — veículo, peças + mão de obra, workflow de status, baixa de estoque, faturamento em NF-e/NFS-e, impressão | ✅ |
| **Login + usuários + permissões por módulo** (admin controla o funcionário) | ✅ |
| **Vendas / PDV** — busca/leitura de código de barras, carrinho, desconto, múltiplas formas de pagamento + troco, baixa de estoque, financeiro (entra no caixa), NF-e opcional, cupom | ✅ |

## Estrutura

```
prisma/schema.prisma        modelo de dados
src/lib/db.ts               cliente Prisma
src/lib/auth.ts             login, sessão, permissões (MODULES = módulos liberáveis)
src/lib/fiscal/             chave de acesso, provedores (local, plugnotas)
src/lib/xml/parse-nfe.ts    parser de NF-e/NFS-e
src/app/login/             tela de login / criação do 1º admin
src/app/(app)/              telas protegidas; cada módulo tem um layout.tsx que
                            chama requirePermission("<chave>")
src/app/(app)/ordens-servico/   módulo de oficina (OSEditor, actions, imprimir)
src/app/(app)/configuracoes/usuarios/   admin: cadastro de usuários e permissões
src/components/             UI compartilhada
```

### Como a permissão é aplicada

- `src/app/(app)/layout.tsx` exige usuário logado (senão → `/login`).
- Cada pasta de módulo em `(app)/` tem um `layout.tsx` com
  `await requirePermission("produtos" | "notas" | ...)`. Sem permissão → `/acesso-negado`.
- O menu lateral só mostra os módulos permitidos.
- `ADMIN` tem acesso a tudo; o painel inicial é sempre visível.
