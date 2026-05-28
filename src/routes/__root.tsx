import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aprova+ ENEM — Sua plataforma de estudos" },
      { name: "description", content: "Plataforma completa de preparação para o ENEM: cronograma, matérias, materiais, simulados, redação e tutor com IA." },
      { name: "author", content: "Aprova+ ENEM" },
      { property: "og:title", content: "Aprova+ ENEM — Sua plataforma de estudos" },
      { property: "og:description", content: "Plataforma completa de preparação para o ENEM: cronograma, matérias, materiais, simulados, redação e tutor com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Aprova+ ENEM — Sua plataforma de estudos" },
      { name: "twitter:description", content: "Plataforma completa de preparação para o ENEM: cronograma, matérias, materiais, simulados, redação e tutor com IA." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e173259b-dc27-436b-81aa-7e36a4aaee5b/id-preview-c71edab0--48899ad5-6538-434c-9194-845657ba2b02.lovable.app-1776564909393.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e173259b-dc27-436b-81aa-7e36a4aaee5b/id-preview-c71edab0--48899ad5-6538-434c-9194-845657ba2b02.lovable.app-1776564909393.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
