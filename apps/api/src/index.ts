import { Hono } from "hono";
import { logger } from "hono/logger";
import { createApp } from "./app.ts";
import { cards } from "./cards/card-snapshot.ts";

export default new Hono().use(logger()).mount("/", createApp({ cards }).fetch);
