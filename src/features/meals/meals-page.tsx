import { PageHeader } from "@/components/shared/page-header";
import { Avatar } from "@/components/shared/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFocusTarget } from "@/hooks/use-focus-target";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCalendarLabel } from "@/lib/date";
import { useAppState } from "@/state/app-state";
import { useState } from "react";

export function MealsPage() {
  const { familyMembers, workspace, updateMealCook, todayMeal, canManageSchedules, submitChangeRequest } = useAppState();
  const [requestingMealId, setRequestingMealId] = useState<string | null>(null);
  const [requestedCookId, setRequestedCookId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const { isFocused } = useFocusTarget();
  const meals = workspace?.meals.slice().sort((left, right) => left.date.localeCompare(right.date)) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Meals"
        title="Simple meal planning with clear cooking ownership."
        description="Plan ahead by day, keep dinner visible on the Today screen, and make shopping easier by keeping ingredients connected to each meal."
        actions={<Badge tone="warm">{workspace?.settings.mealFocus ?? "Meal rhythm"}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-5">
          <div>
            <p className="section-label">Today</p>
            <h2 className="section-title mt-2">Dinner focus</h2>
          </div>

          {todayMeal ? (
            <div
              className={`space-y-4 rounded-[1.5rem] p-4 ${
                isFocused(todayMeal.id) ? "surface-active" : "surface-soft"
              }`}
              data-focus-id={todayMeal.id}
              tabIndex={-1}
            >
              <div>
                <p className="text-[1.85rem] font-semibold leading-tight text-slatewarm-900">{todayMeal.title}</p>
                <p className="body-copy mt-2">{todayMeal.notes}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayMeal.ingredients.map((ingredient) => (
                  <Badge key={ingredient} tone="muted">
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="section-label">Week plan</p>
            <h2 className="section-title mt-2">Planned meals</h2>
          </div>

          <div className="space-y-3">
            {meals.map((meal) => {
              const cook = familyMembers.find((member) => member.id === meal.cookId);

              return (
                <div
                className={`rounded-3xl p-4 outline-none ${
                    isFocused(meal.id) ? "surface-active" : "surface-tile"
                  }`}
                  data-focus-id={meal.id}
                  key={meal.id}
                  tabIndex={-1}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-semibold text-slatewarm-900">{meal.title}</p>
                        <p className="text-sm text-slatewarm-600">{formatCalendarLabel(meal.date)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meal.ingredients.map((ingredient) => (
                          <Badge key={ingredient} tone="muted">
                            {ingredient}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="w-full max-w-[240px] space-y-2">
                      <label className="field-label">
                        {canManageSchedules ? "Cook assigned" : "Assigned cook"}
                      </label>
                      {canManageSchedules ? (
                        <Select value={meal.cookId} onChange={(event) => updateMealCook(meal.id, event.target.value)}>
                          {familyMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.displayName}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                      {cook ? (
                        <div className="surface-pill flex items-center gap-3 px-3 py-2">
                          <Avatar member={cook} size="sm" />
                          <span className="field-label">{cook.displayName}</span>
                        </div>
                      ) : null}
                      {!canManageSchedules ? (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setRequestingMealId(meal.id);
                            setRequestedCookId(familyMembers.find((member) => member.id !== meal.cookId)?.id ?? meal.cookId);
                            setRequestReason("");
                          }}
                        >
                          Request change
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {!canManageSchedules && requestingMealId === meal.id ? (
                    <div className="surface-soft mt-4 space-y-3 rounded-3xl p-4">
                      <div>
                        <p className="text-sm font-semibold text-slatewarm-900">Suggest a cook change</p>
                        <p className="body-copy mt-1">
                          Meal assignments stay governed centrally, but you can request an adjustment here.
                        </p>
                      </div>
                      <Select value={requestedCookId} onChange={(event) => setRequestedCookId(event.target.value)}>
                        {familyMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </Select>
                      <Textarea
                        placeholder="Explain why this cooking assignment should change."
                        value={requestReason}
                        onChange={(event) => setRequestReason(event.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            const result = submitChangeRequest({
                              type: "meal-reassign",
                              targetType: "meal",
                              targetId: meal.id,
                              title: `Meal change request for ${meal.title}`,
                              details: requestReason || `Please review the cooking assignment for ${meal.title}.`,
                              requestedForMemberId: requestedCookId,
                              proposedChanges: {
                                cookId: requestedCookId
                              }
                            });

                            if (result.success) {
                              setRequestingMealId(null);
                              setRequestedCookId("");
                              setRequestReason("");
                            }
                          }}
                        >
                          Submit request
                        </Button>
                        <Button variant="soft" onClick={() => setRequestingMealId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
