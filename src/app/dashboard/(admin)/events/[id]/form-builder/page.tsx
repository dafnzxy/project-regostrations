import { notFound } from "next/navigation";
import { getEventById } from "@/actions/events";
import { FormBuilderClient } from "./FormBuilderClient";
import { FormField } from "@/types";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FormBuilderPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  let parsedSchema: FormField[] = [];
  try {
    parsedSchema = JSON.parse(event.formSchema || "[]");
  } catch (e) {
    parsedSchema = [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl liquid-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Form Builder: {event.title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            URL Publik Event:{" "}
            <Link
              href={`/e/${event.slug}`}
              target="_blank"
              className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              /e/{event.slug}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>

      <FormBuilderClient
        eventId={event.id}
        initialSchema={parsedSchema}
        eventSlug={event.slug}
      />
    </div>
  );
}
