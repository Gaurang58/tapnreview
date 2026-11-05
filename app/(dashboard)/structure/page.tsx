import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ActionForm } from "@/components/forms/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { highestRole, isAdmin } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { PLACE_ID_FINDER_URL } from "@/lib/redirect/url";
import { supabaseServer } from "@/lib/supabase/server";
import { createArea, createCity, createStore, updateArea, updateCity, updateStore } from "./actions";

export const metadata: Metadata = { title: "Areas and stores" };

type Store = {
  id: string;
  city_id: string;
  name: string;
  google_place_id: string | null;
  google_review_url: string;
  is_active: boolean;
};

export default async function StructurePage() {
  const session = await requireSession();
  const top = highestRole(session.memberships);
  if (top !== "admin" && top !== "area_manager") notFound();
  const admin = isAdmin(session.memberships);

  // Read as the signed-in person, so an area manager only gets their own areas.
  const supabase = await supabaseServer();
  const [{ data: areas }, { data: cities }, { data: stores }, { data: tags }] = await Promise.all([
    supabase.from("areas").select("id, name, is_active").order("name"),
    supabase.from("cities").select("id, area_id, name").order("name"),
    supabase
      .from("stores")
      .select("id, city_id, name, google_place_id, google_review_url, is_active")
      .order("name"),
    supabase.from("tags").select("store_id, is_active, retired_at"),
  ]);

  const activeTags = new Map<string, number>();
  for (const t of tags ?? []) {
    if (t.is_active && !t.retired_at) activeTags.set(t.store_id, (activeTags.get(t.store_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Areas and stores</h1>
        <p className="mt-1 text-sm text-muted">
          Each store has its own Google review link. Switch a store off instead of deleting it, so its history stays.
        </p>
      </div>

      {admin ? (
        <Card>
          <details>
            <summary className="cursor-pointer font-medium">Add an area</summary>
            <ActionForm action={createArea} submitLabel="Add area" className="mt-3 max-w-sm">
              <Field label="Area name" htmlFor="new-area">
                <Input id="new-area" name="name" placeholder="Area 4" required />
              </Field>
            </ActionForm>
          </details>
        </Card>
      ) : null}

      {(areas ?? []).length === 0 ? <EmptyState title="No areas yet" hint="Add an area to get started." /> : null}

      {(areas ?? []).map((area) => {
        const areaCities = (cities ?? []).filter((c) => c.area_id === area.id);
        return (
          <Card key={area.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{area.name}</CardTitle>
                {area.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Switched off</Badge>}
              </div>
            </div>

            {admin ? (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-nfc">Edit area</summary>
                <ActionForm action={updateArea} submitLabel="Save area" keepFields className="mt-3 max-w-sm">
                  <input type="hidden" name="id" value={area.id} />
                  <Field label="Area name" htmlFor={`area-${area.id}`}>
                    <Input id={`area-${area.id}`} name="name" defaultValue={area.name} required />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={area.is_active} className="size-4" />
                    Area is active
                  </label>
                </ActionForm>
              </details>
            ) : null}

            {areaCities.length === 0 ? <CardDescription>No cities in this area yet.</CardDescription> : null}

            {areaCities.map((city) => {
              const cityStores = ((stores ?? []) as Store[]).filter((s) => s.city_id === city.id);
              return (
                <section key={city.id} aria-labelledby={`city-${city.id}`} className="rounded-md border p-3 hairline">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`city-${city.id}`} className="font-semibold">
                      {city.name}
                    </h3>
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-nfc">Rename city</summary>
                      <ActionForm action={updateCity} submitLabel="Save" keepFields size="sm" className="mt-2 w-64">
                        <input type="hidden" name="id" value={city.id} />
                        <Input name="name" defaultValue={city.name} aria-label={`Name of ${city.name}`} required />
                      </ActionForm>
                    </details>
                  </div>

                  <ul className="mt-3 divide-y hairline">
                    {cityStores.map((store) => (
                      <li key={store.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-medium">{store.name}</span>{" "}
                            {store.is_active ? <Badge tone="nfc">Active</Badge> : <Badge tone="danger">Off</Badge>}
                            <p className="text-xs text-muted">
                              {activeTags.get(store.id) ?? 0} active tag{(activeTags.get(store.id) ?? 0) === 1 ? "" : "s"}
                              {store.google_place_id ? ` · Place ID ${store.google_place_id}` : " · custom Google link"}
                            </p>
                          </div>
                          <a
                            href={store.google_review_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-nfc hover:underline"
                          >
                            Test review link <ExternalLink className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">(opens Google in a new tab)</span>
                          </a>
                        </div>
                        <details className="mt-2 text-sm">
                          <summary className="cursor-pointer font-medium text-nfc">Edit store</summary>
                          <ActionForm action={updateStore} submitLabel="Save store" keepFields className="mt-3 max-w-xl">
                            <input type="hidden" name="id" value={store.id} />
                            <StoreFields prefix={store.id} store={store} />
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="isActive" defaultChecked={store.is_active} className="size-4" />
                              Store is active (cards redirect to Google)
                            </label>
                          </ActionForm>
                        </details>
                      </li>
                    ))}
                  </ul>

                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-medium text-nfc">Add a store in {city.name}</summary>
                    <ActionForm action={createStore} submitLabel="Add store" className="mt-3 max-w-xl">
                      <input type="hidden" name="cityId" value={city.id} />
                      <StoreFields prefix={`new-${city.id}`} />
                    </ActionForm>
                  </details>
                </section>
              );
            })}

            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-nfc">Add a city to {area.name}</summary>
              <ActionForm action={createCity} submitLabel="Add city" className="mt-3 max-w-sm">
                <input type="hidden" name="areaId" value={area.id} />
                <Field label="City name" htmlFor={`new-city-${area.id}`}>
                  <Input id={`new-city-${area.id}`} name="name" placeholder="Derby" required />
                </Field>
              </ActionForm>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

function StoreFields({ prefix, store }: { prefix: string; store?: Store }) {
  return (
    <>
      <Field label="Store name" htmlFor={`name-${prefix}`} hint="City plus location, for example Nottingham West Bridgford.">
        <Input id={`name-${prefix}`} name="name" defaultValue={store?.name} required />
      </Field>
      <Field label="Google Place ID" htmlFor={`place-${prefix}`}>
        <Input id={`place-${prefix}`} name="placeId" defaultValue={store?.google_place_id ?? ""} placeholder="ChIJ…" />
      </Field>
      <p className="-mt-1 text-xs text-muted">
        Don&apos;t know it?{" "}
        <a href={PLACE_ID_FINDER_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-nfc hover:underline">
          Find the Place ID on Google<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
      <Field
        label="Or paste a Google review link (optional)"
        htmlFor={`link-${prefix}`}
        hint="Only Google addresses are accepted. If you fill this in, it is used instead of the Place ID."
      >
        <Input
          id={`link-${prefix}`}
          name="link"
          type="url"
          placeholder="https://g.page/r/…"
          defaultValue={store && !store.google_place_id ? store.google_review_url : ""}
        />
      </Field>
    </>
  );
}
