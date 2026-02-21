/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users")

  const collection = new Collection({
    name: "tasks",
    type: "base",
    listRule: "@request.auth.id = user",
    viewRule: "@request.auth.id = user",
    createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
    fields: [
      {
        name: "user",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: usersCollection.id,
        cascadeDelete: true,
      },
      {
        name: "title",
        type: "text",
        required: true,
        max: 500,
      },
      {
        name: "notes",
        type: "editor",
        required: false,
      },
      {
        name: "impact",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "effort",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        name: "dueDate",
        type: "date",
        required: false,
      },
      {
        name: "bucket",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["today", "backlog", "someday"],
      },
      {
        name: "tags",
        type: "json",
        required: false,
      },
      {
        name: "completed",
        type: "bool",
        required: false,
      },
      {
        name: "completedAt",
        type: "date",
        required: false,
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_tasks_user ON tasks (user)",
    ],
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("tasks")
  return app.delete(collection)
})
