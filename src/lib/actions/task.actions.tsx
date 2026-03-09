"use server";
import { CreateTaskInput, UpdateTaskParams } from "@/types/TaskData.d";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "@/lib/utils/handleError";
import serializeForClient from "@/lib/utils/serialize-for-client";
import Task from "../database/models/tasks.model";
import { auth } from "@clerk/nextjs/server";

// CREATE TASK
export async function createTask(task: CreateTaskInput) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const newTask = await Task.create({
      ...task,
      userId,
      assistantRoleId: task.assistantRoleId || "strategist",
    });

    if (!newTask) {
      throw new Error("Task creation failed!");
    }

    return serializeForClient(newTask);
  } catch (error) {
    handleError({ error, source: "createTask" });
  }
}

// UPDATE TASK
export async function updateTask(taskId: string, task: UpdateTaskParams) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await connectToDatabase();

    const updateFields = { ...task, updatedAt: new Date() };
    delete updateFields.usage;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      {
        $inc: { usage: task.usage },
        $set: updateFields,
      },
      {
        new: true,
        strict: true,
        upsert: false,
      },
    );

    if (!updatedTask) {
      throw new Error("Task update failed!");
    }

    return serializeForClient(updatedTask);
  } catch (error) {
    handleError({ error, source: "updateTask" });
  }
}

// DELETE TASK
export async function deleteTask(taskId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return serializeForClient({
        message: "Unauthorized",
        status: 401,
        source: "deleteTask",
      });
    }

    await connectToDatabase();

    const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId });

    if (!deletedTask) {
      return serializeForClient({
        message: "Task not found or not owned by user",
        status: 404,
        source: "deleteTask",
      });
    }

    return serializeForClient({
      message: "Task deleted successfully",
      status: 200,
      source: "deleteTask",
    });
  } catch (error) {
    return serializeForClient({
      message: error instanceof Error ? error.message : "Task deletion failed",
      status: 500,
      source: "deleteTask",
    });
  }
}
