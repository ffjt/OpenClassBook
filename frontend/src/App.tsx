import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import type { Language } from "@/lib/i18n";

const AuthorEditorPage = lazy(() =>
  import("@/pages/author-editor-page").then((module) => ({
    default: module.AuthorEditorPage,
  })),
);
const BookCreatedPage = lazy(() =>
  import("@/pages/book-created-page").then((module) => ({
    default: module.BookCreatedPage,
  })),
);
const CreateBookPage = lazy(() =>
  import("@/pages/create-book-page").then((module) => ({
    default: module.CreateBookPage,
  })),
);
const DashboardOverviewPage = lazy(() =>
  import("@/pages/dashboard-overview-page").then((module) => ({
    default: module.DashboardOverviewPage,
  })),
);
const AuthorsPage = lazy(() =>
  import("@/pages/authors-page").then((module) => ({
    default: module.AuthorsPage,
  })),
);
const FormatSettingsPage = lazy(() =>
  import("@/pages/format-settings-page").then((module) => ({
    default: module.FormatSettingsPage,
  })),
);
const JoinBookPage = lazy(() =>
  import("@/pages/join-book-page").then((module) => ({
    default: module.JoinBookPage,
  })),
);
const JoinSuccessPage = lazy(() =>
  import("@/pages/join-success-page").then((module) => ({
    default: module.JoinSuccessPage,
  })),
);
const LandingPage = lazy(() =>
  import("@/pages/landing-page").then((module) => ({
    default: module.LandingPage,
  })),
);

interface CreatedBook {
  owner: string;
  title: string;
  inviteCode: string;
  joinLink: string;
}

interface SharedPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface DashboardRouteProps extends SharedPageProps {
  bookTitle?: string;
  page: "overview" | "authors" | "template";
}

function DashboardRoute({
  bookTitle,
  language,
  onNavigate,
  onToggleLanguage,
  page,
}: DashboardRouteProps) {
  const { bookId } = useParams();
  const basePath = bookId ? `/${bookId}/dashboard` : "/dashboard";
  const sharedProps = {
    basePath,
    language,
    onNavigate,
    onToggleLanguage,
  };

  if (page === "template") return <FormatSettingsPage {...sharedProps} />;
  if (page === "authors") return <AuthorsPage {...sharedProps} />;
  return <DashboardOverviewPage {...sharedProps} bookTitle={bookTitle} />;
}

const createFakeInviteCode = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length)),
  ).join("");

  return `OCB-${suffix}`;
};

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");
  const [createdBook, setCreatedBook] = useState<CreatedBook | null>(null);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const navigateTo = useCallback(
    (path: string) => {
      if (path === pathname) return;

      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate, pathname],
  );

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === "en" ? "zh" : "en"));
  }, []);

  const handleBookCreated = useCallback(
    (owner: string, title: string) => {
      const inviteCode = createFakeInviteCode();

      setCreatedBook({
        owner,
        title,
        inviteCode,
        joinLink: `https://openclassbook.local/join/${inviteCode}`,
      });
      navigateTo("/book/created");
    },
    [navigateTo],
  );

  const sharedProps: SharedPageProps = {
    language,
    onNavigate: navigateTo,
    onToggleLanguage: toggleLanguage,
  };

  return (
    <Suspense
      fallback={
        <div
          aria-label="Loading"
          className="min-h-screen animate-pulse bg-background"
          role="status"
        />
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage {...sharedProps} />} />
        <Route
          path="/book/new"
          element={
            <CreateBookPage
              {...sharedProps}
              onBookCreated={handleBookCreated}
            />
          }
        />
        <Route
          path="/book/created"
          element={
            createdBook ? (
              <BookCreatedPage {...sharedProps} book={createdBook} />
            ) : (
              <Navigate replace to="/book/new" />
            )
          }
        />
        <Route path="/join" element={<JoinBookPage {...sharedProps} />} />
        <Route
          path="/join/success"
          element={
            <JoinSuccessPage
              {...sharedProps}
              bookOwner={createdBook?.owner ?? ""}
            />
          }
        />
        <Route
          path="/submit/new"
          element={<AuthorEditorPage {...sharedProps} />}
        />
        {["/dashboard", "/:bookId/dashboard"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <DashboardRoute
                {...sharedProps}
                bookTitle={createdBook?.title}
                page="overview"
              />
            }
          />
        ))}
        {["/dashboard/authors", "/:bookId/dashboard/authors"].map((path) => (
          <Route
            key={path}
            path={path}
            element={<DashboardRoute {...sharedProps} page="authors" />}
          />
        ))}
        {["/dashboard/template", "/:bookId/dashboard/template"].map(
          (path) => (
            <Route
              key={path}
              path={path}
              element={<DashboardRoute {...sharedProps} page="template" />}
            />
          ),
        )}
        <Route path="*" element={<LandingPage {...sharedProps} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
