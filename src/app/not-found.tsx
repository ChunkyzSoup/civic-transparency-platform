import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="page-shell page-section">
      <Card className="section-grid">
        <h1>Page not found</h1>
        <p className="muted-text">
          This route does not exist in the current MVP scaffold or demo dataset.
        </p>
        <p>
          Return to the <Link href="/">home page</Link> or try the{" "}
          <Link href="/search?q=Maria%20Torres">search explorer</Link>.
        </p>
      </Card>
    </div>
  );
}
