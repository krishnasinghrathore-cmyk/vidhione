import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
// NOTE: Adjust these imports to match the actual MCP SDK version you use.
import {
  createServer,
  type Tool,
  type ToolRequest,
  type ToolResponse
} from "@modelcontextprotocol/sdk";

interface DbConfig {
  id: string;
  type: "postgres";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface ConfigFile {
  databases: DbConfig[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, "..", "connections.json");

const raw = fs.readFileSync(configPath, "utf8");
const config: ConfigFile = JSON.parse(raw);

const pools = new Map<string, Pool>();

for (const db of config.databases) {
  if (db.type !== "postgres") continue;
  const pool = new Pool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password
  });
  pools.set(db.id, pool);
}

function getPool(dbId: string): Pool {
  const pool = pools.get(dbId);
  if (!pool) {
    throw new Error(`Unknown database id: ${dbId}`);
  }
  return pool;
}

const listTablesTool: Tool = {
  name: "list_tables",
  description: "List tables in a configured database.",
  inputSchema: {
    type: "object",
    properties: {
      db: {
        type: "string",
        description: "Database id from connections.json (e.g. 'agency')."
      }
    },
    required: ["db"]
  },
  async handler(req: ToolRequest): Promise<ToolResponse> {
    const { db } = req.params as { db: string };
    const pool = getPool(db);
    const res = await pool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
       ORDER BY table_schema, table_name`
    );
    return { content: res.rows };
  }
};

const describeTableTool: Tool = {
  name: "describe_table",
  description: "Describe a table's columns in a configured database.",
  inputSchema: {
    type: "object",
    properties: {
      db: {
        type: "string",
        description: "Database id from connections.json."
      },
      table: {
        type: "string",
        description: "Table name to describe."
      }
    },
    required: ["db", "table"]
  },
  async handler(req: ToolRequest): Promise<ToolResponse> {
    const { db, table } = req.params as { db: string; table: string };
    const pool = getPool(db);
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    return { content: res.rows };
  }
};

const runQueryTool: Tool = {
  name: "run_query",
  description: "Run a read-only SQL query (SELECT only) on a configured database.",
  inputSchema: {
    type: "object",
    properties: {
      db: {
        type: "string",
        description: "Database id from connections.json."
      },
      sql: {
        type: "string",
        description: "SQL query to execute (must start with SELECT)."
      }
    },
    required: ["db", "sql"]
  },
  async handler(req: ToolRequest): Promise<ToolResponse> {
    const { db, sql } = req.params as { db: string; sql: string };
    if (!sql.trim().toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries are allowed by run_query.");
    }
    const pool = getPool(db);
    const res = await pool.query(sql);
    return { content: res.rows };
  }
};

const server = createServer({
  name: "mcp-sql-server",
  tools: [listTablesTool, describeTableTool, runQueryTool]
});

server.start().catch((err: unknown) => {
  console.error("Failed to start MCP SQL server:", err);
  process.exit(1);
});

