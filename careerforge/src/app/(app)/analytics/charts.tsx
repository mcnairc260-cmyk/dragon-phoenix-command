"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Both charts here plot a single series, so there is no legend and no
 * categorical palette: one accent hue carries magnitude, the title says what is
 * being measured, and every number is also available in the table beneath the
 * plot so nothing is gated behind colour or hover.
 *
 * Mark specs are the shared ones — bars capped at 24px with a 4px rounded
 * data-end squared at the baseline, hairline recessive gridlines, and axis text
 * in ink tokens rather than the series colour.
 */

const AXIS_TICK = { fill: "var(--ink-subtle)", fontSize: 11 };
const MAX_BAR = 24;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="bg-surface-raised border-line text-ink rounded-md border px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-ink-subtle">{label}</p>
      <p className="mt-0.5 font-mono">
        {value} {value === 1 ? unit : `${unit}s`}
      </p>
    </div>
  );
}

/** Values also rendered as a table, so the data is never hover-only. */
function DataTable({
  caption,
  rows,
  valueLabel,
}: {
  caption: string;
  rows: { key: string; label: string; value: number }[];
  valueLabel: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <details
      className="mt-3"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="text-ink-subtle cursor-pointer text-xs">
        {open ? "Hide" : "Show"} the numbers
      </summary>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-ink-subtle text-left">
            <th scope="col" className="py-1 font-medium">
              Period
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              {valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-line border-t">
              <td className="text-ink-muted py-1">{row.label}</td>
              <td className="text-ink py-1 text-right font-mono tabular-nums">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function ApplicationsChart({
  data,
}: {
  data: { weekStart: string; label: string; applications: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.applications, 0);

  if (total === 0) {
    return (
      <p className="text-ink-muted py-10 text-center text-sm leading-relaxed">
        No applications submitted in the last twelve weeks. Move a job to
        Applied and it will show up here.
      </p>
    );
  }

  return (
    <div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
          >
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-raised)" }}
              content={<ChartTooltip unit="application" />}
            />
            <Bar
              dataKey="applications"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={MAX_BAR}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DataTable
        caption="Applications submitted per week over the last twelve weeks"
        valueLabel="Applications"
        rows={data.map((d) => ({
          key: d.weekStart,
          label: `Week of ${d.label}`,
          value: d.applications,
        }))}
      />
    </div>
  );
}

export function PipelineChart({
  data,
}: {
  data: { stage: string; count: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(...data.map((d) => d.count), 0);

  if (total === 0) {
    return (
      <p className="text-ink-muted py-10 text-center text-sm leading-relaxed">
        Nothing is in an active stage right now.
      </p>
    );
  }

  return (
    <div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--line)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
            />
            <YAxis
              type="category"
              dataKey="stage"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={82}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-raised)" }}
              content={<ChartTooltip unit="opportunity" />}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={MAX_BAR}>
              {data.map((entry) => (
                // The fullest stage is the one worth looking at, so it keeps the
                // accent and the rest recede. Still one hue — this is emphasis,
                // not a second category.
                <Cell
                  key={entry.stage}
                  fill={
                    entry.count === peak && peak > 0
                      ? "var(--accent)"
                      : "var(--line-strong)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DataTable
        caption="Opportunities by pipeline stage"
        valueLabel="Opportunities"
        rows={data.map((d) => ({
          key: d.stage,
          label: d.stage,
          value: d.count,
        }))}
      />
    </div>
  );
}
