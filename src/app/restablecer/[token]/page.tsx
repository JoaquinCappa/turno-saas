import ResetPasswordClient from './ResetPasswordClient';

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const { token } = await params;
  
  // Here we don't validate the token Server-Side before rendering to avoid
  // consuming it prematurely, or we could just render the form and let the action handle it.
  // The actual verification and consumption happens strictly inside the Server Action.

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 shadow-md rounded-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Restablecer Contraseña</h1>
          <p className="text-gray-500 text-sm">
            Ingresa tu nueva contraseña.
          </p>
        </div>

        <ResetPasswordClient token={token} />
      </div>
    </div>
  );
}
