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
