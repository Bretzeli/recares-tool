"use client";

import { useMemo, useState } from "react";

import { PRIORITY_ORDER, type Persona, type Priority, type Tag, type UserStory } from "@/lib/types";

import {
  ActiveChips,
  FilterBar,
  FilterMenu,
  SearchInput,
  SegmentedControl,
  SortSelect,
  type Option,
} from "./filters";
import { Empty } from "./ui";
import { UserStoryCard, type Lookups } from "./user-story-card";

type Assignment = "all" | "assigned" | "unassigned";
type Tagging = "all" | "tagged" | "untagged";
type TagMode = "any" | "all";
type Sort = "id" | "reach" | "reach-asc" | "priority" | "tags" | "category";

export interface InitialFilters {
  q?: string;
  personaIds?: number[];
  tagIds?: string[];
  categories?: string[];
  priorities?: Priority[];
  assignment?: Assignment;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  "n/a": "Not set",
};

export function UserStoryExplorer({
  userStories,
  personas,
  tags,
  categories,
  priorities,
  lookups,
  initial,
}: {
  userStories: UserStory[];
  personas: Persona[];
  tags: Tag[];
  categories: string[];
  priorities: Priority[];
  lookups: Lookups;
  initial?: InitialFilters;
}) {
  const [q, setQ] = useState(initial?.q ?? "");
  const [personaIds, setPersonaIds] = useState<string[]>(
    (initial?.personaIds ?? []).map(String),
  );
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [categoryFilter, setCategoryFilter] = useState<string[]>(initial?.categories ?? []);
  const [priorityFilter, setPriorityFilter] = useState<string[]>(initial?.priorities ?? []);
  const [assignment, setAssignment] = useState<Assignment>(initial?.assignment ?? "all");
  const [tagging, setTagging] = useState<Tagging>("all");
  const [tagMode, setTagMode] = useState<TagMode>("any");
  const [sort, setSort] = useState<Sort>("id");

  const personaOptions: Option[] = useMemo(
    () =>
      personas.map((p) => ({
        value: String(p.id),
        label: p.name,
        count: p.userStoryIds.length,
      })),
    [personas],
  );

  const tagOptions: Option[] = useMemo(() => {
    const sorted = [...tags].sort(
      (a, b) =>
        a.category.localeCompare(b.category, "en") || a.id.localeCompare(b.id, "en"),
    );
    return sorted.map((t) => ({
      value: t.id,
      label: t.id === t.description ? t.id : `${t.id} — ${t.description}`,
      count: t.userStoryIds.length,
      group: t.category,
    }));
  }, [tags]);

  const categoryOptions: Option[] = useMemo(
    () =>
      categories.map((c) => ({
        value: c,
        label: c,
        count: userStories.filter((s) => s.category === c).length,
      })),
    [categories, userStories],
  );

  const priorityOptions: Option[] = useMemo(
    () =>
      priorities.map((p) => ({
        value: p,
        label: PRIORITY_LABEL[p],
        count: userStories.filter((s) => s.priority === p).length,
      })),
    [priorities, userStories],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const wantedPersonas = personaIds.map(Number);

    const filtered = userStories.filter((story) => {
      if (assignment === "assigned" && story.personaIds.length === 0) return false;
      if (assignment === "unassigned" && story.personaIds.length > 0) return false;
      if (tagging === "tagged" && story.tagIds.length === 0) return false;
      if (tagging === "untagged" && story.tagIds.length > 0) return false;

      if (wantedPersonas.length > 0 && !wantedPersonas.some((id) => story.personaIds.includes(id))) {
        return false;
      }

      if (tagIds.length > 0) {
        const matches =
          tagMode === "all"
            ? tagIds.every((id) => story.tagIds.includes(id))
            : tagIds.some((id) => story.tagIds.includes(id));
        if (!matches) return false;
      }

      if (categoryFilter.length > 0 && !categoryFilter.includes(story.category)) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(story.priority)) return false;

      if (needle !== "") {
        const haystack = [
          `us-${story.id}`,
          String(story.id),
          story.text,
          story.originalText,
          story.category,
          ...story.tagIds,
          ...story.personaIds.map((id) => lookups.personaName[id] ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    });

    const byPriority = (s: UserStory) => PRIORITY_ORDER.indexOf(s.priority);
    const sorters: Record<Sort, (a: UserStory, b: UserStory) => number> = {
      id: (a, b) => a.id - b.id,
      reach: (a, b) => b.personaIds.length - a.personaIds.length || a.id - b.id,
      "reach-asc": (a, b) => a.personaIds.length - b.personaIds.length || a.id - b.id,
      priority: (a, b) => byPriority(a) - byPriority(b) || a.id - b.id,
      tags: (a, b) => b.tagIds.length - a.tagIds.length || a.id - b.id,
      category: (a, b) => a.category.localeCompare(b.category, "en") || a.id - b.id,
    };

    return [...filtered].sort(sorters[sort]);
  }, [
    userStories,
    q,
    personaIds,
    tagIds,
    tagMode,
    categoryFilter,
    priorityFilter,
    assignment,
    tagging,
    sort,
    lookups,
  ]);

  const chips = [
    ...personaIds.map((id) => ({
      key: `persona-${id}`,
      label: `Persona: ${personas.find((p) => String(p.id) === id)?.name ?? id}`,
      onRemove: () => setPersonaIds((prev) => prev.filter((v) => v !== id)),
    })),
    ...tagIds.map((id) => ({
      key: `tag-${id}`,
      label: `Tag: ${id}`,
      onRemove: () => setTagIds((prev) => prev.filter((v) => v !== id)),
    })),
    ...categoryFilter.map((c) => ({
      key: `category-${c}`,
      label: `Category: ${c}`,
      onRemove: () => setCategoryFilter((prev) => prev.filter((v) => v !== c)),
    })),
    ...priorityFilter.map((p) => ({
      key: `priority-${p}`,
      label: `Priority: ${PRIORITY_LABEL[p as Priority] ?? p}`,
      onRemove: () => setPriorityFilter((prev) => prev.filter((v) => v !== p)),
    })),
    ...(assignment !== "all"
      ? [
          {
            key: "assignment",
            label: assignment === "assigned" ? "Has a persona" : "No persona",
            onRemove: () => setAssignment("all"),
          },
        ]
      : []),
    ...(tagging !== "all"
      ? [
          {
            key: "tagging",
            label: tagging === "tagged" ? "Has tags" : "No tags",
            onRemove: () => setTagging("all"),
          },
        ]
      : []),
    ...(q.trim() !== ""
      ? [{ key: "q", label: `Search: ${q.trim()}`, onRemove: () => setQ("") }]
      : []),
  ];

  function clearAll() {
    setQ("");
    setPersonaIds([]);
    setTagIds([]);
    setCategoryFilter([]);
    setPriorityFilter([]);
    setAssignment("all");
    setTagging("all");
  }

  return (
    <div>
      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search stories, original wording, tags, personas…"
        />
        <FilterMenu
          label="Personas"
          options={personaOptions}
          selected={personaIds}
          onChange={setPersonaIds}
        />
        <FilterMenu
          label="Tags"
          options={tagOptions}
          selected={tagIds}
          onChange={setTagIds}
          width="24rem"
        />
        <FilterMenu
          label="Category"
          options={categoryOptions}
          selected={categoryFilter}
          onChange={setCategoryFilter}
          width="22rem"
        />
        <FilterMenu
          label="Priority"
          options={priorityOptions}
          selected={priorityFilter}
          onChange={setPriorityFilter}
          width="14rem"
        />
        <SegmentedControl<Assignment>
          ariaLabel="Persona assignment"
          value={assignment}
          onChange={setAssignment}
          options={[
            { value: "all", label: "All" },
            { value: "assigned", label: "Assigned" },
            { value: "unassigned", label: "Unassigned" },
          ]}
        />
        <SegmentedControl<Tagging>
          ariaLabel="Tag coverage"
          value={tagging}
          onChange={setTagging}
          options={[
            { value: "all", label: "Any tagging" },
            { value: "tagged", label: "Tagged" },
            { value: "untagged", label: "Untagged" },
          ]}
        />
        {tagIds.length > 1 && (
          <SegmentedControl<TagMode>
            ariaLabel="Tag match mode"
            value={tagMode}
            onChange={setTagMode}
            options={[
              { value: "any", label: "Any tag" },
              { value: "all", label: "All tags" },
            ]}
          />
        )}
        <SortSelect<Sort>
          value={sort}
          onChange={setSort}
          options={[
            { value: "id", label: "Story ID" },
            { value: "reach", label: "Most personas" },
            { value: "reach-asc", label: "Fewest personas" },
            { value: "priority", label: "Priority" },
            { value: "tags", label: "Most tags" },
            { value: "category", label: "Category" },
          ]}
        />
      </FilterBar>

      <ActiveChips chips={chips} onClearAll={clearAll} />

      <p className="mb-3 text-xs text-muted">
        Showing <span className="font-medium text-ink2 tabular-nums">{results.length}</span> of{" "}
        <span className="tabular-nums">{userStories.length}</span> user stories
      </p>

      {results.length === 0 ? (
        <Empty>No user story matches these filters.</Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((story) => (
            <UserStoryCard key={story.id} story={story} lookups={lookups} />
          ))}
        </div>
      )}
    </div>
  );
}
