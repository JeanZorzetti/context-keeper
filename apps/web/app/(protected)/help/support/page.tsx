export const dynamic = 'force-dynamic';

export default function SupportPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contatar Suporte</h1>
        <p className="text-gray-600">Não encontrou a resposta? Entre em contato com a equipe.</p>
      </div>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Canais de Suporte</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xl flex-shrink-0">✉</div>
            <div>
              <h3 className="font-semibold text-gray-900">E-mail</h3>
              {/* TODO: confirmar endereço de suporte real com o usuário antes do go-live */}
              <p className="text-gray-600 text-sm">
                suporte@nimblabs.com{' '}
                <span className="text-yellow-600 text-xs">(⚠ confirmar endereço)</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">Resposta em até 2 dias úteis.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-xl flex-shrink-0">⌥</div>
            <div>
              <h3 className="font-semibold text-gray-900">GitHub Issues</h3>
              <a
                href="https://github.com/JeanZorzetti/context-keeper/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline text-sm"
              >
                github.com/JeanZorzetti/context-keeper/issues
              </a>
              <p className="text-gray-500 text-xs mt-1">Para bugs ou sugestões de funcionalidades.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-indigo-900 mb-2">Antes de abrir um chamado</h2>
        <ul className="space-y-1 text-sm text-indigo-800">
          <li>→ Confira a <a href="/help/troubleshooting" className="hover:underline font-medium">Resolução de Problemas</a></li>
          <li>→ Inclua o erro exato (console do navegador ou terminal)</li>
          <li>→ Informe o navegador/OS e se o problema é reproduzível</li>
        </ul>
      </section>
    </div>
  );
}
