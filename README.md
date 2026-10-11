# Pember — Gerenciador de Senhas Seguro

O **Pember** é um gerenciador de senhas local, criptografado e com interface moderna. Todos os
dados ficam **no seu dispositivo**; nada é enviado para servidores e não existe sincronização em
nuvem (arquitetura de conhecimento zero por design: não há servidor que possa descriptografar seu
cofre).

## Funcionalidades

- **Cofre de credenciais** — serviço, usuário, senha, URL, categoria, observações, datas de
  criação/última modificação, favoritos, busca por nome/usuário/site, filtros por categoria e nível
  de segurança, exclusão com confirmação, cópia para a área de transferência (senhas copiadas são
  limpas após 60s quando possível), senhas ocultas por padrão com revelação temporizada.
- **Gerador de senhas** — `crypto.getRandomValues()` (nunca `Math.random()`), comprimento 8–128,
  maiúsculas/minúsculas/números/símbolos, exclusão de caracteres ambíguos (`0 O l I …`), modo
  frase-senha (3–10 palavras), medidor de força, histórico local opcional e criptografado.
- **Segurança** — senha mestra (Argon2id, 64 MiB, salt único), AES-256-GCM com IV único por
  registro e AAD vinculado ao id, bloqueio automático configurável, bloqueio manual, tela de
  desbloqueio, espera exponencial após tentativas repetidas, reautenticação para operações
  sensíveis (exportar backup, excluir cofre, substituir por backup), exclusão segura dos dados
  locais.
- **Auditoria** — detecção local de senhas curtas/previsíveis (sequências, teclados, repetições,
  datas, listas comuns), reutilização entre serviços, recomendações e indicador geral do cofre.
- **Backup** — exportação para arquivo `.pemberbak` criptografado (Argon2id + AES-256-GCM) com
  senha de backup própria; importação com validação de integridade (GCM autentica contra
  adulteração) e escolha entre mesclar ou substituir. **Não existe exportação em texto puro.**

## Arquitetura

```
src/
├── crypto/             # KDF (Argon2id/PBKDF2) e AES-256-GCM (Web Crypto API)
├── storage/            # KeyValueStore (IndexedDB no app; memória nos testes)
├── vault/              # orquestração do cofre: criação, desbloqueio, CRUD criptografado
├── auth/               # sessão: auto-lock, rate-limit de tentativas, política de senha mestra
├── password-generator/ # geração aleatória segura + lista de palavras
├── password-audit/     # avaliação local de força, reutilização e padrões
├── backup/             # exportação/importação criptografadas + combinação de dados
├── settings/           # preferências não sensíveis (tema, auto-lock, etc.)
└── ui/                 # React: páginas e componentes (sem regras criptográficas)
```

**Chave de dados (DEK):** cada credencial é criptografada com uma DEK aleatória de 256 bits; a DEK
é embrulhada pela chave derivada da senha mestra. A senha mestra nunca é armazenada — nem em texto
puro, nem em hash diretamente verificável; a verificação é feita pela autenticidade GCM de um
verificador e do embrulho da DEK.

## Instalar, executar e testar

Requisitos: Node.js 20.19+ (testado com Node 24).

```bash
npm install        # dependências
npm run dev        # servidor de desenvolvimento (Vite)
npm run build      # typecheck + build de produção em dist/
npm test           # suíte completa (Vitest): unitários + integração de UI (jsdom)
npm run typecheck  # verificação de tipos
```

## Recuperação (backup)

1. **Exportar:** Configurações → Backup → defina uma *senha de backup* própria (mínimo 8
   caracteres, diferente da senha mestra) → Exportar backup → salve o arquivo `.pemberbak` em
   local seguro (ex.: HD externo criptografado). **Anote a senha de backup em local físico
   seguro** — sem ela o arquivo é irrecuperável.
2. **Importar:** Configurações → Backup → informe a senha do backup → escolha o arquivo →
   selecione *Mesclar* (mantém o cofre atual e adiciona as credenciais do arquivo, ignorando
   duplicatas) ou *Substituir* (exige reautenticação e substitui todo o cofre).
3. Arquivos corrompidos ou senha errada são rejeitados com mensagem clara — o Pember nunca
   importa dados sem validar integridade e formato.

## Limites de segurança (leia com atenção)

O Pember **não é inviável de ser comprometido**; os riscos reais incluem:

- **Plataforma web:** enquanto o cofre está desbloqueado, a chave e os dados ficam na memória do
  processo do navegador. Extensões maliciosas, XSS em páginas de origem (o Pember não carrega
  scripts de terceiros) ou um sistema operacional comprometido podem ler essa memória. Um
  gerenciador dedicado (Tauri/SQLite nativo) reduz essa superfície; este ambiente não tinha Rust
  disponível, então a primeira versão é web/local.
- **Persistência:** os dados ficam no IndexedDB do navegador. "Excluir cofre" limpa todos os
  registros e chaves, mas cópias em snapshots de backup do próprio navegador/OS podem persistir.
- **Área de transferência:** senhas copiadas ficam no clipboard; o Pember tenta limpá-las após
  60s, mas outros aplicativos podem ler o clipboard antes disso.
- **Memória:** JavaScript não garante remoção física de dados da memória; o Pember apenas
  sobrescreve os buffers sensíveis quando possível (`zeroize`).
- **Força bruta local:** o rate-limit limita tentativas na interface, mas alguém com acesso
  físico ao dispositivo pode inspecionar o armazenamento — use uma senha mestra forte e a
  criptografia do disco do sistema.
- **Parâmetros KDF:** Argon2id com 64 MiB/iterações 3 protege bem contra ataque offline, mas a
  senha mestra ainda é o elo mais fraco. Use no mínimo 12–16 caracteres ou uma frase-senha.

## Testes

A suíte cobre: roundtrip e falhas de criptografia (chave errada, dados adulterados, AAD),
unicidade de IVs, consistência do KDF, ausência de credenciais em texto puro no banco,
CRUD do cofre, bloqueio automático, rate-limit, gerador com todos os parâmetros e caracteres
ambíguos, auditoria de força/reutilização, backup (roundtrip, senha errada, arquivo corrompido,
versão futura, mesclar/substituir) e um fluxo completo de UI (criar cofre → adicionar credencial →
pesquisar → bloquear → desbloquear).

```bash
npm test
```

## Identidade visual

Tema escuro por padrão (grafite/preto com detalhes em roxo→azul), tipografia Inter, ícones SVG
consistentes, animações discretas com suporte a `prefers-reduced-motion`, e logotipo original
(marca "P" em degradê) em `public/logo.svg`.
