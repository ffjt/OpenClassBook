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
import {
  bookRepository,
  type Book,
  type BookCreateInput,
} from "@/repositories/bookRepository";

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
const MyBooksPage = lazy(() =>
  import("@/pages/my-books-page").then((module) => ({
    default: module.MyBooksPage,
  })),
);

interface SharedPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface DashboardRouteProps extends SharedPageProps {
  page: "overview" | "authors" | "review" | "template";
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
  if (page === "authors") return <AuthorsPage {...sharedProps} />;
  if (page === "review") return <ReviewPage {...sharedProps} />;
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

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");
  const [createdBook, setCreatedBook] = useState<Book | null>(null);

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
      <Routes>
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
        <Route path="/join" element={<JoinBookPage {...sharedProps} />} />
        <Route
          path="/join/success"
          element={
            <JoinSuccessPage
              {...sharedProps}
              bookOwner={createdBook?.owner_name ?? ""}
            />
          }
        />
        <Route
          path="/submit/new"
          element={<AuthorEditorPage {...sharedProps} />}
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
        <Route path="/dashboard/*" element={<Navigate replace to="/book" />} />
        <Route path="/:bookId/dashboard/*" element={<LegacyDashboardRedirect />} />
        <Route path="*" element={<LandingPage {...sharedProps} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
