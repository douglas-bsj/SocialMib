import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, extractApiKey, type ApiKeyContext } from "@/lib/api-keys";
import { TOOLS, callTool, ToolError } from "@/lib/mcp/tools";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Servidor MCP (Model Context Protocol) do Mib Social — transporte "Streamable HTTP",
 * modo sem sessão: cada POST traz uma mensagem JSON-RPC e recebe a resposta em JSON.
 *
 * Autenticação: Authorization: Bearer msk_...  (ou X-API-Key, ou ?key=msk_...)
 */

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "mib-social", title: "Mib Social", version: "1.0.0" };

const INSTRUCTIONS = `Você está conectado ao Mib Social, um gerenciador de redes sociais.
Comece com get_workspace e list_accounts. Para publicar, use create_post com os ids das contas
(mode: draft, now ou schedule). Datas sempre em ISO 8601 com fuso (o Brasil usa -03:00).
Instagram exige imagem; para imagens da internet, use upload_image_from_url antes.
Confirme com o usuário antes de publicar agora ou excluir posts.`;

type JsonRpcId = string | number | null;
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleMessage(msg: JsonRpcRequest, ctx: ApiKeyContext) {
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined;

  if (msg?.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(id, -32600, "Requisição JSON-RPC inválida.");
  }

  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion ?? "");
      const protocolVersion = SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, {
        tools: TOOLS.filter((t) => !("adminOnly" in t && t.adminOnly) || ctx.role !== "MEMBER").map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          ...("annotations" in t && t.annotations ? { annotations: t.annotations } : {}),
        })),
      });

    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      try {
        const result = await callTool(name, msg.params?.arguments, ctx);
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result && typeof result === "object" && !Array.isArray(result) ? result : { result },
        });
      } catch (e) {
        // Erros de uso voltam como resultado com isError, para a IA poder corrigir e tentar de novo.
        const message =
          e instanceof ToolError ? e.message : "Erro interno ao executar a ferramenta.";
        if (!(e instanceof ToolError)) console.error(`MCP tool ${name} error:`, e);
        return rpcResult(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }

    case "resources/list":
      return rpcResult(id, { resources: [] });
    case "prompts/list":
      return rpcResult(id, { prompts: [] });

    default:
      if (isNotification || msg.method.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Método não suportado: ${msg.method}`);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { limit: 120, window: 60, prefix: "rl:mcp" });
  if (limited) return limited;

  const ctx = await authenticateApiKey(extractApiKey(request));
  if (!ctx) {
    return NextResponse.json(
      rpcError(null, -32001, "Chave de API inválida ou ausente. Crie uma em Configurações → API e IA."),
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="mib-social"' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "JSON inválido."), { status: 400 });
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses = (
    await Promise.all(messages.map((m) => handleMessage(m as JsonRpcRequest, ctx)))
  ).filter((r) => r !== null);

  // Só notificações/respostas: o protocolo pede 202 sem corpo.
  if (responses.length === 0) return new NextResponse(null, { status: 202 });

  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}

// Modo sem sessão: não há canal SSE nem sessão para encerrar.
export async function GET() {
  return new NextResponse("Use POST para falar com o servidor MCP do Mib Social.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
