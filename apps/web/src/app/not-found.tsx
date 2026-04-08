import { ErrorView } from "../components/feedback/error-view";

export default function NotFound() {
  return (
    <ErrorView
      title="Page not found."
      detail="The page you requested does not exist or may have been replaced by a newer route."
      actionLabel="Go Home"
      actionHref="/"
    />
  );
}
