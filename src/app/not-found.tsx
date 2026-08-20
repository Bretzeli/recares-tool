import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">Not found</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
        That persona, user story or tag is not in the current sheets. It may have been renamed or
        removed from the files in <code>./data</code>.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
        {[
          { href: "/", label: "Overview" },
          { href: "/personas", label: "Personas" },
          { href: "/user-stories", label: "User stories" },
          { href: "/tags", label: "Tags" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-line px-3 py-2 text-ink2 hover:border-rule hover:text-ink"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
