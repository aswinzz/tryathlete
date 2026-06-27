import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WeekType, DayType, DayStatus, EntryType } from "@/lib/planEnums";

// ─── MCP Streamable HTTP Transport ───────────────────────────────────────────
// Implements JSON-RPC 2.0 over HTTP for Claude Desktop / Claude.ai MCP.
// Claude sends POST requests; we respond with JSON.
// Spec: https://spec.modelcontextprotocol.io/specification/basic/transports/

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function ok(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function err(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserByToken(req: NextRequest): Promise<string | null> {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const user = await prisma.user.findUnique({
    where: { mcpToken: token },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_plans",
    description: "List all workout plans for the user.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_plan",
    description: "Get full details of a workout plan including all weeks, days and entries.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string", description: "The plan ID. Use 'active' to get the active plan." },
      },
      required: ["planId"],
    },
  },
  {
    name: "create_plan",
    description: "Create a new workout plan.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Plan title, e.g. '16-Week Marathon Plan'" },
        description: { type: "string", description: "Optional description" },
        startDate: { type: "string", description: "Optional ISO start date, e.g. '2025-09-01'" },
      },
      required: ["title"],
    },
  },
  {
    name: "set_plan_active",
    description: "Mark a plan as the active plan (deactivates any currently active plan).",
    inputSchema: {
      type: "object",
      properties: { planId: { type: "string" } },
      required: ["planId"],
    },
  },
  {
    name: "add_week",
    description: "Add a week to a workout plan.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number", description: "Week number (1-based)" },
        type: {
          type: "string",
          enum: ["REGULAR", "PEAK", "TAPER", "RECOVERY", "DELOAD"],
          description: "Week type. Default: REGULAR",
        },
        title: { type: "string", description: "Optional week title" },
        notes: { type: "string", description: "Optional coach notes for the week" },
      },
      required: ["planId", "weekNumber"],
    },
  },
  {
    name: "set_week_type",
    description: "Change the type of a week (e.g. make it a taper week or peak week).",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        type: { type: "string", enum: ["REGULAR", "PEAK", "TAPER", "RECOVERY", "DELOAD"] },
        notes: { type: "string", description: "Optional notes to set on the week" },
      },
      required: ["planId", "weekNumber", "type"],
    },
  },
  {
    name: "add_day",
    description: "Add a day to a week in a plan.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
        type: {
          type: "string",
          enum: ["REGULAR", "RACE", "REST", "RECOVERY"],
          description: "Day type. Default: REGULAR",
        },
        coachNotes: { type: "string", description: "Optional notes for this day" },
      },
      required: ["planId", "weekNumber", "dayOfWeek"],
    },
  },
  {
    name: "set_day_type",
    description: "Change the type of a day (e.g. mark it as a race day or rest day).",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
        type: { type: "string", enum: ["REGULAR", "RACE", "REST", "RECOVERY"] },
        coachNotes: { type: "string" },
      },
      required: ["planId", "weekNumber", "dayOfWeek", "type"],
    },
  },
  {
    name: "add_entry",
    description: "Add a workout entry to a specific day.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
        type: {
          type: "string",
          enum: ["RUN", "CYCLING", "SWIMMING", "STRENGTH", "HIIT", "OTHER"],
        },
        title: { type: "string", description: "Workout title, e.g. 'Easy 10K run'" },
        description: {
          type: "string",
          description: "Freeform workout description: pace targets, stations, sets, instructions etc.",
        },
        durationMin: { type: "number", description: "Optional planned duration in minutes" },
      },
      required: ["planId", "weekNumber", "dayOfWeek", "type", "title"],
    },
  },
  {
    name: "delete_entry",
    description: "Delete a workout entry from a day.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        dayOfWeek: { type: "number" },
        entryTitle: { type: "string", description: "Title of the entry to delete (matched exactly)" },
      },
      required: ["planId", "weekNumber", "dayOfWeek", "entryTitle"],
    },
  },
  {
    name: "mark_day_done",
    description: "Mark a training day as completed.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
      },
      required: ["planId", "weekNumber", "dayOfWeek"],
    },
  },
  {
    name: "create_week",
    description: "Create a full week with all its days and workout entries in a single call. Prefer this over calling add_week + add_day + add_entry separately.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weekNumber: { type: "number" },
        type: { type: "string", enum: ["REGULAR", "PEAK", "TAPER", "RECOVERY", "DELOAD"], description: "Default: REGULAR" },
        notes: { type: "string", description: "Optional coach notes for the week" },
        days: {
          type: "array",
          description: "Days to create in this week",
          items: {
            type: "object",
            properties: {
              dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
              type: { type: "string", enum: ["REGULAR", "RACE", "REST", "RECOVERY"], description: "Default: REGULAR" },
              coachNotes: { type: "string" },
              entries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["RUN", "CYCLING", "SWIMMING", "STRENGTH", "HIIT", "OTHER"] },
                    title: { type: "string" },
                    description: { type: "string" },
                    durationMin: { type: "number" },
                  },
                  required: ["type", "title"],
                },
              },
            },
            required: ["dayOfWeek"],
          },
        },
      },
      required: ["planId", "weekNumber", "days"],
    },
  },
  // ── Activity tools ─────────────────────────────────────────────────────────
  {
    name: "list_activities",
    description: "List the athlete's recent activities (runs, rides, swims, strength sessions, etc.) with key performance metrics. Use this to understand what workouts were actually performed, check training volume, or find activities to analyse in detail.",
    inputSchema: {
      type: "object",
      properties: {
        days:  { type: "number", description: "How many days back to look (default: 7, max: 90)" },
        type:  { type: "string", description: "Optional filter: 'running', 'cycling', 'swimming', 'strength', etc." },
        limit: { type: "number", description: "Max activities to return (default: 20, max: 50)" },
      },
      required: [],
    },
  },
  {
    name: "get_activity",
    description: "Get full details of a single activity: pace/speed, heart rate zones breakdown, per-lap splits, elevation, calories, and which plan entry it was linked to (if any). Use after list_activities to drill into a specific session.",
    inputSchema: {
      type: "object",
      properties: {
        activityId: { type: "string", description: "Activity ID from list_activities" },
      },
      required: ["activityId"],
    },
  },
  {
    name: "get_week_summary",
    description: "Compare planned workouts vs actual activities for a given calendar week. Shows each day's plan entries alongside what was actually done, completion rate, total volume (distance, duration, load), and WHOOP recovery if available. Essential for weekly check-ins and coaching reviews.",
    inputSchema: {
      type: "object",
      properties: {
        weekOffset: {
          type: "number",
          description: "0 = current week (Mon–Sun), -1 = last week, -2 = two weeks ago, etc. Default: 0",
        },
        planId: {
          type: "string",
          description: "Optional plan ID to use for the planned side. Defaults to the active plan.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_training_load",
    description: "Get rolling training load and volume trends over recent weeks. Returns weekly summaries of total distance, duration, and activity count to help spot overtraining, under-training, or trend changes. Use to inform taper/peak decisions or to assess adaptation.",
    inputSchema: {
      type: "object",
      properties: {
        weeks: { type: "number", description: "How many weeks of history to return (default: 4, max: 12)" },
      },
      required: [],
    },
  },
  // ── Wellness tools ─────────────────────────────────────────────────────────
  {
    name: "get_wellness_today",
    description: "Get today's WHOOP wellness snapshot: recovery score (0–100), HRV, resting heart rate, sleep duration and quality, and daily strain. Use this before making any training recommendations to understand the athlete's current readiness. Returns null for each field if WHOOP is not connected or data has not synced yet.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_wellness_history",
    description: "Get recent WHOOP wellness history (last N days) to identify trends in recovery, HRV, sleep and strain. Useful for spotting overtraining, improving adaptation, or planning peak/taper weeks.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of recent days to return (default: 7, max: 30)" },
      },
      required: [],
    },
  },
  {
    name: "populate_plan",
    description: "Populate an entire plan with multiple weeks, days and entries in one call. Use this to build a full training plan at once. Strongly preferred over making individual add_week/add_day/add_entry calls.",
    inputSchema: {
      type: "object",
      properties: {
        planId: { type: "string" },
        weeks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              weekNumber: { type: "number" },
              type: { type: "string", enum: ["REGULAR", "PEAK", "TAPER", "RECOVERY", "DELOAD"] },
              notes: { type: "string" },
              days: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dayOfWeek: { type: "number", description: "1=Monday … 7=Sunday" },
                    type: { type: "string", enum: ["REGULAR", "RACE", "REST", "RECOVERY"] },
                    coachNotes: { type: "string" },
                    entries: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["RUN", "CYCLING", "SWIMMING", "STRENGTH", "HIIT", "OTHER"] },
                          title: { type: "string" },
                          description: { type: "string" },
                          durationMin: { type: "number" },
                        },
                        required: ["type", "title"],
                      },
                    },
                  },
                  required: ["dayOfWeek"],
                },
              },
            },
            required: ["weekNumber", "days"],
          },
        },
      },
      required: ["planId", "weeks"],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

async function callTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {

  // Helper: resolve planId (supports "active")
  async function resolvePlan(planId: string) {
    if (planId === "active") {
      return prisma.workoutPlan.findFirst({
        where: { userId, isActive: true },
        include: { weeks: { orderBy: { weekNumber: "asc" }, include: { days: { orderBy: { dayOfWeek: "asc" }, include: { entries: { orderBy: { orderIndex: "asc" } } } } } } },
      });
    }
    return prisma.workoutPlan.findFirst({
      where: { id: planId as string, userId },
      include: { weeks: { orderBy: { weekNumber: "asc" }, include: { days: { orderBy: { dayOfWeek: "asc" }, include: { entries: { orderBy: { orderIndex: "asc" } } } } } } },
    });
  }

  // Helper: find week by number
  async function resolveWeek(planId: string, weekNumber: number) {
    const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, userId }, select: { id: true } });
    if (!plan) throw new Error("Plan not found");
    return prisma.workoutWeek.findFirst({ where: { planId, weekNumber } });
  }

  // Helper: find or create day
  async function resolveDay(planId: string, weekNumber: number, dayOfWeek: number, createIfMissing = false) {
    const week = await resolveWeek(planId, weekNumber);
    if (!week) throw new Error(`Week ${weekNumber} not found`);
    let day = await prisma.workoutDay.findFirst({ where: { weekId: week.id, dayOfWeek } });
    if (!day && createIfMissing) {
      day = await prisma.workoutDay.create({
        data: { weekId: week.id, dayOfWeek, type: DayType.REGULAR, status: DayStatus.PLANNED },
      });
    }
    return { week, day };
  }

  switch (name) {
    case "list_plans": {
      const plans = await prisma.workoutPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, isActive: true, isDraft: true, startDate: true, endDate: true, _count: { select: { weeks: true } } },
      });
      return plans.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        isActive: p.isActive,
        isDraft: p.isDraft,
        startDate: p.startDate,
        weeks: p._count.weeks,
      }));
    }

    case "get_plan": {
      const plan = await resolvePlan(args.planId as string);
      if (!plan) throw new Error("Plan not found");
      return plan;
    }

    case "create_plan": {
      const plan = await prisma.workoutPlan.create({
        data: {
          userId,
          title: args.title as string,
          description: (args.description as string) || null,
          startDate: args.startDate ? new Date(args.startDate as string) : null,
          isDraft: false,
          isActive: false,
        },
      });
      return { id: plan.id, title: plan.title, message: `Plan "${plan.title}" created with ID ${plan.id}` };
    }

    case "set_plan_active": {
      // Deactivate all other plans first
      await prisma.workoutPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
      const plan = await prisma.workoutPlan.update({
        where: { id: args.planId as string },
        data: { isActive: true, isDraft: false },
      });
      return { message: `"${plan.title}" is now the active plan` };
    }

    case "add_week": {
      const week = await prisma.workoutWeek.create({
        data: {
          planId: args.planId as string,
          weekNumber: args.weekNumber as number,
          type: (args.type as WeekType) || WeekType.REGULAR,
          title: (args.title as string) || null,
          notes: (args.notes as string) || null,
        },
      });
      return { id: week.id, weekNumber: week.weekNumber, type: week.type, message: `Week ${week.weekNumber} added` };
    }

    case "set_week_type": {
      const week = await resolveWeek(args.planId as string, args.weekNumber as number);
      if (!week) throw new Error(`Week ${args.weekNumber} not found`);
      const updated = await prisma.workoutWeek.update({
        where: { id: week.id },
        data: {
          type: args.type as WeekType,
          ...(args.notes !== undefined ? { notes: args.notes as string } : {}),
        },
      });
      return { message: `Week ${updated.weekNumber} is now a ${updated.type} week` };
    }

    case "add_day": {
      const week = await resolveWeek(args.planId as string, args.weekNumber as number);
      if (!week) throw new Error(`Week ${args.weekNumber} not found`);
      const day = await prisma.workoutDay.upsert({
        where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: args.dayOfWeek as number } },
        update: {
          type: (args.type as DayType) || DayType.REGULAR,
          ...(args.coachNotes !== undefined ? { coachNotes: args.coachNotes as string } : {}),
        },
        create: {
          weekId: week.id,
          dayOfWeek: args.dayOfWeek as number,
          type: (args.type as DayType) || DayType.REGULAR,
          status: DayStatus.PLANNED,
          coachNotes: (args.coachNotes as string) || null,
        },
      });
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return { id: day.id, dayOfWeek: day.dayOfWeek, type: day.type, message: `${DOW[day.dayOfWeek - 1]} added to week ${week.weekNumber}` };
    }

    case "set_day_type": {
      const { week, day } = await resolveDay(args.planId as string, args.weekNumber as number, args.dayOfWeek as number);
      if (!day) throw new Error(`Day ${args.dayOfWeek} not found in week ${args.weekNumber}`);
      await prisma.workoutDay.update({
        where: { id: day.id },
        data: {
          type: args.type as DayType,
          ...(args.coachNotes !== undefined ? { coachNotes: args.coachNotes as string } : {}),
        },
      });
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return { message: `${DOW[day.dayOfWeek - 1]} of week ${week.weekNumber} set to ${args.type}` };
    }

    case "add_entry": {
      const { week, day } = await resolveDay(args.planId as string, args.weekNumber as number, args.dayOfWeek as number, true);
      if (!day) throw new Error("Day not found");
      const count = await prisma.workoutEntry.count({ where: { dayId: day.id } });
      const entry = await prisma.workoutEntry.create({
        data: {
          dayId: day.id,
          type: (args.type as EntryType) || EntryType.OTHER,
          title: args.title as string,
          description: (args.description as string) || null,
          durationMin: args.durationMin ? Number(args.durationMin) : null,
          orderIndex: count,
        },
      });
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return { id: entry.id, title: entry.title, message: `"${entry.title}" added to ${DOW[day.dayOfWeek - 1]}, week ${week.weekNumber}` };
    }

    case "delete_entry": {
      const { day } = await resolveDay(args.planId as string, args.weekNumber as number, args.dayOfWeek as number);
      if (!day) throw new Error("Day not found");
      const entry = await prisma.workoutEntry.findFirst({
        where: { dayId: day.id, title: args.entryTitle as string },
      });
      if (!entry) throw new Error(`Entry "${args.entryTitle}" not found`);
      await prisma.workoutEntry.delete({ where: { id: entry.id } });
      return { message: `"${args.entryTitle}" deleted` };
    }

    case "mark_day_done": {
      const { week, day } = await resolveDay(args.planId as string, args.weekNumber as number, args.dayOfWeek as number);
      if (!day) throw new Error("Day not found");
      await prisma.workoutDay.update({
        where: { id: day.id },
        data: { status: DayStatus.COMPLETED, completedAt: new Date() },
      });
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return { message: `${DOW[day.dayOfWeek - 1]} of week ${week.weekNumber} marked as completed ✅` };
    }

    case "create_week": {
      const { planId, weekNumber, type, notes, days } = args as {
        planId: string; weekNumber: number; type?: string; notes?: string;
        days: { dayOfWeek: number; type?: string; coachNotes?: string; entries?: { type: string; title: string; description?: string; durationMin?: number }[] }[];
      };

      // Upsert week
      const week = await prisma.workoutWeek.upsert({
        where: { planId_weekNumber: { planId, weekNumber } },
        update: { type: (type as WeekType) || WeekType.REGULAR, notes: notes || null },
        create: { planId, weekNumber, type: (type as WeekType) || WeekType.REGULAR, notes: notes || null },
      });

      let totalEntries = 0;
      for (const d of days) {
        const day = await prisma.workoutDay.upsert({
          where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: d.dayOfWeek } },
          update: { type: (d.type as DayType) || DayType.REGULAR, coachNotes: d.coachNotes || null },
          create: { weekId: week.id, dayOfWeek: d.dayOfWeek, type: (d.type as DayType) || DayType.REGULAR, status: DayStatus.PLANNED, coachNotes: d.coachNotes || null },
        });
        if (d.entries) {
          for (let i = 0; i < d.entries.length; i++) {
            const e = d.entries[i];
            await prisma.workoutEntry.create({
              data: { dayId: day.id, type: (e.type as EntryType) || EntryType.OTHER, title: e.title, description: e.description || null, durationMin: e.durationMin || null, orderIndex: i },
            });
            totalEntries++;
          }
        }
      }

      return { message: `Week ${weekNumber} created with ${days.length} days and ${totalEntries} entries` };
    }

    case "populate_plan": {
      const { planId, weeks } = args as {
        planId: string;
        weeks: { weekNumber: number; type?: string; notes?: string; days: { dayOfWeek: number; type?: string; coachNotes?: string; entries?: { type: string; title: string; description?: string; durationMin?: number }[] }[] }[];
      };

      let totalWeeks = 0, totalDays = 0, totalEntries = 0;

      for (const w of weeks) {
        const week = await prisma.workoutWeek.upsert({
          where: { planId_weekNumber: { planId, weekNumber: w.weekNumber } },
          update: { type: (w.type as WeekType) || WeekType.REGULAR, notes: w.notes || null },
          create: { planId, weekNumber: w.weekNumber, type: (w.type as WeekType) || WeekType.REGULAR, notes: w.notes || null },
        });
        totalWeeks++;

        for (const d of w.days) {
          const day = await prisma.workoutDay.upsert({
            where: { weekId_dayOfWeek: { weekId: week.id, dayOfWeek: d.dayOfWeek } },
            update: { type: (d.type as DayType) || DayType.REGULAR, coachNotes: d.coachNotes || null },
            create: { weekId: week.id, dayOfWeek: d.dayOfWeek, type: (d.type as DayType) || DayType.REGULAR, status: DayStatus.PLANNED, coachNotes: d.coachNotes || null },
          });
          totalDays++;

          if (d.entries) {
            for (let i = 0; i < d.entries.length; i++) {
              const e = d.entries[i];
              await prisma.workoutEntry.create({
                data: { dayId: day.id, type: (e.type as EntryType) || EntryType.OTHER, title: e.title, description: e.description || null, durationMin: e.durationMin || null, orderIndex: i },
              });
              totalEntries++;
            }
          }
        }
      }

      return { message: `Plan populated: ${totalWeeks} weeks, ${totalDays} days, ${totalEntries} entries created` };
    }

    // ── Activity tool implementations ────────────────────────────────────────

    case "list_activities": {
      const daysBack = Math.min(Math.max(1, Number(args.days) || 7), 90);
      const limit    = Math.min(Math.max(1, Number(args.limit) || 20), 50);
      const since    = new Date(Date.now() - daysBack * 86_400_000);

      const where: Record<string, unknown> = { userId, startTime: { gte: since } };
      if (args.type) where.type = { contains: args.type as string, mode: "insensitive" };

      const activities = await prisma.activity.findMany({
        where,
        orderBy: { startTime: "desc" },
        take: limit,
        select: {
          id: true, name: true, type: true, source: true, startTime: true,
          duration: true, distance: true, avgHeartRate: true, maxHeartRate: true,
          avgPace: true, elevGain: true, calories: true,
          links: { select: { entry: { select: { title: true, type: true, durationMin: true } } }, take: 1 },
        },
      });

      return {
        count: activities.length,
        periodDays: daysBack,
        activities: activities.map((a) => ({
          id:          a.id,
          name:        a.name,
          type:        a.type,
          source:      a.source,
          date:        a.startTime.toISOString().split("T")[0],
          time:        a.startTime.toISOString().split("T")[1].slice(0, 5),
          duration_min: Math.round(a.duration / 60),
          distance_km: a.distance ? Math.round(a.distance / 10) / 100 : null,
          avg_pace:    a.avgPace ? `${Math.floor(a.avgPace * 1000 / 60)}'${String(Math.round(a.avgPace * 1000 % 60)).padStart(2, "0")}"/km` : null,
          avg_hr_bpm:  a.avgHeartRate,
          max_hr_bpm:  a.maxHeartRate,
          elev_gain_m: a.elevGain ? Math.round(a.elevGain) : null,
          calories:    a.calories,
          linked_plan_entry: a.links[0]?.entry?.title ?? null,
        })),
      };
    }

    case "get_activity": {
      const activity = await prisma.activity.findFirst({
        where: { id: args.activityId as string, userId },
        include: {
          laps: { orderBy: { lapIndex: "asc" } },
          links: {
            include: {
              entry: {
                select: {
                  title: true, type: true, description: true, durationMin: true,
                  day: { select: { dayOfWeek: true, week: { select: { weekNumber: true, plan: { select: { title: true } } } } } },
                },
              },
            },
          },
        },
      });
      if (!activity) throw new Error("Activity not found");

      // Parse hrZones
      let hrZones: Record<string, number> | null = null;
      try { hrZones = activity.hrZones ? JSON.parse(activity.hrZones) : null; } catch { /* ignore */ }

      const totalZoneSecs = hrZones
        ? Object.values(hrZones).reduce((s: number, v) => s + (v as number), 0)
        : 0;

      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      return {
        id:           activity.id,
        name:         activity.name,
        type:         activity.type,
        source:       activity.source,
        date:         activity.startTime.toISOString().split("T")[0],
        startTime:    activity.startTime.toISOString(),
        duration_min: Math.round(activity.duration / 60),
        distance_km:  activity.distance ? Math.round(activity.distance / 10) / 100 : null,
        avg_pace:     activity.avgPace ? `${Math.floor(activity.avgPace * 1000 / 60)}'${String(Math.round(activity.avgPace * 1000 % 60)).padStart(2, "0")}"/km` : null,
        best_pace:    activity.bestPace ? `${Math.floor(activity.bestPace * 1000 / 60)}'${String(Math.round(activity.bestPace * 1000 % 60)).padStart(2, "0")}"/km` : null,
        heart_rate: {
          min: activity.minHeartRate,
          avg: activity.avgHeartRate,
          max: activity.maxHeartRate,
        },
        hr_zones: hrZones && totalZoneSecs > 0 ? {
          z1_recovery_min:   hrZones.z1 ? Math.round(hrZones.z1 / 60) : 0,
          z2_aerobic_min:    hrZones.z2 ? Math.round(hrZones.z2 / 60) : 0,
          z3_tempo_min:      hrZones.z3 ? Math.round(hrZones.z3 / 60) : 0,
          z4_threshold_min:  hrZones.z4 ? Math.round(hrZones.z4 / 60) : 0,
          z5_max_min:        hrZones.z5 ? Math.round(hrZones.z5 / 60) : 0,
          pct_above_z3: totalZoneSecs > 0
            ? Math.round(((hrZones.z3 + hrZones.z4 + hrZones.z5) / totalZoneSecs) * 100)
            : null,
        } : null,
        elev_gain_m: activity.elevGain ? Math.round(activity.elevGain) : null,
        calories:    activity.calories,
        steps:       activity.steps,
        laps: activity.laps.map((l) => ({
          lap:        l.lapIndex,
          distance_km: Math.round(l.distance / 10) / 100,
          duration_min: Math.round(l.duration / 60),
          avg_hr_bpm: l.avgHeartRate,
          zone:       l.zone,
          pace:       l.avgPace ? `${Math.floor(l.avgPace * 1000 / 60)}'${String(Math.round(l.avgPace * 1000 % 60)).padStart(2, "0")}"` : null,
        })),
        linked_plan_entry: activity.links[0] ? {
          title:      activity.links[0].entry.title,
          type:       activity.links[0].entry.type,
          description: activity.links[0].entry.description,
          planned_duration_min: activity.links[0].entry.durationMin,
          plan:       activity.links[0].entry.day.week.plan.title,
          week:       activity.links[0].entry.day.week.weekNumber,
          day:        DOW[(activity.links[0].entry.day.dayOfWeek ?? 1) - 1],
        } : null,
      };
    }

    case "get_week_summary": {
      const offset = Number(args.weekOffset ?? 0);

      // Calculate the Mon–Sun range for the requested week
      const now = new Date();
      const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay(); // 1=Mon, 7=Sun
      const mondayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
        - (dayOfWeek - 1) * 86_400_000
        + offset * 7 * 86_400_000;
      const monday = new Date(mondayMs);
      const sunday = new Date(mondayMs + 6 * 86_400_000 + 86_399_999);

      // Fetch activities in this date range
      const activities = await prisma.activity.findMany({
        where: { userId, startTime: { gte: monday, lte: sunday } },
        orderBy: { startTime: "asc" },
        include: {
          links: {
            include: { entry: { select: { id: true, title: true, type: true, durationMin: true } } },
            take: 1,
          },
        },
      });

      // Find the active (or specified) plan and the week that overlaps this date range
      const plan = args.planId
        ? await prisma.workoutPlan.findFirst({
            where: { id: args.planId as string, userId },
            select: { id: true, title: true, startDate: true },
          })
        : await prisma.workoutPlan.findFirst({
            where: { userId, isActive: true },
            select: { id: true, title: true, startDate: true },
          });

      let plannedDays: { dayOfWeek: number; type: string; coachNotes: string | null; entries: { title: string; type: string; durationMin: number | null; description: string | null }[] }[] = [];
      let planWeekNumber: number | null = null;

      if (plan?.startDate) {
        // Compute which plan week this calendar week falls in
        const planStartMs = Date.UTC(plan.startDate.getUTCFullYear(), plan.startDate.getUTCMonth(), plan.startDate.getUTCDate());
        const weeksSincePlanStart = Math.floor((mondayMs - planStartMs) / (7 * 86_400_000));
        planWeekNumber = weeksSincePlanStart + 1; // 1-based

        if (planWeekNumber >= 1) {
          const planWeek = await prisma.workoutWeek.findFirst({
            where: { planId: plan.id, weekNumber: planWeekNumber },
            include: { days: { include: { entries: { orderBy: { orderIndex: "asc" } } }, orderBy: { dayOfWeek: "asc" } } },
          });
          if (planWeek) {
            plannedDays = planWeek.days.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              type: d.type,
              coachNotes: d.coachNotes,
              entries: d.entries.map((e) => ({
                title: e.title,
                type: e.type,
                durationMin: e.durationMin,
                description: e.description,
              })),
            }));
          }
        }
      }

      // Build per-day summary
      const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const days = DOW.map((label, i) => {
        const dayOfWeek = i + 1;
        const dayDate = new Date(mondayMs + i * 86_400_000);
        const dayActivities = activities.filter((a) => {
          const d = a.startTime.getUTCDay() === 0 ? 7 : a.startTime.getUTCDay();
          return d === dayOfWeek;
        });
        const planned = plannedDays.find((d) => d.dayOfWeek === dayOfWeek);

        return {
          day:  label,
          date: dayDate.toISOString().split("T")[0],
          planned: planned ? {
            type: planned.type,
            coachNotes: planned.coachNotes,
            workouts: planned.entries.map((e) => ({
              title: e.title,
              type:  e.type,
              planned_duration_min: e.durationMin,
              description: e.description,
            })),
          } : { type: "REST", workouts: [] },
          actual: dayActivities.map((a) => ({
            id:           a.id,
            name:         a.name,
            type:         a.type,
            duration_min: Math.round(a.duration / 60),
            distance_km:  a.distance ? Math.round(a.distance / 10) / 100 : null,
            avg_hr_bpm:   a.avgHeartRate,
            calories:     a.calories,
            matched_entry: a.links[0]?.entry?.title ?? null,
          })),
          completed: dayActivities.length > 0,
        };
      });

      // Aggregate totals
      const totalActualMin  = Math.round(activities.reduce((s, a) => s + a.duration, 0) / 60);
      const totalDistanceKm = Math.round(activities.reduce((s, a) => s + (a.distance ?? 0), 0) / 10) / 100;
      const plannedWorkouts = plannedDays.reduce((s, d) => s + d.entries.length, 0);
      const completedDays   = days.filter((d) => d.completed).length;

      // WHOOP recovery data for this week
      const whoopRecords = await prisma.whoopRecovery.findMany({
        where: { userId, date: { gte: monday, lte: sunday } },
        orderBy: { date: "asc" },
        select: { date: true, recoveryScore: true, hrv: true, strain: true, totalSleepMin: true },
      });

      return {
        week: {
          label:   offset === 0 ? "Current week" : offset === -1 ? "Last week" : `${Math.abs(offset)} weeks ago`,
          monday:  monday.toISOString().split("T")[0],
          sunday:  sunday.toISOString().split("T")[0],
          planName: plan?.title ?? null,
          planWeek: planWeekNumber,
        },
        summary: {
          planned_workouts: plannedWorkouts,
          completed_days:   completedDays,
          completion_rate:  plannedWorkouts > 0
            ? `${Math.round((completedDays / Math.max(plannedDays.length, 1)) * 100)}%`
            : "no plan",
          total_activities: activities.length,
          total_duration_min: totalActualMin,
          total_distance_km:  totalDistanceKm,
          avg_hr_bpm: activities.filter((a) => a.avgHeartRate).length > 0
            ? Math.round(activities.filter((a) => a.avgHeartRate).reduce((s, a) => s + a.avgHeartRate!, 0) / activities.filter((a) => a.avgHeartRate).length)
            : null,
        },
        wellness: whoopRecords.length > 0 ? whoopRecords.map((r) => ({
          date:           r.date.toISOString().split("T")[0],
          recovery_score: r.recoveryScore,
          hrv_ms:         r.hrv !== null ? Math.round(r.hrv) : null,
          strain:         r.strain,
          sleep_min:      r.totalSleepMin,
        })) : null,
        days,
      };
    }

    case "get_training_load": {
      const weeksBack = Math.min(Math.max(1, Number(args.weeks) || 4), 12);
      const since = new Date(Date.now() - weeksBack * 7 * 86_400_000);

      const activities = await prisma.activity.findMany({
        where: { userId, startTime: { gte: since } },
        orderBy: { startTime: "asc" },
        select: { startTime: true, type: true, duration: true, distance: true, avgHeartRate: true, calories: true },
      });

      // Group by ISO week (Mon–Sun)
      const weekMap = new Map<string, typeof activities>();
      for (const a of activities) {
        const d = a.startTime;
        const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
        const mondayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - (dow - 1) * 86_400_000;
        const key = new Date(mondayMs).toISOString().split("T")[0];
        if (!weekMap.has(key)) weekMap.set(key, []);
        weekMap.get(key)!.push(a);
      }

      const weeks = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monday, acts]) => {
          const sunday = new Date(new Date(monday).getTime() + 6 * 86_400_000).toISOString().split("T")[0];
          const byType: Record<string, number> = {};
          for (const a of acts) {
            byType[a.type] = (byType[a.type] ?? 0) + 1;
          }
          return {
            week_start:       monday,
            week_end:         sunday,
            activity_count:   acts.length,
            total_duration_min: Math.round(acts.reduce((s, a) => s + a.duration, 0) / 60),
            total_distance_km:  Math.round(acts.reduce((s, a) => s + (a.distance ?? 0), 0) / 10) / 100,
            by_type:          byType,
            avg_hr_bpm: acts.filter((a) => a.avgHeartRate).length > 0
              ? Math.round(acts.filter((a) => a.avgHeartRate).reduce((s, a) => s + a.avgHeartRate!, 0) / acts.filter((a) => a.avgHeartRate).length)
              : null,
          };
        });

      // Week-over-week trend (last 2 complete weeks)
      const complete = weeks.slice(-2);
      const trend = complete.length === 2 ? {
        duration_change_pct:  complete[0].total_duration_min > 0
          ? Math.round(((complete[1].total_duration_min - complete[0].total_duration_min) / complete[0].total_duration_min) * 100)
          : null,
        distance_change_pct: complete[0].total_distance_km > 0
          ? Math.round(((complete[1].total_distance_km - complete[0].total_distance_km) / complete[0].total_distance_km) * 100)
          : null,
      } : null;

      return {
        period_weeks: weeksBack,
        since:        since.toISOString().split("T")[0],
        weeks,
        trend,
        overall: {
          total_activities:   activities.length,
          total_duration_min: Math.round(activities.reduce((s, a) => s + a.duration, 0) / 60),
          total_distance_km:  Math.round(activities.reduce((s, a) => s + (a.distance ?? 0), 0) / 10) / 100,
          avg_per_week:       weeks.length > 0
            ? Math.round(activities.length / weeks.length * 10) / 10
            : 0,
        },
      };
    }

    // ── Wellness tool implementations ────────────────────────────────────────

    case "get_wellness_today": {
      const whoopConn = await prisma.trackerConnection.findUnique({
        where: { userId_provider: { userId, provider: "whoop" } },
        select: { id: true, lastSyncAt: true },
      });

      if (!whoopConn) {
        return {
          whoopConnected: false,
          message: "WHOOP is not connected. No wellness data available.",
        };
      }

      const record = await prisma.whoopRecovery.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      });

      if (!record) {
        return {
          whoopConnected: true,
          lastSyncAt: whoopConn.lastSyncAt,
          message: "WHOOP is connected but no recovery data has synced yet.",
        };
      }

      const score = record.recoveryScore;
      const readiness =
        score === null ? "unknown" :
        score >= 67    ? "optimal — green light for hard training" :
        score >= 34    ? "moderate — steady/aerobic work recommended" :
                         "low — prioritise recovery, avoid intensity";

      const totalSleepH = record.totalSleepMin
        ? `${Math.floor(record.totalSleepMin / 60)}h ${record.totalSleepMin % 60}m`
        : null;

      return {
        whoopConnected: true,
        date: record.date.toISOString().split("T")[0],
        lastSyncAt: whoopConn.lastSyncAt,
        recovery: {
          score: record.recoveryScore,
          readiness,
          hrv_ms: record.hrv !== null ? Math.round(record.hrv) : null,
          restingHR_bpm: record.restingHR,
          spo2_pct: record.spo2,
          skinTemp_c: record.skinTemp,
        },
        sleep: {
          totalDuration: totalSleepH,
          totalMinutes: record.totalSleepMin,
          performanceScore: record.sleepScore,
          efficiency_pct: record.sleepEff,
          stages: {
            deep_min:  record.deepMin,
            rem_min:   record.remMin,
            light_min: record.lightMin,
            awake_min: record.awakeMin,
          },
        },
        strain: {
          score: record.strain,
          scale: "0–21 (higher = more cardiovascular load)",
          kilojoule: record.kilojoule,
          avgHR_bpm: record.avgHR,
          maxHR_bpm: record.maxHR,
        },
      };
    }

    case "get_wellness_history": {
      const limit = Math.min(Math.max(1, Number(args.days) || 7), 30);

      const whoopConn = await prisma.trackerConnection.findUnique({
        where: { userId_provider: { userId, provider: "whoop" } },
        select: { id: true },
      });

      if (!whoopConn) {
        return { whoopConnected: false, records: [], message: "WHOOP is not connected." };
      }

      const records = await prisma.whoopRecovery.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: limit,
        select: {
          date: true, recoveryScore: true, hrv: true, restingHR: true,
          totalSleepMin: true, sleepScore: true, sleepEff: true,
          strain: true, avgHR: true, maxHR: true,
          deepMin: true, remMin: true, lightMin: true,
        },
      });

      const scored = records.filter((r) => r.recoveryScore !== null);
      const avgRecovery = scored.length
        ? Math.round(scored.reduce((s, r) => s + r.recoveryScore!, 0) / scored.length)
        : null;
      const hrvScored = records.filter((r) => r.hrv !== null);
      const avgHRV = hrvScored.length
        ? Math.round(hrvScored.reduce((s, r) => s + r.hrv!, 0) / hrvScored.length)
        : null;

      const trend =
        scored.length < 3 ? "insufficient data" :
        (() => {
          const recent = scored.slice(0, Math.ceil(scored.length / 2));
          const older  = scored.slice(Math.ceil(scored.length / 2));
          const recentAvg = recent.reduce((s, r) => s + r.recoveryScore!, 0) / recent.length;
          const olderAvg  = older.reduce( (s, r) => s + r.recoveryScore!, 0) / older.length;
          if (recentAvg >= olderAvg + 5) return "improving";
          if (recentAvg <= olderAvg - 5) return "declining — consider more recovery";
          return "stable";
        })();

      return {
        whoopConnected: true,
        periodDays: limit,
        summary: { avgRecoveryScore: avgRecovery, avgHRV_ms: avgHRV, trend },
        records: records.map((r) => ({
          date: r.date.toISOString().split("T")[0],
          recoveryScore: r.recoveryScore,
          hrv_ms: r.hrv !== null ? Math.round(r.hrv) : null,
          restingHR_bpm: r.restingHR,
          sleep: {
            totalMinutes: r.totalSleepMin,
            performanceScore: r.sleepScore,
            efficiency_pct: r.sleepEff,
            deep_min: r.deepMin,
            rem_min: r.remMin,
            light_min: r.lightMin,
          },
          strain: r.strain,
          avgHR_bpm: r.avgHR,
          maxHR_bpm: r.maxHR,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const userId = await getUserByToken(req);
  if (!userId) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Invalid or missing token" } },
      { status: 401 }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "tryathlete", version: "1.0.0" },
      });

    case "notifications/initialized":
      return new NextResponse(null, { status: 204 });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await callTool(toolName, toolArgs, userId);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Tool error";
        return ok(id, {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        });
      }
    }

    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

// Claude Desktop sends OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
