import { useDeferredValue, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatRelativeWindow } from "@/lib/date";
import { useAppState } from "@/state/app-state";

function toneForUrgency(level: "low" | "medium" | "high" | "critical") {
  if (level === "critical") {
    return "critical" as const;
  }

  if (level === "high") {
    return "warm" as const;
  }

  if (level === "medium") {
    return "default" as const;
  }

  return "muted" as const;
}

export function ShoppingPage() {
  const { workspace, addShoppingItem, toggleShoppingItem } = useAppState();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(workspace?.settings.shoppingCategories[0] ?? "Pantry");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredItems =
    workspace?.shoppingItems.filter((item) =>
      item.name.toLowerCase().includes(deferredQuery.trim().toLowerCase())
    ) ?? [];

  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader
        eyebrow="Shopping"
        title="Fast restock capture for the whole family."
        description="The input is intentionally simple so anyone can add a depleted item quickly. Urgency keeps the next shopping cycle obvious without making the list noisy."
      />

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[0.9fr_1.1fr] xl:gap-5">
        <Card className="space-y-3">
          <div>
            <p className="section-label">Quick add</p>
            <h2 className="section-title mt-2">Drop depleted items in immediately</h2>
          </div>

          <form
            className="space-y-2.5 sm:space-y-3"
            onSubmit={(event) => {
              event.preventDefault();

              if (!name.trim()) {
                return;
              }

              addShoppingItem({ name, category, urgency });
              setName("");
            }}
          >
            <Input placeholder="Add milk, detergent, bread..." value={name} onChange={(event) => setName(event.target.value)} />
            <div className="grid gap-2.5 md:grid-cols-2">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {workspace?.settings.shoppingCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select value={urgency} onChange={(event) => setUrgency(event.target.value as typeof urgency)}>
                <option value="low">Low urgency</option>
                <option value="medium">Medium urgency</option>
                <option value="high">High urgency</option>
                <option value="critical">Critical urgency</option>
              </Select>
            </div>
            <Button className="w-full" disabled={!name.trim()} type="submit">
              Add to shopping list
            </Button>
          </form>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-col items-start gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div>
              <p className="section-label">Shared list</p>
              <h2 className="section-title mt-2">Next shopping cycle</h2>
            </div>
            <Input className="w-full md:max-w-[240px]" placeholder="Search items" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {filteredItems.map((item) => (
              <button
                className="surface-tile flex w-full flex-col items-start gap-2.5 px-3 py-3 text-left transition hover:border-pine-200 hover:bg-canvas-surface md:flex-row md:items-center md:justify-between md:px-3.5 md:py-3.5"
                key={item.id}
                onClick={() => toggleShoppingItem(item.id)}
                type="button"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-lg font-semibold ${item.checked ? "text-slatewarm-500 line-through" : "text-slatewarm-900"}`}>{item.name}</p>
                    <Badge tone={toneForUrgency(item.urgency)}>
                      {item.urgency}
                    </Badge>
                    <Badge tone="default">{item.category}</Badge>
                  </div>
                  <p className="meta-copy">Added {formatRelativeWindow(item.createdAt)}</p>
                </div>
                <Badge className="self-start md:self-auto" tone={item.checked ? "success" : "warm"}>
                  {item.checked ? "Done" : "Pending"}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
