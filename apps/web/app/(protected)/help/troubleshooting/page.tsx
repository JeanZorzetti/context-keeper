export const dynamic = 'force-dynamic';

const issues = [
  {
    title: '"Error loading user" no Dashboard ou Billing',
    solution:
      'Acesse a página /dashboard primeiro. O sistema cria seu perfil automaticamente na primeira visita. Se o problema persistir, saia e faça login novamente.',
  },
  {
    title: 'Chave Groq inválida ou "API key not valid"',
    solution:
      'Verifique se a chave em Configurações começa com "gsk_". Acesse console.groq.com, confirme que a chave está ativa e gere uma nova se necessário.',
  },
  {
    title: 'Daemon não inicia / "command not found"',
    solution:
      'Certifique-se de ter Node.js 18+ instalado. Execute: node --version. Tente npx --yes @jeanzorzetti/context-keeper start para forçar o download.',
  },
  {
    title: 'Daemon inicia mas não captura decisões',
    solution:
      'Verifique se o Claude Code está gerando transcrições no diretório padrão. Confirme que a chave Groq está configurada em Configurações e está ativa.',
  },
  {
    title: 'Login não funciona / loop de redirecionamento',
    solution:
      'Limpe os cookies do navegador para context.nimblabs.com. Se usar bloqueador de anúncios, permita cookies de auth0.com. Tente em aba anônima.',
  },
  {
    title: 'Logout com erro de CORS',
    solution:
      'Use o botão "Sign Out" no menu de navegação. Se o problema persistir, acesse diretamente: https://context.nimblabs.com/api/auth/logout',
  },
  {
    title: 'Billing não carrega / plano não atualiza',
    solution:
      'Após um pagamento, aguarde alguns segundos e recarregue a página. O webhook do Stripe pode levar alguns instantes para processar.',
  },
  {
    title: 'Erro de conexão com o banco de dados',
    solution:
      'Este é um erro do servidor — não há ação do usuário. Aguarde alguns minutos e tente novamente. Se persistir, entre em contato com o suporte.',
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resolução de Problemas</h1>
        <p className="text-gray-600">Soluções para os problemas mais comuns do Context Keeper.</p>
      </div>

      {issues.map(({ title, solution }) => (
        <section key={title} className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-700 text-sm">{solution}</p>
        </section>
      ))}
    </div>
  );
}
