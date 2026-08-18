"use client";

import type { Skill, SkillLevel } from "@prisma/client";
import { Plus, Wrench } from "lucide-react";
import * as React from "react";

import { DeleteButton, EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteSkillAction,
  saveSkillAction,
} from "@/lib/server/actions/profile";

const LEVEL_LABEL: Record<SkillLevel, string> = {
  FAMILIAR: "Familiar",
  PROFICIENT: "Proficient",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

function SkillFields({
  skill,
  errors,
}: {
  skill?: Skill;
  errors: Record<string, string>;
}) {
  const key = skill?.id ?? "new";
  const [level, setLevel] = React.useState<SkillLevel>(
    skill?.level ?? "PROFICIENT",
  );

  return (
    <>
      {skill ? <input type="hidden" name="id" value={skill.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`name-${key}`} label="Skill" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              name="name"
              required
              placeholder="PostgreSQL"
              defaultValue={skill?.name}
            />
          )}
        </Field>
        <Field
          id={`category-${key}`}
          label="Category"
          hint="Free text — used only for grouping."
          error={errors.category}
        >
          {(p) => (
            <Input
              {...p}
              name="category"
              placeholder="Data"
              defaultValue={skill?.category ?? ""}
            />
          )}
        </Field>
        <Field id={`level-${key}`} label="Level" error={errors.level}>
          {(p) => (
            <>
              <input type="hidden" name="level" value={level} />
              <Select
                value={level}
                onValueChange={(v) => setLevel(v as SkillLevel)}
              >
                <SelectTrigger {...p}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </Field>
        <Field
          id={`yearsExperience-${key}`}
          label="Years"
          error={errors.yearsExperience}
        >
          {(p) => (
            <Input
              {...p}
              name="yearsExperience"
              inputMode="numeric"
              placeholder="5"
              defaultValue={skill?.yearsExperience ?? ""}
            />
          )}
        </Field>
      </div>
    </>
  );
}

export function SkillsSection({
  hasProfile,
  skills,
}: {
  hasProfile: boolean;
  skills: Skill[];
}) {
  if (!hasProfile) {
    return (
      <EmptyState
        icon={<Wrench />}
        title="Save your basics first"
        description="Skills attach to your profile, so the Basics tab needs a name before you can add them."
      />
    );
  }

  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const key = skill.category ?? "Other";
    (acc[key] ??= []).push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink-muted text-sm">
          Fit scoring matches postings against this list, so use the words a
          posting would use.
        </p>
        <EntityDialog
          trigger={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus />
                Add skill
              </Button>
            </DialogTrigger>
          }
          title="Add a skill"
          action={saveSkillAction}
          successMessage="Skill added."
        >
          {(errors) => <SkillFields errors={errors} />}
        </EntityDialog>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title="No skills yet"
          description="Add the skills you would defend in an interview. Anything not listed here is reported as missing evidence rather than assumed."
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, list]) => (
            <Card key={category}>
              <CardContent className="p-5">
                <h3 className="text-ink-subtle font-mono text-xs tracking-wide uppercase">
                  {category}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {list.map((skill) => (
                    <li
                      key={skill.id}
                      className="bg-surface-raised border-line flex items-center gap-2 rounded-md border py-1 pr-1 pl-2.5"
                    >
                      <span className="text-ink text-sm">{skill.name}</span>
                      <Badge
                        tone="neutral"
                        className="border-0 bg-transparent px-0"
                      >
                        {LEVEL_LABEL[skill.level]}
                        {skill.yearsExperience
                          ? ` · ${skill.yearsExperience}y`
                          : ""}
                      </Badge>
                      <EntityDialog
                        trigger={
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5"
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                        }
                        title="Edit skill"
                        action={saveSkillAction}
                        successMessage="Skill updated."
                      >
                        {(errors) => (
                          <SkillFields skill={skill} errors={errors} />
                        )}
                      </EntityDialog>
                      <DeleteButton
                        label="✕"
                        confirmLabel="Sure?"
                        successMessage="Skill removed."
                        onDelete={() => deleteSkillAction(skill.id)}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
