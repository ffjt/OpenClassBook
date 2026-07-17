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
import { AppErrorBoundary } from "@/components/app-error-boundary";
import {
  bookRepository,
  type Book,
  type BookCreateInput,
} from "@/repositories/bookRepository";

const languageStorageKey = "openclassbook-language";

function getInitialLanguage(): Language {
  const savedLanguage = window.localStorage.getItem(languageStorageKey);
  return savedLanguage === "zh" || savedLanguage === "en"
    ? savedLanguage
    : "en";
}

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
const ReviewPage = lazy(() =>
  import("@/pages/review-page").then((module) => ({
    default: module.ReviewPage,
  })),
);
const BookLayoutPage = lazy(() =>
  import("@/pages/book-layout-page").then((module) => ({
    default: module.BookLayoutPage,
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
const FirstTimeSetupPage = lazy(() =>
  import("@/pages/first-time-setup-page").then((module) => ({
    default: module.FirstTimeSetupPage,
  })),
);
const ExportPage = lazy(() =>
  import("@/pages/export-page").then((module) => ({
    default: module.ExportPage,
  })),
);
const BookSettingsPage = lazy(() =>
  import("@/pages/book-settings-page").then((module) => ({
    default: module.BookSettingsPage,
  })),
);
const AuthorSelectPage = lazy(() =>
  import("@/pages/author-select-page").then((module) => ({
    default: module.AuthorSelectPage,
  })),
);
const InvitePage = lazy(() =>
  import("@/pages/invite-page").then((module) => ({
    default: module.InvitePage,
  })),
);
const LandingPage = lazy(() =>
  import("@/pages/landing-page").then((module) => ({
    default: module.LandingPage,
  })),
);
const MyBooksPage = lazy(() =>
  import("@/pages/my-books-page").then((module) => ({
    default: module.MyBooksPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found-page").then((module) => ({
    default: module.NotFoundPage,
  })),
);

interface SharedPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface DashboardRouteProps extends SharedPageProps {
  page: "overview" | "authors" | "review" | "template" | "layout" | "export" | "settings";
}

function DashboardRoute({
  language,
  onNavigate,
  onToggleLanguage,
  page,
}: DashboardRouteProps) {
  const { bookId } = useParams();
  const routeBookId = bookId && /^\d+$/.test(bookId) ? Number(bookId) : undefined;
  if (!routeBookId) return <Navigate replace to="/book" />;

  const basePath = `/book/${routeBookId}/dashboard`;
  const sharedProps = {
    basePath,
    language,
    onNavigate,
    onToggleLanguage,
  };

  if (page === "template") {
    return <FormatSettingsPage {...sharedProps} bookId={routeBookId} />;
  }
  if (page === "authors") {
    return <AuthorsPage {...sharedProps} bookId={routeBookId} />;
  }
  if (page === "review") {
    return <ReviewPage {...sharedProps} bookId={routeBookId} />;
  }
  if (page === "layout") return <BookLayoutPage {...sharedProps} bookId={routeBookId} />;
  if (page === "export") return <ExportPage {...sharedProps} bookId={routeBookId} />;
  if (page === "settings") return <BookSettingsPage {...sharedProps} bookId={routeBookId} />;
  return (
    <DashboardOverviewPage
      {...sharedProps}
      bookId={routeBookId}
    />
  );
}

function LegacyDashboardRedirect() {
  const { bookId } = useParams();
  const { pathname } = useLocation();

  if (!bookId || !/^\d+$/.test(bookId)) {
    return <Navigate replace to="/book" />;
  }

  const suffix = pathname.split("/dashboard")[1] ?? "";
  return <Navigate replace to={`/book/${bookId}/dashboard${suffix}`} />;
}

function InviteRoute(props: SharedPageProps) {
  const { bookId } = useParams();
  const routeBookId = bookId && /^\d+$/.test(bookId) ? Number(bookId) : undefined;
  if (!routeBookId) return <Navigate replace to="/book" />;

  return (
    <InvitePage
      {...props}
      basePath={`/book/${routeBookId}/dashboard`}
      bookId={routeBookId}
    />
  );
}

function JoinRoute(props: SharedPageProps) {
  const { inviteCode } = useParams();
  return <JoinBookPage {...props} inviteCode={inviteCode} />;
}

function FirstTimeSetupRoute({
  step,
  ...props
}: SharedPageProps & { step: "settings" | "template" }) {
  const { bookId } = useParams();
  const routeBookId = bookId && /^\d+$/.test(bookId) ? Number(bookId) : undefined;
  if (!routeBookId) return <Navigate replace to="/book" />;

  return <FirstTimeSetupPage {...props} bookId={routeBookId} step={step} />;
}

function AuthorSelectRoute(props: SharedPageProps) {
  const { inviteCode } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const name = query.get("name")?.trim();
  const classValue = query.get("classValue")?.trim();
  if (!inviteCode || !name) {
    return <Navigate replace to={inviteCode ? `/join/${inviteCode}` : "/join"} />;
  }
  return <AuthorSelectPage {...props} classValue={classValue} inviteCode={inviteCode} name={name} />;
}

function WelcomeRoute(props: SharedPageProps) {
  const { authorId } = useParams();
  const routeAuthorId = authorId && /^\d+$/.test(authorId) ? Number(authorId) : undefined;
  if (!routeAuthorId) return <Navigate replace to="/join" />;
  return <JoinSuccessPage {...props} authorId={routeAuthorId} />;
}

function AuthorEditorRoute(props: SharedPageProps) {
  const { authorId } = useParams();
  if (!authorId || !/^\d+$/.test(authorId)) {
    return <Navigate replace to="/join" />;
  }
  return <AuthorEditorPage {...props} authorId={Number(authorId)} />;
}

function App() {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [createdBook, setCreatedBook] = useState<Book | null>(null);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  const navigateTo = useCallback(
    (path: string) => {
      if (path === pathname) return;

      navigate(path);
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [navigate, pathname],
  );

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === "en" ? "zh" : "en"));
  }, []);

  const handleBookCreated = useCallback(
    async (data: BookCreateInput) => {
      const book = await bookRepository.create(data);
      setCreatedBook(book);
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
      <AppErrorBoundary key={pathname} language={language}>
        <div className="route-enter min-h-screen" key={pathname}>
      <Routes location={location}>
        <Route path="/" element={<LandingPage {...sharedProps} />} />
        <Route path="/book" element={<MyBooksPage {...sharedProps} />} />
        <Route
          path="/book/create"
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
              <Navigate replace to="/book/create" />
            )
          }
        />
        <Route path="/book/new" element={<Navigate replace to="/book/create" />} />
        <Route
          path="/book/:bookId/setup"
          element={<FirstTimeSetupRoute {...sharedProps} step="settings" />}
        />
        <Route
          path="/book/:bookId/setup/settings"
          element={<FirstTimeSetupRoute {...sharedProps} step="settings" />}
        />
        <Route
          path="/book/:bookId/setup/template"
          element={<FirstTimeSetupRoute {...sharedProps} step="template" />}
        />
        <Route path="/join" element={<JoinRoute {...sharedProps} />} />
        <Route path="/join/:inviteCode/select" element={<AuthorSelectRoute {...sharedProps} />} />
        <Route path="/join/:inviteCode" element={<JoinRoute {...sharedProps} />} />
        <Route path="/welcome/:authorId" element={<WelcomeRoute {...sharedProps} />} />
        <Route path="/join/success" element={<Navigate replace to="/join" />} />
        <Route path="/author/:authorId/editor" element={<AuthorEditorRoute {...sharedProps} />} />
        <Route
          path="/submit/new"
          element={<Navigate replace to="/join" />}
        />
        <Route
          path="/book/:bookId/dashboard"
          element={<DashboardRoute {...sharedProps} page="overview" />}
        />
        <Route
          path="/book/:bookId/dashboard/authors"
          element={<DashboardRoute {...sharedProps} page="authors" />}
        />
        <Route
          path="/book/:bookId/dashboard/review"
          element={<DashboardRoute {...sharedProps} page="review" />}
        />
        <Route
          path="/book/:bookId/dashboard/template"
          element={<DashboardRoute {...sharedProps} page="template" />}
        />
        <Route
          path="/book/:bookId/invite"
          element={<InviteRoute {...sharedProps} />}
        />
        <Route
          path="/book/:bookId/dashboard/layout"
          element={<DashboardRoute {...sharedProps} page="layout" />}
        />
        <Route
          path="/book/:bookId/dashboard/export"
          element={<DashboardRoute {...sharedProps} page="export" />}
        />
        <Route
          path="/book/:bookId/dashboard/settings"
          element={<DashboardRoute {...sharedProps} page="settings" />}
        />
        <Route path="/dashboard/*" element={<Navigate replace to="/book" />} />
        <Route path="/:bookId/dashboard/*" element={<LegacyDashboardRedirect />} />
        <Route path="*" element={<NotFoundPage {...sharedProps} />} />
      </Routes>
        </div>
      </AppErrorBoundary>
    </Suspense>
  );
}

export default App;
