import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { ActionForm } from "@/components/forms/action-form";
import { CopyButton } from "@/components/forms/copy-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/input";
import { highestRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { addDays, londonToday } from "@/lib/dates";
import { publicAppUrl } from "@/lib/env";
import { formatCount } from "@/lib/utils";
import { supabaseServer } from "@/lib/supabase/server";
import { createTag, moveTag, renameTag, retireTag, setTagActive } from "./actions";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const session = await requireSession();
  if (highestRole(session.memberships) === "staff") notFound();
  const { store: storeFilter } = await searchParams;

  const supabase = await supabaseServer();
  const today = londonToday();
  const [{ data: stores }, { data: tags }, { data: counts }] = await Promise.all([
    supabase.from("stores").select("id, name, is_active").order("name"),
    supabase
      .from("tags")
      .select("id, label, public_code, is_active, retired_at, store_id, created_at")
      .order("created_at"),
    supabase.rpc("analytics_by_tag", { p_from: addDays(today, -29), p_to: today }),
  ]);

  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
  const taps = new Map((counts ?? []).map((c) => [c.tag_id, c]));
  const base = publicAppUrl();
  const visible = (tags ?? []).filter((t) => !storeFilter || t.store_id === storeFilter);
  const live = visible.filter((t) => !t.retired_at);
  const retired = visible.filter((t) => t.retired_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="mt-1 text-sm text-muted">
          One tag is one physical card with an NFC chip and a QR code. Counts show taps and scans in the last 30 days,
          which measure intent to review, not reviews.
        </p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer font-medium">Add a tag</summary>
          <ActionForm action={createTag} submitLabel="Create tag" className="mt-3 max-w-md">
            <Field label="Store" htmlFor="new-tag-store">
              <Select id="new-tag-store" name="storeId" required defaultValue={storeFilter ?? ""}>
                <option value="" disabled>
                  Choose a store
                </option>
                {(stores ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name (optional)" htmlFor="new-tag-label" hint="Leave blank to name it after the store, for example “Nottingham West Bridgford tag”.">
              <Input id="new-tag-label" name="label" />
            </Field>
          </ActionForm>
        </details>
      </Card>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Field label="Show tags for" htmlFor="filter-store">
          <Select id="filter-store" name="store" defaultValue={storeFilter ?? ""} className="w-64">
            <option value="">All my stores</option>
            {(stores ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          Filter
        </button>
      </form>

      {live.length === 0 ? (
        <EmptyState title="No tags here yet" hint="Add a tag above, then download its QR code and write its NFC address to a card." />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {live.map((tag) => (
            <TagCard key={tag.id} tag={tag} storeName={storeName.get(tag.store_id) ?? "Unknown store"} stores={stores ?? []} base={base} stats={taps.get(tag.id)} />
          ))}
        </ul>
      )}

      {retired.length > 0 ? (
        <section aria-labelledby="retired-heading">
          <h2 id="retired-heading" className="mb-2 text-base font-semibold">
            Retired tags
          </h2>
          <ul className="space-y-2">
            {retired.map((tag) => (
              <li key={tag.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  <span className="font-medium">{tag.label}</span>{" "}
                  <span className="text-muted">· {storeName.get(tag.store_id)}</span>
                </span>
                <Badge tone="danger">Retired</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type TagRow = { id: string; label: string; public_code: string; is_active: boolean; retired_at: string | null; store_id: string };

function TagCard({
  tag,
  storeName,
  stores,
  base,
  stats,
}: {
  tag: TagRow;
  storeName: string;
  stores: { id: string; name: string }[];
  base: string;
  stats?: { nfc: number; qr: number; total: number };
}) {
  const nfcUrl = `${base}/t/${tag.public_code}`;
  const qrUrl = `${base}/q/${tag.public_code}`;
  const qrImage = `/api/qr/${tag.public_code}`;
  return (
    <li>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{tag.label}</CardTitle>
            <CardDescription>{storeName}</CardDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              {tag.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Switched off</Badge>}
              <Badge>{formatCount(stats?.nfc ?? 0)} NFC taps</Badge>
              <Badge>{formatCount(stats?.qr ?? 0)} QR scans</Badge>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${qrImage}?format=svg`}
            alt={`QR code for ${tag.label}, which opens ${qrUrl}`}
            width={96}
            height={96}
            className="size-24 shrink-0 rounded border bg-white p-1 hairline"
          />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">NFC address (write this to the chip)</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-ground px-2 py-1.5 text-xs dark:bg-[#1f2d26]">{nfcUrl}</code>
            <CopyButton value={nfcUrl} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={nfcUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Test NFC link <ExternalLink aria-hidden="true" />
            <span className="sr-only">(opens in a new tab; counts as a real tap)</span>
          </a>
          <a href={qrUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Test QR link <ExternalLink aria-hidden="true" />
            <span className="sr-only">(opens in a new tab; counts as a real scan)</span>
          </a>
          <a href={`${qrImage}?format=svg&download=1`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Download aria-hidden="true" /> QR (SVG)
            <span className="sr-only"> download for {tag.label}</span>
          </a>
          <a href={`${qrImage}?format=png&download=1`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Download aria-hidden="true" /> QR (PNG)
            <span className="sr-only"> download for {tag.label}</span>
          </a>
        </div>
        <p className="text-xs text-muted">Test links open Google and count as a real tap or scan. SVG is best for printing.</p>

        <div className="space-y-2 border-t pt-3 text-sm hairline">
          <details>
            <summary className="cursor-pointer font-medium text-nfc">Rename</summary>
            <ActionForm action={renameTag} submitLabel="Save name" keepFields size="sm" className="mt-2 max-w-sm">
              <input type="hidden" name="id" value={tag.id} />
              <Input name="label" defaultValue={tag.label} aria-label={`New name for ${tag.label}`} required />
            </ActionForm>
          </details>
          <details>
            <summary className="cursor-pointer font-medium text-nfc">Move to another store</summary>
            <ActionForm action={moveTag} submitLabel="Move tag" keepFields size="sm" className="mt-2 max-w-sm">
              <input type="hidden" name="id" value={tag.id} />
              <Select name="storeId" defaultValue={tag.store_id} aria-label={`Store for ${tag.label}`}>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">The printed card stays valid. Past taps keep the store they were made at.</p>
            </ActionForm>
          </details>
          <div className="flex flex-wrap gap-3 pt-1">
            <ActionForm action={setTagActive} submitLabel={tag.is_active ? "Switch off" : "Switch on"} variant="secondary" size="sm" keepFields>
              <input type="hidden" name="id" value={tag.id} />
              <input type="hidden" name="active" value={String(!tag.is_active)} />
            </ActionForm>
            <ActionForm
              action={retireTag}
              submitLabel="Retire tag"
              variant="danger"
              size="sm"
              keepFields
              confirm={`Retire “${tag.label}”? This can't be undone. The card will show “not active” to anyone who taps it, and you would need a new tag and card.`}
            >
              <input type="hidden" name="id" value={tag.id} />
            </ActionForm>
          </div>
        </div>
      </Card>
    </li>
  );
}
