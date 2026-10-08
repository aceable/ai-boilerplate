// Drizzle schema entry point (see drizzle.config.ts). Intentionally empty so forks
// get no migration for a table they did not define.
//
// Define tables here, then derive Zod schemas from them with drizzle-zod:
//
//   import { pgTable, serial, text } from 'drizzle-orm/pg-core';
//   import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
//
//   export const users = pgTable('users', { id: serial('id').primaryKey(), name: text('name').notNull() });
//   export const insertUserSchema = createInsertSchema(users);
//   export const selectUserSchema = createSelectSchema(users);
export {};
