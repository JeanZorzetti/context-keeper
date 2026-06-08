export const dynamic = 'force-dynamic';

export default function InstallationPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Guia de Instalação</h1>
        <p className="text-gray-600">Como instalar e configurar o Context Keeper no seu ambiente de desenvolvimento.</p>
      </div>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">O que é o Context Keeper?</h2>
        <p className="text-gray-700">O Context Keeper é um daemon que monitora as transcrições do <strong>Claude Code</strong>, extrai automaticamente as decisões arquiteturais via <strong>Groq AI</strong> e atualiza o <code>CLAUDE.md</code> do seu projeto com um histórico indexado de decisões. Isso garante que o contexto das suas sessões de desenvolvimento não se perca.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Pré-requisitos</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Node.js 18 ou superior</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Claude Code instalado</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Conta no Context Keeper (<a href="https://context.nimblabs.com" className="text-indigo-600 hover:underline">context.nimblabs.com</a>) com login configurado</span></li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 font-bold mt-0.5">✓</span><span>Chave de API da Groq (gratuita em <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.groq.com</a>)</span></li>
        </ul>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">1</span>
          <h2 className="text-xl font-semibold text-gray-900">Obter a chave da API Groq</h2>
        </div>
        <p className="text-gray-700 mb-3">Acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">console.groq.com</a>, crie uma conta gratuita e gere uma API Key. Copie a chave gerada.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">2</span>
          <h2 className="text-xl font-semibold text-gray-900">Configurar a chave no painel</h2>
        </div>
        <p className="text-gray-700">Acesse <a href="/settings" className="text-indigo-600 hover:underline">Configurações</a>, cole a chave Groq no campo <strong>&quot;Chave da API Groq&quot;</strong> e clique em <strong>&quot;Salvar Configurações&quot;</strong>.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">3</span>
          <h2 className="text-xl font-semibold text-gray-900">Instalar e iniciar o daemon</h2>
        </div>
        <p className="text-gray-700 mb-3">No terminal, dentro do diretório do seu projeto, execute:</p>
        <code className="block bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono text-gray-800">npx @jeanzorzetti/context-keeper start</code>
        <p className="text-gray-600 text-sm mt-3">O daemon ficará ativo monitorando as transcrições do Claude Code. Ele detecta novas decisões, extrai o contexto via Groq e atualiza o <code>CLAUDE.md</code> automaticamente.</p>
      </section>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">4</span>
          <h2 className="text-xl font-semibold text-gray-900">Configurar o servidor MCP (opcional)</h2>
        </div>
        <p className="text-gray-700 mb-3">Para injetar contexto automaticamente no início de cada sessão do Claude Code, adicione o servidor MCP ao seu <code>~/.claude/settings.json</code>:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono text-gray-800 overflow-x-auto">{`{
  "mcpServers": {
    "context-keeper": {
      "command": "npx",
      "args": ["context-keeper-mcp"]
    }
  }
}`}</pre>
        <p className="text-gray-600 text-sm mt-3">Com o MCP ativo, o Claude Code terá acesso às decisões recentes via <code>context://current</code> e às ferramentas <code>get_decisions</code> e <code>inject_context</code>.</p>
      </section>
    </div>
  );
}
