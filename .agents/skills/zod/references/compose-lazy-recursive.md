---
title: Use z.lazy() for Recursive Schemas
impact: MEDIUM
impactDescription: Recursive types reference themselves before definition; z.lazy() defers evaluation to enable self-referential schemas
tags: compose, lazy, recursive, trees
---

## Use z.lazy() for Recursive Schemas

TypeScript can't infer recursive Zod schema types automatically. Use `z.lazy()` to defer schema evaluation and manually provide the type annotation. This enables tree structures, nested comments, and other self-referential data.

**Incorrect (direct self-reference):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

// This fails - categorySchema used before it's defined
const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
<<<<<<< HEAD
  children: z.array(categorySchema),  // Error: Block-scoped variable used before declaration
})
=======
  children: z.array(categorySchema), // Error: Block-scoped variable used before declaration
});
>>>>>>> main
```

**Correct (using z.lazy with type annotation):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

// Define the type manually
interface Category {
  id: string
  name: string
  children: Category[]
=======
import { z } from "zod";

// Define the type manually
interface Category {
  id: string;
  name: string;
  children: Category[];
>>>>>>> main
}

// Use z.lazy() to defer schema reference
const categorySchema: z.ZodType<Category> = z.object({
  id: z.string(),
  name: z.string(),
  children: z.lazy(() => z.array(categorySchema)),
<<<<<<< HEAD
})

// Now it works
const tree = categorySchema.parse({
  id: '1',
  name: 'Electronics',
  children: [
    {
      id: '2',
      name: 'Phones',
      children: [
        { id: '3', name: 'iPhones', children: [] },
        { id: '4', name: 'Android', children: [] },
      ],
    },
  ],
})
=======
});

// Now it works
const tree = categorySchema.parse({
  id: "1",
  name: "Electronics",
  children: [
    {
      id: "2",
      name: "Phones",
      children: [
        { id: "3", name: "iPhones", children: [] },
        { id: "4", name: "Android", children: [] },
      ],
    },
  ],
});
>>>>>>> main
```

**Common recursive patterns:**

```typescript
// Comments with replies
interface Comment {
<<<<<<< HEAD
  id: string
  content: string
  author: string
  replies: Comment[]
=======
  id: string;
  content: string;
  author: string;
  replies: Comment[];
>>>>>>> main
}

const commentSchema: z.ZodType<Comment> = z.object({
  id: z.string(),
  content: z.string(),
  author: z.string(),
  replies: z.lazy(() => z.array(commentSchema)),
<<<<<<< HEAD
})

// Binary tree
interface TreeNode {
  value: number
  left: TreeNode | null
  right: TreeNode | null
=======
});

// Binary tree
interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
>>>>>>> main
}

const treeNodeSchema: z.ZodType<TreeNode> = z.object({
  value: z.number(),
  left: z.lazy(() => treeNodeSchema.nullable()),
  right: z.lazy(() => treeNodeSchema.nullable()),
<<<<<<< HEAD
})

// Nested menu structure
interface MenuItem {
  label: string
  href?: string
  children?: MenuItem[]
=======
});

// Nested menu structure
interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
>>>>>>> main
}

const menuItemSchema: z.ZodType<MenuItem> = z.object({
  label: z.string(),
  href: z.string().url().optional(),
  children: z.lazy(() => z.array(menuItemSchema)).optional(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main
```

**JSON Schema (any valid JSON):**

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
<<<<<<< HEAD
  | { [key: string]: JSONValue }
=======
  | { [key: string]: JSONValue };
>>>>>>> main

const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
<<<<<<< HEAD
  ])
)
=======
  ]),
);
>>>>>>> main
```

**Performance consideration:**

```typescript
// z.lazy() has minimal overhead - the function is called once
// and the schema is cached. Safe to use in hot paths.

// If validating many recursive structures, the schema itself
// is only built once. Validation performance depends on data depth.
```

**When NOT to use this pattern:**
<<<<<<< HEAD
=======

> > > > > > > main

- Non-recursive schemas (lazy adds unnecessary indirection)
- When you can flatten the structure instead

Reference: [Zod API - Recursive Types](https://zod.dev/api#recursive-types)
